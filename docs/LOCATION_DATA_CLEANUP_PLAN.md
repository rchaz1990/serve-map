# Stored location coordinates: cleanup plan (not approved)

**Status:** prepared for separate review. Nothing has been changed or deleted.

## What exists (read-only check, 2026-10-09)

| Table | Rows with stored coordinates | Location check passed | Who can read the coordinates |
|---|---|---|---|
| `vibe_reports` | 152 of 185 (Apr 13 – Oct 2) | 123 | service role only |
| `shifts` | 29 of 57 (Apr 11 – Oct 8) | 0 | service role only |

- No page, API route, function or view reads `user_lat` or `user_lng`. Every feature uses only `gps_verified` and `distance_meters`.
- The shift location check has never passed: 0 of 57 shifts. The venue is looked up by its name, which seems to fail. So the stored shift coordinates added nothing.

## Sequence

1. Deploy the code that stops storing new coordinates (this PR). Confirm that no new row has coordinates:
   ```sql
   select max(created_at) from vibe_reports where user_lat is not null;
   select max(started_at) from shifts where user_lat is not null;
   ```
2. Run migration 39. App users can then no longer write coordinates on shifts.
3. **With separate founder approval**, run `frontend/supabase-sql/manual/location_coordinate_cleanup.sql`.
   - It clears `user_lat`/`user_lng` on both tables.
   - It stops without changes if the row counts differ from the expected 152 and 29. Update those numbers from step 1 first.
   - `gps_verified`, `distance_meters` and `integrity_score` are kept.
4. Update the Privacy Policy sentence about older records once this is done ("may still include coordinates… reviewing them for deletion").

## Implications

| Area | Effect |
|---|---|
| Reversibility | Can't be undone. The project is on Supabase's Free plan, so there is no project backup we can restore. **Do not export the coordinates first**: an export would be another copy to protect. |
| Features | None affected. Badges, rewards and integrity scores use the stored result. |
| Provider copies | Any copies Supabase keeps follow its own retention practices, which are not confirmed. The Privacy Policy describes this without promising a period. |
| Rollback | Not applicable to the cleanup itself. Migration 39 has its own rollback, which restores grants only. |
