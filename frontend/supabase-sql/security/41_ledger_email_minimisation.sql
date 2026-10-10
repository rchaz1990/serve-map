-- 41: Points ledger — stop storing worker email on new credits; allow clearing it on a
--     verified worker deletion. NOT YET RUN IN PRODUCTION — needs founder approval.
--
-- serve_ledger stays append-only: rows are never deleted, and amounts, dates, sources and
-- balances can never change. The only change ever allowed is setting `email` to NULL, and
-- only inside public.redact_ledger_email(), which is callable by the service role only.
--
--   1. New credits for a worker profile (account_type 'server' with an account_id) are
--      stored without an email (BEFORE INSERT trigger). account_id already links the row.
--      submit_rating_reward is not changed.
--   2. redact_ledger_email(account_id): clears email on that profile's rows; returns the
--      number of rows changed. Used by the participant deletion runbook.
--   3. The append-only trigger accepts that single change (email → NULL, every other column
--      identical) only while the function sets a transaction-local flag; everything else is
--      still refused, for every role.
--
-- Independent of the app code; can run any time before the first deletion request.
-- Rollback: 41_rollback_ledger_email_minimisation.sql

begin;

do $$
begin
  if (select md5(prosrc) from pg_proc where oid = 'public.serve_ledger_append_only()'::regprocedure)
     is distinct from 'f05544d2b4738f0ef3e79b9a2f830283' then
    raise exception 'serve_ledger_append_only is not the expected version; stopping';
  end if;
end $$;

create or replace function public.serve_ledger_append_only()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE'
     and current_setting('slate.ledger_redact_email', true) = 'on'
     and old.email is not null and new.email is null
     and (to_jsonb(new) - 'email') = (to_jsonb(old) - 'email') then
    return new;
  end if;
  raise exception 'serve_ledger is append-only';
end;
$$;

create or replace function public.serve_ledger_no_worker_email()
returns trigger
language plpgsql
as $$
begin
  if new.account_type = 'server' and new.account_id is not null then
    new.email := null;
  end if;
  return new;
end;
$$;
create trigger serve_ledger_no_worker_email before insert on public.serve_ledger
  for each row execute function public.serve_ledger_no_worker_email();

create or replace function public.redact_ledger_email(p_account_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare n integer;
begin
  perform set_config('slate.ledger_redact_email', 'on', true);
  update public.serve_ledger set email = null
   where account_type = 'server' and account_id = p_account_id and email is not null;
  get diagnostics n = row_count;
  perform set_config('slate.ledger_redact_email', 'off', true);
  return n;
end;
$$;
revoke all on function public.redact_ledger_email(uuid) from public, anon, authenticated;
grant execute on function public.redact_ledger_email(uuid) to service_role;

commit;

-- Verify after running (read-only):
--   select has_function_privilege('authenticated','public.redact_ledger_email(uuid)','execute');  -- false
--   select count(*), sum(amount) from public.serve_ledger;                                       -- unchanged
