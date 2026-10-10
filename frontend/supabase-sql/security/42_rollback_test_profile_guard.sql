-- Rollback for 42_test_profile_guard.sql.
-- Refuses to run while any test profile or listed test account exists, because removing
-- these rules would make test profiles public and let them mix with real users. First
-- remove each test profile with the participant deletion procedure
-- (docs/PARTICIPANT_DATA_DELETION.md, separately approved) and empty test_accounts.
begin;

do $$
begin
  if exists (select 1 from public.servers where test_profile) then
    raise exception 'test profiles still exist (%); remove them with the approved deletion procedure first',
      (select count(*) from public.servers where test_profile);
  end if;
  if exists (select 1 from public.test_accounts) then
    raise exception 'test_accounts is not empty; remove the listed accounts first';
  end if;
end $$;
drop trigger if exists ratings_no_test_mix on public.ratings;
drop policy if exists follows_no_test_mix on public.follows;
drop policy if exists ratings_hide_test on public.ratings;
drop policy if exists shifts_hide_test on public.shifts;
drop policy if exists server_restaurants_hide_test on public.server_restaurants;
drop policy if exists servers_hide_test on public.servers;
drop trigger if exists servers_mark_test_profile on public.servers;
drop trigger if exists test_accounts_mark_profiles on public.test_accounts;
drop function if exists public.ratings_no_test_mix();
drop function if exists public.server_matches_viewer(uuid);
drop function if exists public.server_visible_to_viewer(uuid);
drop function if exists public.viewer_is_tester();
drop function if exists public.test_accounts_mark_profiles();
drop function if exists public.servers_mark_test_profile();
alter table public.servers drop column if exists test_profile;
drop table if exists public.test_accounts;
commit;
