-- Do not run until every (server_id, follower_id) pair is unique.
-- Two other follower ids still have duplicate pending rows; applying this
-- index against the live database will fail until those are cleaned up.

create unique index if not exists follows_server_follower_uidx
  on public.follows (server_id, follower_id);
