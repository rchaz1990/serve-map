-- Rollback for 40_hide_unclaimed_profiles.sql: the two profiles become public again.
begin;
drop policy if exists servers_hide_unclaimed on public.servers;
drop policy if exists server_restaurants_hide_unclaimed on public.server_restaurants;
drop function if exists public.server_listed(uuid);
alter table public.servers drop column if exists hidden_until_claimed;
commit;
