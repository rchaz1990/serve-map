-- 37: Recruiting consent protections.  NOT YET RUN IN PRODUCTION — needs approval.
-- Depends on 36 (verified managers). Does NOT change any existing worker's setting.
--
-- 1. New worker profiles are hidden from recruiters unless the worker turns it on.
-- 2. recruiting_contacts records each manager → worker recruiting email:
--    one per (manager, worker) pair, ever; at most N per manager per rolling 24 hours.
--    Enforced by claim_recruiting_contact(), callable only by the server (service role).
--
-- Delivery: the route reserves first, then sends. It records sent_at on confirmed
-- acceptance, releases (deletes) the reservation only when the provider definitely
-- rejected the message, and otherwise leaves it unresolved for manual reconciliation.
--
-- Concurrency: the function takes a per-manager transaction lock
-- (pg_advisory_xact_lock), so two simultaneous requests from the same manager run one
-- after the other: the count and the insert can't interleave, so the daily limit can't
-- be overshot. The unique (manager_id, server_id) constraint independently guarantees one
-- row per pair even if the lock were bypassed.
--
-- Rollback: 37_rollback_recruiting_consent.sql

begin;

alter table public.servers alter column open_to_opportunities set default false;

create table public.recruiting_contacts (
  id uuid primary key default gen_random_uuid(),
  manager_id uuid not null references public.restaurant_managers(id) on delete cascade,
  server_id uuid not null references public.servers(id) on delete cascade,
  created_at timestamptz not null default now(),
  -- Set only after the email provider accepted the message. NULL = reserved but not
  -- confirmed sent (in progress, or unresolved: see the runbook's reconciliation).
  sent_at timestamptz,
  provider_message_id text,
  constraint recruiting_contacts_one_per_pair unique (manager_id, server_id)
);
create index recruiting_contacts_manager_recent on public.recruiting_contacts (manager_id, created_at);

-- Server-only table: RLS on with no policies, and no privileges for app users
-- (Supabase default privileges would otherwise grant them).
alter table public.recruiting_contacts enable row level security;
revoke all on public.recruiting_contacts from anon, authenticated;
-- The contact route (service role) marks sent_at and releases rejected reservations.
grant select, update, delete on public.recruiting_contacts to service_role;

-- Returns the new contact id, or 'already_contacted' / 'daily_limit'.
create or replace function public.claim_recruiting_contact(p_manager_id uuid, p_server_id uuid, p_daily_limit integer)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_manager_id is null or p_server_id is null or p_daily_limit is null or p_daily_limit < 1 then
    raise exception 'invalid arguments';
  end if;

  perform pg_advisory_xact_lock(hashtext('recruiting_contact:' || p_manager_id::text));

  if exists (select 1 from public.recruiting_contacts
             where manager_id = p_manager_id and server_id = p_server_id) then
    return 'already_contacted';
  end if;

  if (select count(*) from public.recruiting_contacts
      where manager_id = p_manager_id and created_at > now() - interval '24 hours') >= p_daily_limit then
    return 'daily_limit';
  end if;

  insert into public.recruiting_contacts (manager_id, server_id)
  values (p_manager_id, p_server_id)
  returning id into v_id;
  return v_id::text;
end;
$$;
revoke all on function public.claim_recruiting_contact(uuid, uuid, integer) from public, anon, authenticated;
grant execute on function public.claim_recruiting_contact(uuid, uuid, integer) to service_role;

commit;

-- Verify after running:
--   select column_default from information_schema.columns
--     where table_schema='public' and table_name='servers' and column_name='open_to_opportunities';  -- false
--   select has_table_privilege('anon','public.recruiting_contacts','select'),
--          has_table_privilege('authenticated','public.recruiting_contacts','insert');                 -- f, f
--   select has_function_privilege('authenticated','public.claim_recruiting_contact(uuid,uuid,integer)','execute'); -- f
--   Full read-only check: checks/deploy_post37.sql
