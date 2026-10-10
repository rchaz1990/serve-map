-- Rollback for 44_participant_agreements.sql. Run 44b's rollback FIRST (this refuses otherwise),
-- and roll the app back to a version without /api/participant before running this.
-- KEEPS public.participant_consent_events (minimal consent records are retained); it only
-- removes the functions. Recorded agreements in account metadata are left as they are.

begin;

do $$
begin
  if exists (select 1 from pg_policy where polrelid = 'public.servers'::regclass and polname = 'servers_hide_nonparticipants') then
    raise exception '44b is still applied; run 44b rollback first';
  end if;
  if to_regprocedure('public.record_participant_event(uuid,text,text,text)') is null then
    raise exception '44 is not applied; nothing to roll back';
  end if;
end $$;

drop function if exists public.record_participant_event(uuid, text, text, text);
drop function if exists public.server_visible_in_test(uuid);
drop function if exists public.worker_participant_ok(uuid);
drop function if exists public.participant_ok(uuid, text);
drop function if exists public.current_participant_version();
-- The log table (public.participant_consent_events) and its append-only trigger are kept.

commit;

notify pgrst, 'reload schema';
