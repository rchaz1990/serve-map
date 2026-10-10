-- 39: Limited-test data policy — location data and worker agreement.
--     NOT YET RUN IN PRODUCTION — needs founder approval.
--
-- Run only AFTER the matching app code is deployed (it stops sending coordinates and adds
-- the worker agreement step). Run earlier and two things break for users on the old code:
-- shift starts that still send user_lat/user_lng are refused, and existing workers are
-- refused at shift start with no explanation.
--
-- What it does:
--   1. App users (anon, authenticated) can no longer read distance_meters on shifts or
--      vibe_reports. gps_verified (the location-check result) stays public. The service
--      role (server code) still reads everything.
--   2. App users can no longer write user_lat / user_lng on shifts. (vibe_reports is only
--      written by submit_vibe_report, called by the server, which now passes nulls.)
--   3. Starting a shift, or receiving a new follow, requires that the worker whose profile it is has acknowledged the
--      current Terms/Privacy version as a worker (app_metadata.legal_worker_version, written
--      only by the server). Applies to the worker and to a verified manager starting it for
--      them. Re-activating an ended shift is covered too; ending a shift is always allowed.
--      Profiles not tied to a sign-in account (wallet_address not an auth user) can never
--      pass, so they cannot be put on shift until they are claimed.
--
-- Existing rows are not changed (the 181 stored coordinate pairs are untouched; see
-- docs/LOCATION_DATA_CLEANUP_PLAN.md). Nothing is deleted.
--
-- The version below must equal LEGAL_VERSION in frontend/lib/legal.ts. A version bump
-- needs a new migration that replaces current_legal_version().
--
-- Rollback: 39_rollback_participant_data_policy.sql

begin;

-- Pre-checks: the objects are the versions this was built against.
do $$
begin
  if (select md5(pg_get_expr(polwithcheck, polrelid)) from pg_policy
      where polrelid = 'public.shifts'::regclass and polname = 'shifts_insert_owner')
     is distinct from '875552c348ccd8c68961adbf00e646c1' then
    raise exception 'shifts_insert_owner is not the expected version; stopping';
  end if;
  if exists (select 1 from pg_policy where polname in ('shifts_insert_worker_terms', 'shifts_update_worker_terms', 'follows_insert_worker_terms')) then
    raise exception 'worker-terms policies already exist; stopping';
  end if;
  -- Column revokes only take effect if there is no table-wide SELECT/INSERT grant.
  if has_table_privilege('anon', 'public.shifts', 'SELECT')
     or has_table_privilege('authenticated', 'public.shifts', 'SELECT')
     or has_table_privilege('authenticated', 'public.shifts', 'INSERT')
     or has_table_privilege('anon', 'public.vibe_reports', 'SELECT')
     or has_table_privilege('authenticated', 'public.vibe_reports', 'SELECT') then
    raise exception 'unexpected table-level grant on shifts/vibe_reports; stopping';
  end if;
end $$;

-- 1. Exact distance is internal only.
revoke select (distance_meters) on public.shifts from anon, authenticated;
revoke select (distance_meters) on public.vibe_reports from anon, authenticated;

-- 2. No raw coordinates from app users.
revoke insert (user_lat, user_lng) on public.shifts from authenticated;

-- 3. Worker agreement before a shift starts.
create or replace function public.current_legal_version()
returns text
language sql
immutable
as $$ select '2026-10-10'::text $$;

create or replace function public.worker_terms_ok(p_server_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.servers s
    join auth.users u on u.id::text = s.wallet_address
    where s.id = p_server_id
      and u.raw_app_meta_data ->> 'legal_worker_version' = public.current_legal_version()
  )
$$;
-- Policies evaluate it as the calling user, so app users need EXECUTE. It returns only
-- true/false for a profile id; no account data.
revoke all on function public.worker_terms_ok(uuid) from public;
grant execute on function public.worker_terms_ok(uuid) to authenticated, service_role;
grant execute on function public.current_legal_version() to authenticated, service_role;

-- Restrictive: combined with AND on top of the existing owner/manager policies.
create policy shifts_insert_worker_terms on public.shifts
  as restrictive for insert to authenticated
  with check (public.worker_terms_ok(server_id));

create policy shifts_update_worker_terms on public.shifts
  as restrictive for update to authenticated
  using (true)
  with check (is_active is not true or public.worker_terms_ok(server_id));

-- New follows only for workers who accepted. App users can only INSERT follows (no UPDATE
-- grant); approving a pending follow goes through /api/followers/approve, which checks the
-- same agreement. Existing follows are not touched.
create policy follows_insert_worker_terms on public.follows
  as restrictive for insert to authenticated
  with check (public.worker_terms_ok(server_id));

commit;

-- Verify after running (read-only):
--   select has_column_privilege('anon','public.shifts','distance_meters','SELECT');               -- false
--   select has_column_privilege('anon','public.vibe_reports','distance_meters','SELECT');         -- false
--   select has_column_privilege('anon','public.vibe_reports','gps_verified','SELECT');            -- true
--   select has_column_privilege('authenticated','public.shifts','user_lat','INSERT');             -- false
--   select polname, polpermissive from pg_policy where polrelid = 'public.shifts'::regclass;      -- two restrictive *_worker_terms
--   select public.current_legal_version();                                                       -- '2026-10' (= LEGAL_VERSION)
--   select count(*) from public.shifts where user_lat is not null;                                -- unchanged (29)
