-- Rating abuse limits.  NOT YET RUN IN PRODUCTION — needs approval.
-- Replaces public.submit_rating_reward with the same signature, security and grants
-- (create or replace keeps grants: server/service_role only). Existing ratings,
-- averages, balances and ledger rows are not touched.
--
-- Adds, inside the same transaction as the insert and under a per-guest lock:
--   * a worker cannot rate their own profile                      -> 'rating_limit:self'
--   * one rating per guest per worker per 24 hours                -> 'rating_limit:cooldown'
--   * at most 10 ratings per guest per 24 hours (all workers)     -> 'rating_limit:daily'
-- The guest key is the signed-in account's email, which is unique per account and is
-- what every existing rating row stores, so history counts toward the limits.
-- Safe to run before or after the app change: the current app shows its generic
-- "Could not submit rating" message for these; the new app shows specific messages.

CREATE OR REPLACE FUNCTION public.submit_rating_reward(p_server_id uuid, p_score integer, p_comment text, p_tags text[], p_guest_email text, p_followed boolean, p_amount integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  -- ── Abuse limits (migration 34) ───────────────────────────────────────────
  -- Serialise each guest's ratings so parallel requests see each other.
  PERFORM pg_advisory_xact_lock(hashtext('rating:' || lower(btrim(COALESCE(p_guest_email, '')))));

  IF NULLIF(btrim(COALESCE(p_guest_email, '')), '') IS NULL THEN
    RAISE EXCEPTION 'rating_limit:identity';
  END IF;

  -- A worker cannot rate their own profile.
  IF EXISTS (
    SELECT 1 FROM public.servers s
    JOIN auth.users u ON u.id::text = s.wallet_address
    WHERE s.id = p_server_id AND lower(u.email) = lower(btrim(p_guest_email))
  ) THEN
    RAISE EXCEPTION 'rating_limit:self';
  END IF;

  -- One rating per guest per worker per 24 hours (repeat visits on later days are fine).
  IF EXISTS (
    SELECT 1 FROM public.ratings r
    WHERE r.server_id = p_server_id
      AND lower(r.guest_email) = lower(btrim(p_guest_email))
      AND r.created_at > now() - interval '24 hours'
  ) THEN
    RAISE EXCEPTION 'rating_limit:cooldown';
  END IF;

  -- At most 10 ratings per guest per 24 hours across all workers.
  IF (SELECT count(*) FROM public.ratings r
      WHERE lower(r.guest_email) = lower(btrim(p_guest_email))
        AND r.created_at > now() - interval '24 hours') >= 10 THEN
    RAISE EXCEPTION 'rating_limit:daily';
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
$function$
;
