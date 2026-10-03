-- =============================================================================
-- NOT YET APPLIED. Do not run this file against the live Supabase project.
-- This is a proposed migration only. Nothing in this PR executes it.
-- Balances stay as they are until a human reviews and runs it on purpose.
-- =============================================================================
--
-- Append-only $SERVE ledger plus the one server-side write for rating rewards.
--
-- Today (main d7b7a3b):
--   servers.serve_balance          integer  spendable
--   servers.serve_balance_lifetime integer  lifetime, never decremented by ratings
--   ratings.serve_reward           integer  per rating
-- There is no ledger table. frontend/supabase-sql/serve_balance.sql does not
-- define increment_serve_balance. The browser in frontend/app/rate/page.tsx
-- inserts the rating and then read-modify-writes both balance columns.
--
-- This file adds:
--   1. public.serve_ledger (append-only, client cannot write)
--   2. public.submit_rating_reward(...) — one transaction that inserts the
--      rating, inserts one ledger row, and increments both balance columns.
--      Called only from frontend/app/api/submit-rating/route.ts (service role).
--
-- Vibe credits are NOT changed here. source = 'vibe' exists so a later change
-- can record vibe_reports rows. verify-vibe still writes vibe_reports and
-- guest_rewards / the dropped servers.slate_points column.
--
-- Do not invent rewards for historical 5-star ratings whose serve_reward is 0.
-- See serve_ledger_backfill.sql.

-- ---------------------------------------------------------------------------
-- Ledger
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.serve_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  -- rating | vibe : one credit for that source row (live or historical)
  -- backfill      : reserved for a later manual gap adjustment that is NOT
  --                 a 1:1 copy of a rating or vibe reward
  -- adjustment    : reserved for a later signed correction
  source text NOT NULL CHECK (source IN ('rating', 'vibe', 'backfill', 'adjustment')),
  -- ratings.id or vibe_reports.id, as text. Unique with source so a retry
  -- of the same rating or vibe cannot insert a second credit.
  source_id text NOT NULL,
  account_type text NOT NULL CHECK (account_type IN ('server', 'guest')),
  account_id uuid NULL,
  email text NULL,
  amount integer NOT NULL,
  -- Balance after this credit, when the row was written by the live RPC.
  -- Historical backfill leaves this NULL on purpose. It is not a second ledger.
  balance_after integer NULL,
  CONSTRAINT serve_ledger_source_id_unique UNIQUE (source, source_id)
);

COMMENT ON TABLE public.serve_ledger IS
  'Append-only $SERVE credits. Not an airdrop snapshot. Client roles cannot write.';

CREATE INDEX IF NOT EXISTS serve_ledger_account_idx
  ON public.serve_ledger (account_type, account_id);

ALTER TABLE public.serve_ledger ENABLE ROW LEVEL SECURITY;
-- Table owner is also subject to RLS. service_role has BYPASSRLS, which is
-- the only client that may write. There are no policies for anon or authenticated,
-- so the browser cannot SELECT, INSERT, UPDATE, or DELETE.
ALTER TABLE public.serve_ledger FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.serve_ledger FROM PUBLIC;
REVOKE ALL ON TABLE public.serve_ledger FROM anon;
REVOKE ALL ON TABLE public.serve_ledger FROM authenticated;
-- service_role may insert (the API calls the function below; a later reviewed
-- backfill may also insert). It may not update or delete. The trigger below
-- rejects UPDATE and DELETE for every role.
GRANT SELECT, INSERT ON TABLE public.serve_ledger TO service_role;
REVOKE UPDATE, DELETE ON TABLE public.serve_ledger FROM service_role;

CREATE OR REPLACE FUNCTION public.serve_ledger_append_only()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'serve_ledger is append-only';
END;
$$;

DROP TRIGGER IF EXISTS serve_ledger_no_update ON public.serve_ledger;
CREATE TRIGGER serve_ledger_no_update
  BEFORE UPDATE OR DELETE ON public.serve_ledger
  FOR EACH ROW
  EXECUTE FUNCTION public.serve_ledger_append_only();

