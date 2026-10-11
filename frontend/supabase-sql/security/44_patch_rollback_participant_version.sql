-- Rollback for 44_patch_participant_version_2026-10-11.sql: restores '2026-10-13'.
-- Only valid before any agreement is recorded and before 44b (same guards as the patch).
-- Roll the app back first if the PR-B app (which sends '2026-10-11') is deployed.

begin;

do $$
begin
  if public.current_participant_version() <> '2026-10-11' then
    raise exception 'patch is not applied (found %); nothing to roll back', public.current_participant_version();
  end if;
  if exists (select 1 from pg_policy where polrelid = 'public.servers'::regclass and polname = 'servers_hide_nonparticipants') then
    raise exception '44b is applied; run its rollback first';
  end if;
  if exists (select 1 from public.participant_consent_events) then
    raise exception 'participant agreements already recorded against 2026-10-11; stopping';
  end if;
end $$;

create or replace function public.current_participant_version()
returns text
language sql
immutable
as $$ select '2026-10-13'::text $$;

commit;

notify pgrst, 'reload schema';
