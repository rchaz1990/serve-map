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
5. `POST /api/verification/submitted`: the server does not trust the upload (the signed URL can
   be used without the browser). It downloads the file, checks size and type by content, then
   **decodes and re-encodes it server-side with sharp** (EXIF orientation applied; no EXIF, XMP,
   ICC, IPTC, comments, PNG text chunks or trailing data; `limitInputPixels` 9 MP; max 3000 px per
   side), overwrites the stored file with the cleaned bytes and checks the overwrite. Anything that
   fails is rejected automatically (`unsupported` / `unreadable`) and deleted at once (confirmed).
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

## Sweep (`POST /api/verification-sweep`; `Authorization: Bearer <CRON_SECRET_KEY>` only)
POST only (no GET, no `?key=`). Expires overdue invites and uploads (unreviewed submissions after
24 h; files deleted), retries pending deletions, clears unused continuation links, and deletes
files no record points at (e.g. an upload completed after a withdrawal with a still-valid 2-hour
upload link) once older than 3 h — **at most 100 per run, each deletion confirmed** (only
confirmed deletions are counted; unconfirmed ones stay for the next run). Body
`{"dryRun": true}` reports what would happen and changes nothing. Returns counts only. Needs a
schedule (existing cron caller) before production; not part of this work.

## Production guard and kill switch
Every verification route, internal route and the sweep return 503, before any database,
storage or auth call, unless one of:
- **Production:** `VERCEL_ENV === 'production'` **and** `SLATE_VERIFICATION_ENABLED === '1'`.
  Missing, `0` or anything else → off. Default off; set it only when the founder approves.
- **Local test:** `SLATE_VERIFICATION_LOCAL_TEST === '1'`, **not** on Vercel (`VERCEL` and
  `VERCEL_ENV` unset — Vercel sets them on every Preview/Development build), **and** the Supabase
  URL is `localhost`/`127.0.0.1`. Any other Supabase URL refuses, whatever `NODE_ENV` is.
The guard and the verification clients read the same runtime environment (never a build-time
copy). Tested (`verification.test.js` G1–G5, with gateway request counters showing no calls).

## Data kept (migration 45, proposed, not run in production)
`employment_verifications`: random id, status, current secret hash + expiry (cleared when used),
consent time + version, temporary random file name, upload/submission times, role category,
venue, borough, evidence type, decision time, reviewer id, deletion time, reason code, 18+
attestation time. No name, email, contact, document, document hash, extracted text or notes.
Row security forced; no app-user access; forward-only status changes and final decisions
enforced by a trigger. Private bucket `employment-verification` (4 MB, JPEG/PNG, no storage
policies → service role only). The rollback refuses while any file exists; with the bucket empty
it sets `storage.allow_delete_query = 'true'` (transaction-local) to pass hosted Supabase's
`protect_delete` triggers, which the local stand-in reproduces.

## Logging
Never log or return file contents, file names, storage paths/URLs, secrets or hashes, image
metadata or reviewer judgments. Errors log `[verification] <code> [<record id>]` only.
`/verify` is excluded from page-view tracking. Tested (`verification.test.js` L1–L2).

## Known limitations (local build)
- Storage is emulated locally (gateway); Supabase's own behaviour (deletion, overwrite/versions,
  logs, CDN) must be confirmed separately. Supabase signed upload links last 2 hours (not
  configurable). The sanitised file overwrites the original at the same path; whether the
  provider keeps the overwritten bytes is part of blocker 4.
- `sharp` is now a direct dependency (it was already installed as Next.js's optional image
  dependency, same version 0.34.5).
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
