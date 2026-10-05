-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New Query)
-- BEFORE deploying the code that uses it. Safe to run more than once.
--
-- Minimal instrumentation for the real-user stranger test:
--   1. qr_scans table — one row per QR scan page load
--   2. ratings.guest_id — auth user ID of signed-in raters (fixes "My Ratings")
--   3. is_test flags — exclude founder / demo activity from analysis

-- ── 1. QR scans ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS qr_scans (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id   uuid NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  session_id  text NOT NULL,              -- anonymous per-browser ID, no login needed
  scanned_at  timestamptz NOT NULL DEFAULT now(),
  is_test     boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS qr_scans_server_scanned_idx ON qr_scans (server_id, scanned_at);

-- Written only by the /api/track-scan route (service role). No public policies:
-- anonymous/logged-in browsers can neither read nor write this table directly.
ALTER TABLE qr_scans ENABLE ROW LEVEL SECURITY;

-- ── 2. Rating attribution ───────────────────────────────────────────────────
ALTER TABLE ratings ADD COLUMN IF NOT EXISTS guest_id uuid;   -- null = anonymous rating
CREATE INDEX IF NOT EXISTS ratings_guest_id_idx ON ratings (guest_id);

-- ── 3. Test / demo exclusion ────────────────────────────────────────────────
-- servers.is_test: set true on founder / demo worker profiles. Excludes everything
--   keyed to that worker (shifts, scans, ratings, follows, notifications).
-- qr_scans.is_test / ratings.is_test: set automatically when the scan/rating comes
--   from a device in test mode (open any /scan/<id>?test=1 link once on that phone;
--   ?test=0 turns it off). Covers the founder scanning a real worker's QR.
ALTER TABLE servers ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;
ALTER TABLE ratings ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;

-- Mark your own / demo worker profiles (edit the emails, then run):
-- UPDATE servers SET is_test = true WHERE email IN ('you@example.com', 'demo@example.com');

-- ── Example analysis queries (real activity only) ───────────────────────────
-- Scans per real worker, with first-time vs repeat browsers:
-- SELECT s.server_id, count(*) AS scans, count(DISTINCT s.session_id) AS unique_browsers
-- FROM qr_scans s JOIN servers w ON w.id = s.server_id
-- WHERE NOT s.is_test AND NOT w.is_test
-- GROUP BY s.server_id;
--
-- Ratings from real guests on real workers (also drops ratings made while signed in
-- as a test worker account, since guest_id = that account's auth ID):
-- SELECT r.* FROM ratings r JOIN servers w ON w.id = r.server_id
-- WHERE NOT r.is_test AND NOT w.is_test
--   AND (r.guest_id IS NULL OR r.guest_id::text NOT IN
--        (SELECT wallet_address FROM servers WHERE is_test AND wallet_address IS NOT NULL));
