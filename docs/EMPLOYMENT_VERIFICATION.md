# Employment verification (PROVISIONAL → VERIFIED TESTER)

**Status: local development only. Not approved for production use.** Founder authorization
2026-10-11 covers building and testing locally with synthetic documents only. No real documents,
candidates, venues, production changes, deploys or merges.

## Flow
1. A named verifier creates a single-use invite (`/internal/verification`). The link is
   `/verify#<secret>`; the secret is in the URL fragment, which browsers never send to servers.
   Only its SHA-256 hash is stored. Invite expiry: 72 h.
2. The candidate reads what is checked, what to send, what to redact, and how the image is
   deleted, and ticks the **separate verification consent** (versioned; draft pending Vera).
3. The candidate picks a PNG/JPEG. The browser re-encodes it (drops EXIF/GPS and text chunks),
   shows the exact preview, and requires "I have redacted everything on the list".
4. `POST /api/verification/upload-url` consumes the invite (single use), records consent and
   issues a one-time Supabase signed upload link for a random file name (`<uuid>.png|jpg`).
   The browser uploads directly to the private bucket. A receipt secret replaces the invite.
5. `POST /api/verification/submitted`: the server checks the stored file (exists, ≤ 4 MB, real
   JPEG/PNG by content). A bad file is rejected automatically (`unsupported`) and deleted at once.
6. The verifier views the image through `/api/internal/verification/file` (no public or signed
   download link, `no-store`, inline) and records **verified** (role category, venue, borough,
   evidence type) / **not verified** (reason code only) / **withdrawn**.
7. In the same request the file is deleted through the Storage API and the deletion is
   **confirmed** (the file can no longer be fetched and its `storage.objects` row is gone). Only
   then are `deleted_at` set and `object_path` cleared; otherwise the record shows "deletion
   pending" and the sweep retries.
8. Verified only: a continuation link leads to the **separate 18+ attestation** (Vera's exact
   wording, unticked checkbox, timestamp only — no DOB, no ID), then to the early-test
   information and participant agreement (existing flow, unchanged).

The candidate can withdraw until a decision; any file is deleted at once.

## Sweep (`POST /api/verification-sweep`, cron secret, exact `Bearer `)
Expires overdue invites and uploads (unreviewed submissions after 24 h; files deleted), retries
pending deletions, clears unused continuation links, and deletes files no record points at
(e.g. an upload completed after a withdrawal with a still-valid 2-hour upload link), once older
than 3 h. Returns counts only. Needs a schedule (existing cron caller) before production.

## Production guard
Every verification route, internal route and the sweep return 503 unless
`VERCEL_ENV === 'production'`, or `SLATE_VERIFICATION_LOCAL_TEST=1` **and** the process is not on
Vercel (`VERCEL`/`VERCEL_ENV` unset). Vercel sets those on every Preview/Development build, so
the local setting cannot take effect there. Tested (`verification.test.js` G1).

## Data kept (migration 45, proposed, not run in production)
`employment_verifications`: random id, status, current secret hash + expiry (cleared when used),
consent time + version, temporary random file name, upload/submission times, role category,
venue, borough, evidence type, decision time, reviewer id, deletion time, reason code, 18+
attestation time. No name, email, contact, document, document hash, extracted text or notes.
Row security forced; no app-user access; forward-only status changes and final decisions
enforced by a trigger. Private bucket `employment-verification` (4 MB, JPEG/PNG, no storage
policies → service role only).

## Logging
Never log or return file contents, file names, storage paths/URLs, secrets or hashes, image
metadata or reviewer judgments. Errors log `[verification] <code> [<record id>]` only.
`/verify` is excluded from page-view tracking. Tested (`verification.test.js` L1–L2).

## Known limitations (local build)
- Storage is emulated locally (gateway); Supabase's own behaviour (deletion, logs, CDN) must be
  confirmed separately. Supabase signed upload links last 2 hours (not configurable).
- Supabase/Vercel request logs record request paths: storage paths (random UUIDs) and the
  upload link's token appear in Supabase's own storage request logs.
- Screenshots on the reviewer's device cannot be prevented technically (policy only).
- The verification record is not linked to the candidate's later Slate account, and the
  participant agreement does not yet require a verified record (founder decisions).
- Wording other than the 18+ attestation is a draft pending Vera; the Privacy Policy is unchanged.

## Production blockers (all open)
1. Read-only Vercel re-check: production secrets Production-only; no live non-production
   deployments; Ignored Build Step enabled.
2. Founder decision and plan for service-role key rotation.
3. Vera-approved verification/privacy copy (and Privacy Policy update).
4. Written confirmation of Supabase deleted-file retention behaviour.
5. Synthetic production dry run (migration 45 + deploy, each with founder approval).
6. Separate founder approval to begin real outreach/verification.
