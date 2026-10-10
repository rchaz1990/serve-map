-- 42: Test worker profiles are invisible to the public and never mix with real users.
--     NOT YET RUN IN PRODUCTION — needs founder approval.
--
-- Problem: worker sign-up creates a public `servers` row. `servers.is_test` is set from a
-- browser "test device" flag (analytics only); it hides nothing, and the browser controls it.
--
-- Fix (server-controlled; `is_test` is left as it is):
--   1. public.test_accounts(email): the authorized test accounts. Readable and writable by
--      the service role only. Adding an email is a separate, approved data step.
--   2. servers.test_profile: set by the database, never by the app or the browser —
--        * on insert / when wallet_address changes, if the owning account is a test account;
--        * when an email is added to test_accounts, for that account's existing profile.
--      It is sticky: removing an email does not make the profile public again.
--   3. Restrictive SELECT policies (anon, authenticated): a test profile, its workplaces,
--      shifts and ratings are visible only to test accounts (including its owner). Everyone
--      else sees nothing — public pages, profile/rate/scan routes, Explore, staff lists and
--      direct database queries alike. Real profiles: unchanged.
--   4. No mixing: a test account cannot follow or rate a real profile, and a real account
--      cannot follow or rate a test profile (follows: restrictive INSERT policy; ratings:
--      BEFORE INSERT trigger, so it also covers the service-role rating function).
--
-- Real workers are unaffected: test_profile defaults to false and only becomes true for
-- accounts listed in test_accounts (empty after this migration).
-- Rollback: 42_rollback_test_profile_guard.sql

begin;

do $$
begin
  if to_regclass('public.test_accounts') is not null then
    raise exception '42 already applied; stopping';
  end if;
  if not exists (select 1 from pg_policy where polrelid = 'public.ratings'::regclass and polname = 'ratings_read')
     or not exists (select 1 from pg_policy where polrelid = 'public.shifts'::regclass and polname = 'shifts_read') then
    raise exception 'expected ratings_read / shifts_read policies not found; stopping';
  end if;
end $$;

-- 1. Authorized test accounts
create table public.test_accounts (
  email text primary key check (email = lower(btrim(email))),
  note text,
  added_at timestamptz not null default now()
);
alter table public.test_accounts enable row level security;
alter table public.test_accounts force row level security;
revoke all on public.test_accounts from public, anon, authenticated;
grant select, insert, delete on public.test_accounts to service_role;

-- 2. Server-controlled flag
alter table public.servers add column test_profile boolean not null default false;

create or replace function public.servers_mark_test_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from auth.users u join public.test_accounts t on t.email = lower(u.email)
             where u.id::text = new.wallet_address) then
    new.test_profile := true;
  elsif tg_op = 'UPDATE' then
    new.test_profile := old.test_profile;   -- sticky; never cleared or set by a client
  else
    new.test_profile := false;
  end if;
  return new;
end;
$$;
create trigger servers_mark_test_profile before insert or update on public.servers
  for each row execute function public.servers_mark_test_profile();

create or replace function public.test_accounts_mark_profiles()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.servers s set test_profile = true
  from auth.users u
  where lower(u.email) = new.email and s.wallet_address = u.id::text;
  return new;
end;
$$;
create trigger test_accounts_mark_profiles after insert on public.test_accounts
  for each row execute function public.test_accounts_mark_profiles();

-- Helpers for policies (true/false only; no account data)
create or replace function public.viewer_is_tester()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from auth.users u join public.test_accounts t on t.email = lower(u.email)
                 where u.id = auth.uid())
$$;

create or replace function public.server_visible_to_viewer(p_server_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select not s.test_profile from public.servers s where s.id = p_server_id), true)
         or public.viewer_is_tester()
$$;

create or replace function public.server_matches_viewer(p_server_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select s.test_profile from public.servers s where s.id = p_server_id), false)
         = public.viewer_is_tester()
$$;
revoke all on function public.viewer_is_tester() from public;
revoke all on function public.server_visible_to_viewer(uuid) from public;
revoke all on function public.server_matches_viewer(uuid) from public;
grant execute on function public.viewer_is_tester() to anon, authenticated, service_role;
grant execute on function public.server_visible_to_viewer(uuid) to anon, authenticated, service_role;
grant execute on function public.server_matches_viewer(uuid) to anon, authenticated, service_role;

-- 3. Visibility
create policy servers_hide_test on public.servers
  as restrictive for select to anon, authenticated
  using (not test_profile or public.viewer_is_tester());
create policy server_restaurants_hide_test on public.server_restaurants
  as restrictive for select to anon, authenticated
  using (public.server_visible_to_viewer(server_id));
create policy shifts_hide_test on public.shifts
  as restrictive for select to anon, authenticated
  using (public.server_visible_to_viewer(server_id));
create policy ratings_hide_test on public.ratings
  as restrictive for select to anon, authenticated
  using (public.server_visible_to_viewer(server_id));

-- 4. No mixing
create policy follows_no_test_mix on public.follows
  as restrictive for insert to authenticated
  with check (public.server_matches_viewer(server_id));

create or replace function public.ratings_no_test_mix()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce((select s.test_profile from public.servers s where s.id = new.server_id), false)
     <> exists (select 1 from public.test_accounts t where t.email = lower(btrim(new.guest_email))) then
    raise exception 'rating_limit:test_mix';
  end if;
  return new;
end;
$$;
create trigger ratings_no_test_mix before insert on public.ratings
  for each row execute function public.ratings_no_test_mix();

revoke all on function public.servers_mark_test_profile() from public, anon, authenticated;
revoke all on function public.test_accounts_mark_profiles() from public, anon, authenticated;
revoke all on function public.ratings_no_test_mix() from public, anon, authenticated;

commit;

-- Verify after running (read-only):
--   select count(*) from public.servers where test_profile;                                   -- 0
--   select count(*) from public.test_accounts;                                                -- 0
--   select has_table_privilege('authenticated','public.test_accounts','SELECT');              -- false
--   select has_column_privilege('authenticated','public.servers','test_profile','UPDATE');    -- false
--
-- Separate approved data step (before the test account creates its worker profile):
--   insert into public.test_accounts (email, note) values ('<test account email>', 'controlled testing');