-- ---------------------------------------------------------------------------
-- One rating write. Recomputes the reward. Does not trust a client amount
-- unless it matches this formula:
--   1 star = 2, 2 = 5, 3 = 10, 4 = 20, 5 = 35, comment +10, follow +5.
-- Score 0 is rejected. Also updates average_rating and total_ratings, which
-- the old browser write used to do in the same update as the balance.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.submit_rating_reward(
  p_server_id uuid,
  p_score integer,
  p_comment text,
  p_tags text[],
  p_guest_email text,
  p_followed boolean,
  p_amount integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_star integer;
  v_comment integer;
  v_follow integer;
  v_amount integer;
  v_rating_id text;
  v_balance integer;
  v_lifetime integer;
  v_avg numeric;
  v_count integer;
  v_new_count integer;
  v_new_avg numeric;
  v_email text;
BEGIN
  IF p_score IS NULL OR p_score < 1 OR p_score > 5 THEN
    RAISE EXCEPTION 'invalid score';
  END IF;

  v_star := CASE p_score
    WHEN 5 THEN 35
    WHEN 4 THEN 20
    WHEN 3 THEN 10
    WHEN 2 THEN 5
    ELSE 2
  END;
  v_comment := CASE
    WHEN p_comment IS NOT NULL AND length(btrim(p_comment)) > 0 THEN 10
    ELSE 0
  END;
  v_follow := CASE WHEN COALESCE(p_followed, false) THEN 5 ELSE 0 END;
  v_amount := v_star + v_comment + v_follow;

  IF p_amount IS DISTINCT FROM v_amount THEN
    RAISE EXCEPTION 'reward mismatch';
  END IF;

  SELECT email
  INTO v_email
  FROM public.servers
  WHERE id = p_server_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'server not found';
  END IF;

  -- Same columns the browser insert writes today. Does not set guest_name
  -- or rating_stars (rating_stars is 0 on every existing row; the app uses score).
  INSERT INTO public.ratings (
    server_id,
    score,
    comment,
    tags,
    guest_email,
    gps_verified,
    verification_method,
    serve_reward
  ) VALUES (
    p_server_id,
    p_score,
    NULLIF(btrim(COALESCE(p_comment, '')), ''),
    CASE WHEN p_tags IS NULL OR cardinality(p_tags) = 0 THEN NULL ELSE p_tags END,
    COALESCE(NULLIF(btrim(COALESCE(p_guest_email, '')), ''), 'anonymous'),
    false,
    'qr_scan',
    v_amount
  )
  RETURNING id::text INTO v_rating_id;

  SELECT serve_balance, serve_balance_lifetime, average_rating, total_ratings
  INTO v_balance, v_lifetime, v_avg, v_count
  FROM public.servers
  WHERE id = p_server_id;

  v_balance := COALESCE(v_balance, 0) + v_amount;
  v_lifetime := COALESCE(v_lifetime, 0) + v_amount;
  v_new_count := COALESCE(v_count, 0) + 1;
  v_new_avg := round(
    ((COALESCE(v_avg, 0) * COALESCE(v_count, 0) + p_score)::numeric) / v_new_count,
    1
  );

  UPDATE public.servers
  SET
    serve_balance = v_balance,
    serve_balance_lifetime = v_lifetime,
    total_ratings = v_new_count,
    average_rating = v_new_avg
  WHERE id = p_server_id;

  INSERT INTO public.serve_ledger (
    source,
    source_id,
    account_type,
    account_id,
    email,
    amount,
    balance_after
  ) VALUES (
    'rating',
    v_rating_id,
    'server',
    p_server_id,
    v_email,
    v_amount,
    v_balance
  );

  RETURN jsonb_build_object(
    'rating_id', v_rating_id,
    'amount', v_amount,
    'star_reward', v_star,
    'comment_bonus', v_comment,
    'follow_bonus', v_follow,
    'serve_balance', v_balance,
    'serve_balance_lifetime', v_lifetime
  );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_rating_reward(uuid, integer, text, text[], text, boolean, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_rating_reward(uuid, integer, text, text[], text, boolean, integer) FROM anon;
REVOKE ALL ON FUNCTION public.submit_rating_reward(uuid, integer, text, text[], text, boolean, integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.submit_rating_reward(uuid, integer, text, text[], text, boolean, integer) TO service_role;

COMMENT ON FUNCTION public.submit_rating_reward(uuid, integer, text, text[], text, boolean, integer) IS
  'Service-role only. Inserts one rating, one serve_ledger row, and increments server balances in one transaction.';
