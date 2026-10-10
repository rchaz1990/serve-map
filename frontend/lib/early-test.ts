// First Stranger Test scope (founder decision, 2026-10-10): scan a worker's QR code →
// sign up → agree → rate. Everything below is paused for that test.
//
// The database refuses new follows, vibe reports and venue comments for every role
// (migration 43_scope_lock.sql); this file only hides the controls and stops the server
// routes early. Re-enabling a feature needs a new migration AND a code change, both under
// founder approval. There is deliberately no runtime switch.
export const PAUSED = {
  follows: true,
  shiftEmails: true,
  vibeReports: true,
  venueComments: true,
  // No QR-scan record before (or without) agreement: /api/track-scan stores nothing and
  // the page-view beacon skips /scan/ paths.
  qrScanTracking: true,
} as const

export const PAUSED_MESSAGE = 'Not available during the early test.'
