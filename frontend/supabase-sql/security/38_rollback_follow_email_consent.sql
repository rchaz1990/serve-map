-- Rollback for 38_follow_email_consent.sql. Also revert the matching app code
-- (notify-followers uses notification_recipients and follows.notify_email).
-- WARNING: discards recorded email opt-ins. Restores the original weakness
-- (client-supplied follower_email is stored and emailed).
begin;
drop trigger if exists follows_account_email on public.follows;
drop function if exists public.follows_from_account();
drop function if exists public.notification_recipients(uuid);
revoke insert (notify_email) on public.follows from authenticated;
alter table public.follows
  drop column if exists notify_email,
  drop column if exists email_opt_in_at;
commit;
