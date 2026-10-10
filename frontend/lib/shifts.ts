// Shared rules for "is this server on shift right now?" on public pages.
//
// On-shift status comes from `shifts` (is_active = true), the same source the
// manager dashboard toggle and the server "go on shift" button write. Do NOT use
// `server_restaurants.currently_working` for it: that is an employment flag
// ("works here") and is true for every current staff member all day.
//
// Shifts are never ended when the browser-side QR expires, and the hourly
// /api/cleanup-shifts job closes them only if it runs, so an is_active row can
// stay true for months. Public pages therefore also require the shift to have
// started within ACTIVE_SHIFT_WINDOW_MS. 12 hours matches /api/cleanup-shifts,
// /restaurant/[id]/tonight and /venue/[name], and covers the 8-hour QR plus doubles.
export const ACTIVE_SHIFT_WINDOW_MS = 12 * 60 * 60 * 1000

/** ISO timestamp for `.gte('started_at', ...)` on active-shift queries. */
export function activeShiftSince(now: number = Date.now()): string {
  return new Date(now - ACTIVE_SHIFT_WINDOW_MS).toISOString()
}

/** Case/whitespace-insensitive venue name key (shift and staff rows are free text). */
export function venueKey(name: string | null | undefined): string {
  return (name ?? '').trim().replace(/\s+/g, ' ').toLowerCase()
}
