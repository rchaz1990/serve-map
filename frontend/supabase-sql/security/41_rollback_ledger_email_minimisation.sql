-- Rollback for 41: restores the original append-only trigger and stops the email trigger.
-- Emails already cleared stay cleared (nothing to restore them from).
begin;
drop trigger if exists serve_ledger_no_worker_email on public.serve_ledger;
drop function if exists public.serve_ledger_no_worker_email();
drop function if exists public.redact_ledger_email(uuid);
create or replace function public.serve_ledger_append_only()
returns trigger
language plpgsql
as $$
BEGIN
  RAISE EXCEPTION 'serve_ledger is append-only';
END;
$$;
commit;
