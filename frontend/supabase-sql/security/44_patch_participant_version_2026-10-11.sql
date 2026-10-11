-- 44 patch: participant version 2026-10-13 → 2026-10-11 (founder decision 2026-10-11:
--     publish on the actual release date). NOT YET RUN IN PRODUCTION — needs founder approval.
--
-- Migration 44 went live with current_participant_version() = '2026-10-13'. The PR-B app,
-- both information sheets and 44b now use '2026-10-11'. This replaces only that one constant
-- function. CREATE OR REPLACE keeps its owner and grants. Deletes nothing; changes no rows.
--
-- Order: AFTER 44, BEFORE deploying the PR-B app (otherwise every agreement fails closed
-- with 'participant: version_mismatch'), and before 44b.
-- Refuses if anything has already been recorded against the old version.
-- Rollback: 44_patch_rollback_participant_version.sql (same guards, restores '2026-10-13').

begin;

do $$
begin
  if to_regprocedure('public.current_participant_version()') is null then
    raise exception '44 is not applied; stopping';
  end if;
  if public.current_participant_version() <> '2026-10-13' then
    raise exception 'expected participant version 2026-10-13, found %; stopping', public.current_participant_version();
  end if;
  if exists (select 1 from pg_policy where polrelid = 'public.servers'::regclass and polname = 'servers_hide_nonparticipants') then
    raise exception '44b is already applied; stopping';
  end if;
  if exists (select 1 from public.participant_consent_events) then
    raise exception 'participant agreements already recorded; stopping';
  end if;
  if exists (select 1 from auth.users where raw_app_meta_data ? 'participant_guest_version'
                                         or raw_app_meta_data ? 'participant_worker_version') then
    raise exception 'an account already holds a participant version; stopping';
  end if;
end $$;

create or replace function public.current_participant_version()
returns text
language sql
immutable
as $$ select '2026-10-11'::text $$;

commit;

notify pgrst, 'reload schema';

-- Verify after running (read-only):
--   select public.current_participant_version();                                                     -- 2026-10-11
--   select has_function_privilege('anon','public.current_participant_version()','EXECUTE');           -- true (unchanged)
--   select count(*) from public.participant_consent_events;                                            -- 0
