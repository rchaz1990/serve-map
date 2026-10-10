-- 44b: Early-test participant enforcement + new legal version (step B3 — after the PR-B app).
--     NOT YET RUN IN PRODUCTION — needs founder approval. Deletes nothing; changes no rows.
--
-- What it does (see docs/EARLY_TEST_ACCEPTANCE_CRITERIA.md, requirements 1, 2, 5, 8):
--   1. Legal version 2026-10-13 (corrected Privacy Policy): current_legal_version() → '2026-10-13'.
--      Everyone on 2026-10-10 must acknowledge again (guests before rating; workers before
--      shifts or receiving ratings — worker_terms_ok() compares against this version).
--   2. New ratings need BOTH the rater's guest agreement and the worker's worker agreement
--      (BEFORE INSERT trigger, so it also covers the service-role rating function).
--   3. Shifts: starting (insert, or update to active) needs the worker agreement.
--   4. Visibility: a worker profile whose owner has not accepted the current worker agreement
--      (never agreed, or withdrew) is hidden — the profile, its workplaces, shifts and ratings —
--      from everyone except the owner (anon and authenticated; restrictive policies). Server
--      code (service role) applies the same rule in lib/test-profiles.ts. Nothing is deleted;
--      accepting the agreement makes everything visible again.
--
-- Order: only AFTER the PR-B app is deployed (it shows the agreement cards and records them).
-- Rollback: 44b_rollback_participant_enforcement.sql — run it BEFORE any app rollback.

begin;

do $$
begin
  if to_regprocedure('public.record_participant_event(uuid,text,text,text)') is null then
    raise exception '44 must be applied first; stopping';
  end if;
  if exists (select 1 from pg_policy where polrelid = 'public.servers'::regclass and polname = 'servers_hide_nonparticipants') then
    raise exception '44b already applied; stopping';
  end if;
  if public.current_legal_version() <> '2026-10-10' then
    raise exception 'expected legal version 2026-10-10 before this step, found %; stopping', public.current_legal_version();
  end if;
end $$;

-- 1. New legal version (same date as the participant agreements)
create or replace function public.current_legal_version()
returns text
language sql
immutable
as $$ select '2026-10-13'::text $$;

-- 2. Ratings: guest and worker must both participate
create or replace function public.ratings_require_participants()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_guest uuid;
begin
  select u.id into v_guest from auth.users u where lower(u.email) = lower(btrim(new.guest_email));
  if v_guest is null or not public.participant_ok(v_guest, 'guest') then
    raise exception 'participant_required';
  end if;
  if not public.worker_participant_ok(new.server_id) then
    raise exception 'worker_not_participating';
  end if;
  return new;
end;
$$;
revoke all on function public.ratings_require_participants() from public, anon, authenticated;
create trigger ratings_require_participants before insert on public.ratings
  for each row execute function public.ratings_require_participants();

-- 3. Shifts: starting needs the worker agreement
create policy shifts_insert_worker_participant on public.shifts
  as restrictive for insert to authenticated
  with check (public.worker_participant_ok(server_id));
create policy shifts_update_worker_participant on public.shifts
  as restrictive for update to authenticated
  using (true)
  with check (is_active is not true or public.worker_participant_ok(server_id));

-- 4. Visibility: non-participating workers hidden (owner still sees their own)
create policy servers_hide_nonparticipants on public.servers
  as restrictive for select to anon, authenticated
  using (public.server_visible_in_test(id));
create policy server_restaurants_hide_nonparticipants on public.server_restaurants
  as restrictive for select to anon, authenticated
  using (public.server_visible_in_test(server_id));
create policy shifts_hide_nonparticipants on public.shifts
  as restrictive for select to anon, authenticated
  using (public.server_visible_in_test(server_id));
create policy ratings_hide_nonparticipants on public.ratings
  as restrictive for select to anon, authenticated
  using (public.server_visible_in_test(server_id));

commit;

notify pgrst, 'reload schema';

-- Verify after running (read-only):
--   select public.current_legal_version(), public.current_participant_version();      -- 2026-10-13 | 2026-10-13
--   set role anon; select count(*) from public.servers; reset role;                     -- participating workers only
--   select count(*) from public.servers; select count(*) from public.ratings;          -- unchanged (nothing deleted)
