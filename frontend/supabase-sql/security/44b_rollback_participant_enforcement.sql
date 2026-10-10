-- Rollback for 44b_participant_enforcement.sql. Run BEFORE rolling the app back.
-- Restores the 2026-10-10 legal version and removes the participant gates and visibility rules.
-- Changes no rows; recorded agreements and the log stay.

begin;

do $$
begin
  if not exists (select 1 from pg_policy where polrelid = 'public.servers'::regclass and polname = 'servers_hide_nonparticipants') then
    raise exception '44b is not applied; nothing to roll back';
  end if;
end $$;

drop policy if exists servers_hide_nonparticipants on public.servers;
drop policy if exists server_restaurants_hide_nonparticipants on public.server_restaurants;
drop policy if exists shifts_hide_nonparticipants on public.shifts;
drop policy if exists ratings_hide_nonparticipants on public.ratings;
drop policy if exists shifts_insert_worker_participant on public.shifts;
drop policy if exists shifts_update_worker_participant on public.shifts;
drop trigger if exists ratings_require_participants on public.ratings;
drop function if exists public.ratings_require_participants();

create or replace function public.current_legal_version()
returns text
language sql
immutable
as $$ select '2026-10-10'::text $$;

commit;

notify pgrst, 'reload schema';
