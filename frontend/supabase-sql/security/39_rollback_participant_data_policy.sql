-- Rollback for 39_participant_data_policy.sql. Restores the previous grants and removes
-- the worker-agreement policies and functions. No data is changed by either direction.
-- If the app code from the same PR stays deployed, it keeps working after this rollback
-- (it no longer sends coordinates or reads distance either way).

begin;

drop policy if exists shifts_insert_worker_terms on public.shifts;
drop policy if exists shifts_update_worker_terms on public.shifts;
drop function if exists public.worker_terms_ok(uuid);
drop function if exists public.current_legal_version();

grant select (distance_meters) on public.shifts to anon, authenticated;
grant select (distance_meters) on public.vibe_reports to anon, authenticated;
grant insert (user_lat, user_lng) on public.shifts to authenticated;

commit;
