-- Vibe reports: one locked database call for cooldown, daily limit, report and reward.
-- NOT YET RUN IN PRODUCTION — needs approval. Run BEFORE deploying the app change
-- (the new /api/verify-vibe calls this function; the old route does not use it).
--
-- Callable by the server only (service_role). Supabase grants EXECUTE on new public
-- functions to anon/authenticated by default, so those are revoked explicitly.
--
-- Rules (per reporter email, the signed-in account's email):
--   * one report per venue per 2 hours            -> status 'cooldown', nothing written
--   * at most 20 reports per UTC day              -> status 'daily_limit', nothing written
--   * 3+ reports in the last hour                 -> report saved, flagged, no reward
--   * reward 5 only if location-consistent, account at least 24 h old, not flagged,
--     and fewer than 3 rewarded reports already today (UTC) — max 15 $SERVE per day;
--     otherwise 0, and the report is still saved. (Previously 1 for any report.)
-- The per-email advisory lock serialises parallel requests, so they cannot slip
-- past the limits or lose/duplicate reward updates.

create or replace function public.submit_vibe_report(
  p_email text,
  p_restaurant_name text,
  p_vibe text,
  p_bar_seats text,
  p_wait_time text,
  p_user_lat numeric,
  p_user_lng numeric,
  p_distance_meters integer,
  p_location_consistent boolean,
  p_new_account boolean
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_email text := lower(btrim(p_email));
  v_day_start timestamptz := date_trunc('day', now() at time zone 'UTC') at time zone 'UTC';
  v_rewarded_today integer;
  v_flagged boolean;
  v_reward integer;
  v_integrity integer;
  v_id uuid;
begin
  if v_email is null or v_email = '' or p_restaurant_name is null or btrim(p_restaurant_name) = ''
     or p_vibe not in ('CHILL', 'LIVE', 'PACKED') then
    raise exception 'invalid vibe report';
  end if;

  perform pg_advisory_xact_lock(hashtext('vibe:' || v_email));

  if exists (
    select 1 from public.vibe_reports
    where lower(reported_by) = v_email
      and lower(restaurant_name) = lower(btrim(p_restaurant_name))
      and created_at >= now() - interval '2 hours'
  ) then
    return jsonb_build_object('status', 'cooldown');
  end if;

  if (select count(*) from public.vibe_reports
      where lower(reported_by) = v_email
        and created_at >= v_day_start) >= 20 then
    return jsonb_build_object('status', 'daily_limit');
  end if;

  v_flagged := (select count(*) from public.vibe_reports
                where lower(reported_by) = v_email
                  and created_at >= now() - interval '1 hour') >= 3;

  -- Counted under the same lock as the insert below, so parallel requests see each other.
  v_rewarded_today := (select count(*) from public.vibe_reports
                       where lower(reported_by) = v_email
                         and created_at >= v_day_start
                         and serve_reward > 0);

  v_reward := case when coalesce(p_location_consistent, false)
                        and not coalesce(p_new_account, true)
                        and not v_flagged
                        and v_rewarded_today < 3
                   then 5 else 0 end;
  v_integrity := (case when coalesce(p_location_consistent, false) then 40 else 0 end)
               + (case when coalesce(p_new_account, true) then 0 else 10 end)
               + (case when v_flagged then 0 else 10 end);

  insert into public.vibe_reports (
    restaurant_name, vibe, bar_seats, wait_time, reported_by,
    gps_verified, qr_verified, integrity_score, serve_reward, is_flagged,
    distance_meters, user_lat, user_lng
  ) values (
    btrim(p_restaurant_name), p_vibe, p_bar_seats, p_wait_time, v_email,
    coalesce(p_location_consistent, false), false, v_integrity, v_reward, v_flagged,
    p_distance_meters, p_user_lat, p_user_lng
  ) returning id into v_id;

  if v_reward > 0 then
    update public.guest_rewards
       set slate_points = coalesce(slate_points, 0) + v_reward, updated_at = now()
     where lower(email) = v_email;
    if not found then
      insert into public.guest_rewards (email, slate_points) values (v_email, v_reward);
    end if;
  end if;

  return jsonb_build_object('status', 'ok', 'report_id', v_id, 'serve_reward', v_reward,
                            'integrity_score', v_integrity, 'flagged', v_flagged,
                            'daily_reward_cap_reached', v_rewarded_today >= 3);
end;
$$;

revoke all on function public.submit_vibe_report(text, text, text, text, text, numeric, numeric, integer, boolean, boolean) from public;
revoke all on function public.submit_vibe_report(text, text, text, text, text, numeric, numeric, integer, boolean, boolean) from anon, authenticated;
grant execute on function public.submit_vibe_report(text, text, text, text, text, numeric, numeric, integer, boolean, boolean) to service_role;
