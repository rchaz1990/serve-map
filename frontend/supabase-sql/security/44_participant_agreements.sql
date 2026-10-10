-- 44: Early-test participant agreements — records and checks (step B1 — additive, before the app).
--     NOT YET RUN IN PRODUCTION — needs founder approval. Deletes nothing. Blocks nothing yet.
--
-- Separate, versioned guest and worker participant agreements (Vera's final documents),
-- distinct from the Terms/Privacy acknowledgment. See docs/EARLY_TEST_ACCEPTANCE_CRITERIA.md.
--
-- What it does:
--   1. participant_consent_events: append-only log (account id, role, action, version, time).
--      No app-user access; even the service role can only insert and read (no update/delete).
--      No foreign key to accounts, so minimal consent records survive account deletion
--      (kept 12 months after deletion, provisional; purging is a separate approved procedure).
--   2. current_participant_version() = '2026-10-13' (one date with the legal version).
--   3. participant_ok(account, role) / worker_participant_ok(server) / server_visible_in_test(server):
--      true/false only, read the account record directly (never the sign-in token), so a
--      withdrawal takes effect immediately.
--   4. record_participant_event(account, role, action, version): the ONLY writer. Atomically
--      logs the event and updates the account record (app_metadata):
--        accept    → participant_<role>_version, participant_<role>_at   (version must be current)
--        withdraw  → removes participant_<role>_version, sets participant_<role>_withdrawn_at;
--                    a worker's active shifts end
--        remain_yes / remain_no → participant_remain (true/false), participant_remain_at
--      Service role only (called by /api/participant).
--
-- Order: run BEFORE deploying the PR-B app. Enforcement is 44b, after the app.
-- Rollback: 44_rollback_participant_agreements.sql (refuses while 44b is applied; keeps the log).

begin;

do $$
begin
  if to_regprocedure('public.record_participant_event(uuid,text,text,text)') is not null then
    raise exception '44 already applied; stopping';
  end if;
  if to_regprocedure('public.my_ratings()') is null then
    raise exception '43 must be applied first; stopping';
  end if;
end $$;

-- 1. Append-only log
-- Kept by the rollback (consent records are retained), so re-applying reuses it.
create table if not exists public.participant_consent_events (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  role text not null check (role in ('guest', 'worker', 'account')),
  action text not null check (action in ('accept', 'withdraw', 'remain_yes', 'remain_no')),
  version text,
  created_at timestamptz not null default now()
);
create index if not exists participant_consent_events_user_idx on public.participant_consent_events (user_id, created_at);
alter table public.participant_consent_events enable row level security;
alter table public.participant_consent_events force row level security;
revoke all on public.participant_consent_events from public, anon, authenticated, service_role;
grant select, insert on public.participant_consent_events to service_role;
drop policy if exists participant_consent_events_service on public.participant_consent_events;
create policy participant_consent_events_service on public.participant_consent_events
  for all to service_role using (true) with check (true);

create or replace function public.participant_consent_events_append_only()
returns trigger
language plpgsql
as $$
begin
  raise exception 'participant_consent_events is append-only';
end;
$$;
drop trigger if exists participant_consent_events_append_only on public.participant_consent_events;
create trigger participant_consent_events_append_only before update or delete on public.participant_consent_events
  for each row execute function public.participant_consent_events_append_only();

-- 2. Version
create or replace function public.current_participant_version()
returns text
language sql
immutable
as $$ select '2026-10-13'::text $$;

-- 3. Checks (true/false only)
create or replace function public.participant_ok(p_user uuid, p_role text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select u.raw_app_meta_data ->> ('participant_' || p_role || '_version') = public.current_participant_version()
    from auth.users u where u.id = p_user
  ), false)
$$;

create or replace function public.worker_participant_ok(p_server_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.servers s
    join auth.users u on u.id::text = s.wallet_address
    where s.id = p_server_id
      and u.raw_app_meta_data ->> 'participant_worker_version' = public.current_participant_version()
  )
$$;

-- Visible during the test: the worker participates, or the viewer owns the profile.
create or replace function public.server_visible_in_test(p_server_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.worker_participant_ok(p_server_id)
      or exists (select 1 from public.servers s where s.id = p_server_id and s.wallet_address = auth.uid()::text)
$$;

-- Supabase grants EXECUTE on new public functions to anon/authenticated by default: revoke explicitly.
revoke all on function public.participant_ok(uuid, text) from public, anon, authenticated;
revoke all on function public.worker_participant_ok(uuid) from public;
revoke all on function public.server_visible_in_test(uuid) from public;
grant execute on function public.current_participant_version() to anon, authenticated, service_role;
grant execute on function public.participant_ok(uuid, text) to service_role;
grant execute on function public.worker_participant_ok(uuid) to anon, authenticated, service_role;
grant execute on function public.server_visible_in_test(uuid) to anon, authenticated, service_role;

-- 4. The only writer
create or replace function public.record_participant_event(p_user uuid, p_role text, p_action text, p_version text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_meta jsonb;
  v_now text := to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
begin
  select raw_app_meta_data into v_meta from auth.users where id = p_user for update;
  if not found then raise exception 'participant: account not found'; end if;
  v_meta := coalesce(v_meta, '{}'::jsonb);

  if p_action in ('accept', 'withdraw') and p_role not in ('guest', 'worker') then
    raise exception 'participant: bad role';
  end if;
  if p_role = 'worker' and not exists (select 1 from public.servers where wallet_address = p_user::text) then
    raise exception 'participant: no worker profile';
  end if;

  if p_action = 'accept' then
    if p_version is distinct from public.current_participant_version() then
      raise exception 'participant: version_mismatch';
    end if;
    v_meta := v_meta || jsonb_build_object('participant_' || p_role || '_version', p_version,
                                           'participant_' || p_role || '_at', v_now);
  elsif p_action = 'withdraw' then
    v_meta := (v_meta - ('participant_' || p_role || '_version'))
              || jsonb_build_object('participant_' || p_role || '_withdrawn_at', v_now);
    if p_role = 'worker' then
      update public.shifts set is_active = false, ended_at = now()
      where is_active and server_id in (select id from public.servers where wallet_address = p_user::text);
    end if;
  elsif p_action in ('remain_yes', 'remain_no') then
    if not (v_meta ? 'participant_guest_at' or v_meta ? 'participant_worker_at') then
      raise exception 'participant: not a participant';
    end if;
    p_role := 'account';
    v_meta := v_meta || jsonb_build_object('participant_remain', p_action = 'remain_yes', 'participant_remain_at', v_now);
  else
    raise exception 'participant: bad action';
  end if;

  update auth.users set raw_app_meta_data = v_meta where id = p_user;
  insert into public.participant_consent_events (user_id, role, action, version)
    values (p_user, p_role, p_action, case when p_action = 'accept' then p_version end);
  return v_meta;
end;
$$;
revoke all on function public.record_participant_event(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.record_participant_event(uuid, text, text, text) to service_role;
revoke all on function public.participant_consent_events_append_only() from public, anon, authenticated;

commit;

notify pgrst, 'reload schema';

-- Verify after running (read-only):
--   select public.current_participant_version();                                                   -- 2026-10-13
--   select has_table_privilege('authenticated','public.participant_consent_events','SELECT');        -- false
--   select has_function_privilege('authenticated','public.record_participant_event(uuid,text,text,text)','EXECUTE'); -- false
--   select count(*) from public.participant_consent_events;                                          -- 0
