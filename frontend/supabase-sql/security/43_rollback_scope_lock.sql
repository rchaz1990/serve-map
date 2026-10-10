-- Rollback for 43_scope_lock.sql. Run 43b's rollback FIRST (this refuses otherwise), and roll
-- the app back to a version that does not call my_ratings() before running this.
-- Removes the pause triggers, the distance trigger and my_ratings(). Deletes no data.

begin;

do $$
begin
  if to_regprocedure('public.my_ratings()') is null then
    raise exception '43 is not applied; nothing to roll back';
  end if;
  if not has_column_privilege('anon', 'public.ratings', 'guest_id', 'SELECT') then
    raise exception '43b is still applied (ratings.guest_id private); run 43b rollback first';
  end if;
end $$;

drop trigger if exists follows_early_test_paused on public.follows;
drop trigger if exists vibe_reports_early_test_paused on public.vibe_reports;
drop trigger if exists venue_comments_early_test_paused on public.venue_comments;
drop trigger if exists notifications_early_test_paused on public.notifications;
drop function if exists public.early_test_paused();
drop trigger if exists shifts_drop_distance on public.shifts;
drop function if exists public.shifts_drop_distance();
drop function if exists public.my_ratings();

commit;

notify pgrst, 'reload schema';
