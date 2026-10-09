-- 36: Verified restaurant managers.  NOT YET RUN IN PRODUCTION — needs approval.
--
-- Problem: anyone can create a restaurant_managers row naming any restaurant, and
-- manager_can_staff() trusted that self-typed name, so an impostor could start/end
-- shifts for every worker who lists that restaurant.
--
-- Fix: manager powers require a Slate verification that binds the manager to ONE
-- venue by name AND street address (the Google formatted address workers record in
-- server_restaurants.restaurant_address). Two venues with the same name but different
-- addresses never match. The self-typed restaurant_name is no longer used for authority.
--
-- Users cannot set the new columns: restaurant_managers has column-level INSERT grants
-- for five other columns only, and no UPDATE/DELETE grants. Only Slate (SQL Editor /
-- service role) can verify. Nothing is verified by this migration.
--
-- Rollback: 36_rollback_verified_managers.sql

begin;

-- Pre-check: replacing exactly the version currently in production.
do $$
begin
  if (select md5(prosrc) from pg_proc where oid = 'public.manager_can_staff(uuid,text)'::regprocedure)
     <> '8ea02c808366da74d12025a910477a8d' then
    raise exception 'manager_can_staff is not the expected version; stopping';
  end if;
end $$;

alter table public.restaurant_managers
  add column verified_at timestamptz,
  add column verified_restaurant_name text,
  add column verified_restaurant_address text,
  add column verification_note text,   -- who verified and what evidence (Slate only; not readable by users)
  add constraint restaurant_managers_verified_binding check (
    verified_at is null or (
      coalesce(btrim(verified_restaurant_name), '') <> ''
      and coalesce(btrim(verified_restaurant_address), '') <> ''
    )
  );

-- Verification status and venue are public business facts (dashboard + badges).
-- verification_note stays private.
grant select (verified_at, verified_restaurant_name, verified_restaurant_address)
  on public.restaurant_managers to anon, authenticated;

-- Single source of truth for "may this account act as manager for this worker at this venue".
-- Used by RLS (via manager_can_staff) and by server routes (service role).
create or replace function public.manager_controls(p_auth_id text, p_server_id uuid, p_restaurant text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_auth_id is not null and exists (
    select 1
    from public.restaurant_managers m
    join public.server_restaurants sr on sr.server_id = p_server_id
    where m.auth_id = p_auth_id
      and m.verified_at is not null
      and lower(regexp_replace(btrim(m.verified_restaurant_name), '\s+', ' ', 'g'))
          = lower(regexp_replace(btrim(p_restaurant), '\s+', ' ', 'g'))
      and lower(regexp_replace(btrim(sr.restaurant_name), '\s+', ' ', 'g'))
          = lower(regexp_replace(btrim(m.verified_restaurant_name), '\s+', ' ', 'g'))
      and lower(regexp_replace(btrim(sr.restaurant_address), '\s+', ' ', 'g'))
          = lower(regexp_replace(btrim(m.verified_restaurant_address), '\s+', ' ', 'g'))
  )
$$;
revoke all on function public.manager_controls(text, uuid, text) from public, anon, authenticated;
grant execute on function public.manager_controls(text, uuid, text) to service_role;

-- RLS helper used by shifts_insert_owner / shifts_update_owner (policies unchanged).
-- Same signature and grants as before; only the body changes.
create or replace function public.manager_can_staff(p_server_id uuid, p_restaurant text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.manager_controls(auth.uid()::text, p_server_id, p_restaurant)
$$;

commit;

-- Verify after running (expected values recorded in docs/VERIFIED_MANAGERS.md):
--   select md5(prosrc) from pg_proc where proname in ('manager_can_staff','manager_controls');
--   select has_function_privilege('anon','public.manager_controls(text,uuid,text)','execute');          -- false
--   select has_function_privilege('authenticated','public.manager_controls(text,uuid,text)','execute'); -- false
--   select count(*) from public.restaurant_managers where verified_at is not null;                     -- 0
