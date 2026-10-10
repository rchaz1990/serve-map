-- Clears stored raw coordinates from older vibe reports and shifts.
-- NOT APPROVED — prepared for separate review. See docs/LOCATION_DATA_CLEANUP_PLAN.md.
-- Cannot be undone (except from a database backup). Keeps gps_verified and distance_meters.
-- Run only after the code that stops storing coordinates is live, so no new ones appear.
--
-- Set the expected counts from the read-only check in the plan (2026-10-09: 152 and 29).
-- If they differ, nothing changes.
do $$
declare
  e_vibe int := 152;
  e_shift int := 29;
  n int;
begin
  update public.vibe_reports set user_lat = null, user_lng = null
   where user_lat is not null or user_lng is not null;
  get diagnostics n = row_count;
  if n <> e_vibe then raise exception 'vibe_reports: % rows (expected %); nothing changed', n, e_vibe; end if;

  update public.shifts set user_lat = null, user_lng = null
   where user_lat is not null or user_lng is not null;
  get diagnostics n = row_count;
  if n <> e_shift then raise exception 'shifts: % rows (expected %); nothing changed', n, e_shift; end if;
end $$;

-- Verify (read-only):
--   select count(*) from public.vibe_reports where user_lat is not null or user_lng is not null;  -- 0
--   select count(*) from public.shifts       where user_lat is not null or user_lng is not null;  -- 0
--   select count(*) filter (where gps_verified) from public.vibe_reports;                          -- unchanged
