-- Rollback for 34: restores the exact production definition captured 2026-10-09
-- (pg_get_functiondef; body md5 f38dde540a449d111fb5ae77814c4139). Grants are unchanged by
-- either file (create or replace keeps them). Roll the app back first if it depends on 34's messages.
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
