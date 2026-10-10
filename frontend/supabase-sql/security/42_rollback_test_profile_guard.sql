-- Rollback for 42_test_profile_guard.sql. WARNING: any test profile becomes public again.
-- Hide or remove test profiles first if that matters (separate, approved step).
begin;
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
