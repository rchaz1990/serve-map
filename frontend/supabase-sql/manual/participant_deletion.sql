-- Participant deletion — STEP 2: delete (one person, all or nothing).
-- See docs/PARTICIPANT_DATA_DELETION.md. Run only with founder approval for that request.
--
-- Fill in the placeholders and the expected counts from STEP 1. If any count differs
-- (data changed since the preview, or a typo), the whole block stops and nothing is
-- deleted. serve_ledger rows are never deleted or changed, except that a deleted worker's
-- email is cleared from them through redact_ledger_email (migration 41).
-- Afterwards: delete the profile photo in Storage, then the user in Authentication.
do $$
declare
  v_email text := lower(btrim('PARTICIPANT_EMAIL'));
  v_uid   text := 'PARTICIPANT_AUTH_ID';
  -- expected counts from the preview
  e_ratings_written int := 0;  e_follows_made int := 0;  e_notifications_received int := 0;
  e_vibe_reports int := 0;     e_venue_comments int := 0; e_guest_points_rows int := 0;
  e_ratings_on_profile int := 0; e_followers int := 0;  e_notifications_about_profile int := 0;
  e_workplaces int := 0;       e_shifts int := 0;         e_suggestions int := 0;
  v_server uuid;
  v_rated uuid[];
  n int;
  procedure_name text := 'participant_deletion';
begin
  if (select count(*) from auth.users u where u.id::text = v_uid and lower(u.email) = v_email) <> 1 then
    raise exception '%: email and account id do not match one account', procedure_name;
  end if;
  if exists (select 1 from public.restaurant_managers m where m.auth_id = v_uid) then
    raise exception '%: this account is a restaurant manager; not covered by this procedure', procedure_name;
  end if;
  select s.id into v_server from public.servers s where s.wallet_address = v_uid;

  -- What the person wrote or did (guests and workers alike)
  select array_agg(distinct r.server_id) into v_rated from public.ratings r
   where lower(r.guest_email) = v_email or r.guest_id = v_uid;
  delete from public.ratings r where lower(r.guest_email) = v_email or r.guest_id = v_uid;
  get diagnostics n = row_count; if n <> e_ratings_written then raise exception 'ratings_written: % (expected %)', n, e_ratings_written; end if;
  -- Recalculate the rated workers' totals the same way submit_rating keeps them.
  update public.servers s set
    total_ratings  = (select count(*) from public.ratings r where r.server_id = s.id),
    average_rating = coalesce((select round(avg(r.score)::numeric, 1) from public.ratings r where r.server_id = s.id), 0)
  where s.id = any(coalesce(v_rated, '{}'));

  delete from public.follows f where f.follower_id = v_uid or lower(f.follower_email) = v_email;  -- follower_count updates by trigger
  get diagnostics n = row_count; if n <> e_follows_made then raise exception 'follows_made: % (expected %)', n, e_follows_made; end if;
  delete from public.notifications x where lower(x.recipient_email) = v_email;
  get diagnostics n = row_count; if n <> e_notifications_received then raise exception 'notifications_received: % (expected %)', n, e_notifications_received; end if;
  delete from public.vibe_reports x where lower(x.reported_by) = v_email;
  get diagnostics n = row_count; if n <> e_vibe_reports then raise exception 'vibe_reports: % (expected %)', n, e_vibe_reports; end if;
  delete from public.venue_comments x where lower(x.commenter_email) = v_email;
  get diagnostics n = row_count; if n <> e_venue_comments then raise exception 'venue_comments: % (expected %)', n, e_venue_comments; end if;
  delete from public.guest_rewards x where lower(x.email) = v_email;
  get diagnostics n = row_count; if n <> e_guest_points_rows then raise exception 'guest_points_rows: % (expected %)', n, e_guest_points_rows; end if;

  -- Worker profile, if any. Children first (no cascading foreign keys except qr_scans and
  -- recruiting_contacts, which go with the profile row).
  if v_server is not null then
    delete from public.ratings x where x.server_id = v_server;
    get diagnostics n = row_count; if n <> e_ratings_on_profile then raise exception 'ratings_on_profile: % (expected %)', n, e_ratings_on_profile; end if;
    delete from public.follows x where x.server_id = v_server;
    get diagnostics n = row_count; if n <> e_followers then raise exception 'followers: % (expected %)', n, e_followers; end if;
    delete from public.notifications x where x.server_id = v_server;
    get diagnostics n = row_count; if n <> e_notifications_about_profile then raise exception 'notifications_about_profile: % (expected %)', n, e_notifications_about_profile; end if;
    delete from public.server_restaurants x where x.server_id = v_server;
    get diagnostics n = row_count; if n <> e_workplaces then raise exception 'workplaces: % (expected %)', n, e_workplaces; end if;
    delete from public.shifts x where x.server_id = v_server;
    get diagnostics n = row_count; if n <> e_shifts then raise exception 'shifts: % (expected %)', n, e_shifts; end if;
    delete from public.suggestions x where x.server_id = v_server;
    get diagnostics n = row_count; if n <> e_suggestions then raise exception 'suggestions: % (expected %)', n, e_suggestions; end if;
    delete from public.servers s where s.id = v_server;
    -- Ledger rows stay (append-only); only their email is cleared (migration 41).
    if to_regprocedure('public.redact_ledger_email(uuid)') is null then
      raise exception 'migration 41 (redact_ledger_email) is not installed; stopping so no worker email is kept by mistake';
    end if;
    perform public.redact_ledger_email(v_server);
  elsif e_ratings_on_profile + e_followers + e_notifications_about_profile + e_workplaces + e_shifts + e_suggestions > 0 then
    raise exception 'worker counts given but this account has no worker profile';
  end if;

  raise notice '% done for one account (worker profile: %)', procedure_name, v_server is not null;
end $$;
