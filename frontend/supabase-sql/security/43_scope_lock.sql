-- 43: Early-test scope lock (step A1 — database first).
--     NOT YET RUN IN PRODUCTION — needs founder approval. Deletes nothing.
--
-- Founder decision (2026-10-10): the first Stranger Test is scan → sign up → agree → rate.
-- Follow, shift emails, vibe reports and venue comments are paused. Shift distance is not
-- stored. See docs/EARLY_TEST_ACCEPTANCE_CRITERIA.md (S6–S8).
--
-- What it does (no runtime switch; re-enabling needs a new migration under founder approval):
--   1. New follows, vibe reports and venue comments are refused for EVERY role, including the
--      service role (BEFORE INSERT triggers raising 'feature_paused:<name>'). Existing rows,
--      unfollowing and reading are unchanged.
--   2. New shift-email notifications ('shift_started', 'job_changed') are refused the same way.
--   3. shifts.distance_meters is always stored as NULL (insert and update). Shift start keeps
--      working for older app versions that still send a distance.
--   4. my_ratings(): the signed-in user's own ratings (no account identifier), so "My Ratings"
--      no longer needs to read ratings.guest_id (made private in 43b).
--
-- Order: run BEFORE deploying the PR-A app (safe with the current app: the paused features
-- only show an error until the new app hides them). Then deploy the app, then run 43b.
-- Rollback: 43_rollback_scope_lock.sql (refuses while 43b is applied).

begin;

do $$
begin
  if to_regprocedure('public.my_ratings()') is not null then
    raise exception '43 already applied; stopping';
  end if;
  if to_regclass('public.follows') is null or to_regclass('public.vibe_reports') is null
     or to_regclass('public.venue_comments') is null or to_regclass('public.notifications') is null then
    raise exception 'expected tables not found; stopping';
  end if;
end $$;

-- 1–2. Paused features: refused for every role.
create or replace function public.early_test_paused()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_table_name = 'notifications' then
    if new.type not in ('shift_started', 'job_changed') then
      return new;   -- only shift-email notifications are paused
    end if;
  end if;
  raise exception 'feature_paused:%', tg_argv[0] using errcode = 'P0001';
end;
$$;
revoke all on function public.early_test_paused() from public, anon, authenticated;

create trigger follows_early_test_paused before insert on public.follows
  for each row execute function public.early_test_paused('follows');
create trigger vibe_reports_early_test_paused before insert on public.vibe_reports
  for each row execute function public.early_test_paused('vibe_reports');
create trigger venue_comments_early_test_paused before insert on public.venue_comments
  for each row execute function public.early_test_paused('venue_comments');
create trigger notifications_early_test_paused before insert on public.notifications
  for each row execute function public.early_test_paused('shift_emails');

-- 3. No shift distance stored.
create or replace function public.shifts_drop_distance()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.distance_meters := null;
  return new;
end;
$$;
revoke all on function public.shifts_drop_distance() from public, anon, authenticated;
create trigger shifts_drop_distance before insert or update on public.shifts
  for each row execute function public.shifts_drop_distance();

-- 4. Own ratings without reading the account identifier.
create or replace function public.my_ratings()
returns table (id uuid, score integer, comment text, created_at timestamptz, server_id uuid, server_name text)
language sql
stable
security definer
set search_path = public
as $$
  select r.id, r.score, r.comment, r.created_at, r.server_id, s.name
  from public.ratings r
  left join public.servers s on s.id = r.server_id
  where auth.uid() is not null
    and r.guest_id::text = auth.uid()::text
  order by r.created_at desc
$$;
revoke all on function public.my_ratings() from public, anon;
grant execute on function public.my_ratings() to authenticated, service_role;

commit;

-- Make the new function visible to the data API now.
notify pgrst, 'reload schema';

-- Verify after running (read-only):
--   select count(*) from pg_trigger where tgname like '%early_test_paused' ;            -- 4
--   select count(*) from pg_trigger where tgname = 'shifts_drop_distance';              -- 1
--   select has_function_privilege('anon','public.my_ratings()','EXECUTE');              -- false
--   select count(*) from public.follows; select count(*) from public.vibe_reports;     -- unchanged
