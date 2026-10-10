-- Rollback for 43b_rating_identifier_private.sql: makes ratings.guest_id readable again
-- (the pre-43b state). Run this BEFORE rolling the app back.

begin;

do $$
begin
  if has_column_privilege('anon', 'public.ratings', 'guest_id', 'SELECT') then
    raise exception '43b is not applied; nothing to roll back';
  end if;
end $$;

grant select (guest_id) on public.ratings to anon, authenticated;

commit;
