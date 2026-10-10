-- 43b: The rating's account identifier is not public (step A3 — after the PR-A app deploy).
--     NOT YET RUN IN PRODUCTION — needs founder approval. Deletes nothing.
--
-- ratings.guest_id (the rater's account id) was readable by anyone through the data API.
-- After this, app users (anon, authenticated) cannot select, filter, sort or embed it.
-- Server code (service role) still writes and reads it; "My Ratings" uses my_ratings() (43).
-- See docs/EARLY_TEST_ACCEPTANCE_CRITERIA.md (S1–S5).
--
-- Order: only AFTER the PR-A app is deployed (the old app filtered "My Ratings" by guest_id).
-- Rollback: 43b_rollback_rating_identifier_private.sql — run it BEFORE any app rollback.

begin;

do $$
begin
  if to_regprocedure('public.my_ratings()') is null then
    raise exception '43 must be applied first; stopping';
  end if;
  if has_table_privilege('anon', 'public.ratings', 'SELECT')
     or has_table_privilege('authenticated', 'public.ratings', 'SELECT') then
    raise exception 'unexpected table-level SELECT on ratings (a column revoke would not take effect); stopping';
  end if;
  if not has_column_privilege('anon', 'public.ratings', 'guest_id', 'SELECT') then
    raise exception '43b already applied; stopping';
  end if;
end $$;

revoke select (guest_id) on public.ratings from anon, authenticated;

commit;

-- Verify after running (read-only):
--   select has_column_privilege('anon','public.ratings','guest_id','SELECT');           -- false
--   select has_column_privilege('authenticated','public.ratings','guest_id','SELECT');  -- false
--   select has_column_privilege('anon','public.ratings','score','SELECT');              -- true
