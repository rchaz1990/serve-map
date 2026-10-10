# Stranger Test release: one version, one deploy

**Status:** prepared 2026-10-09. Nothing merged, deployed or run. Every step needs founder approval.

## Policy version and effective date

| Item | Approach |
|---|---|
| Version | One Terms/Privacy version for the whole release (#36, #46, #42, #47, #48). Nobody is asked to accept twice. |
| Setting it | Immediately before deployment, run `node frontend/scripts/legal-version.mjs set YYYY-MM-DD` with the **publication date**. It sets `LEGAL_VERSION` and migration 39's `current_legal_version()` together. `check --release` refuses anything that isn't a real date, or values that differ. No date is set yet. |
| Display | Terms and Privacy show "Effective <date>", derived from that one value. |
| Safety check | Tests fail if the app value and migration 39's value differ (participation P35). |
| Why it is safe | No account has accepted any version yet (0 on 2026-10-09). |
| Deploy shape | Ship all five PRs as **one release merge**, so only one deploy happens. Each squash merge to `main` deploys on Vercel; merging the PRs one by one would publish intermediate texts. |

## Deployment order

0. **Preconditions**
   - `main` is still `e3157a8`.
   - The release branch is green on the local stack and on a Vercel preview.
   - The founder has taken a manual database dump. The project is on Supabase's **Free plan**, which has no restorable project backups. The founder runs the dump; the database password is never shared in chat.
1. **Migration 38** (follow email consent), run immediately before step 2.
   - Until step 2 deploys, new follows made with the old code are refused, because they have no recorded agreement. Old shift emails still go out.
   - Keep this window to minutes.
2. **Merge the release PR** (#36 → #46 → #42 → #47 → #48 squashed in that order, with the version set). This is one Vercel deploy.
   - Check `/terms`, `/privacy` (same "Effective" date), `/reset-password`, guest and worker signup, rating, follow, and the dashboard agreement step.
   - Rollback: Vercel instant rollback. 38 can stay; the old code works with it.
3. **Migration 39**, right after step 2 is verified. It must not run earlier: the old code still sends coordinates and has no worker agreement step.
4. **Migration 40**, hiding the 2 profiles without an account. It's independent of the code; run after 39.
4b. **Migration 41** (points ledger: no worker email on new credits; email cleared on worker deletion). Independent of the code; it must be installed before the first worker deletion, because the deletion script stops without it. The Privacy Policy text assumes it.
5. **Supabase Auth settings** from #42's `EMAIL_VERIFICATION_ROLLOUT.md`.
6. **Live checks, with separate approval:**
   - one password reset on the test account;
   - one observed signup, scan, rating and follow.
- **Not in this release:** `manual/location_coordinate_cleanup.sql` (not approved).

Each migration's rollback file is in `frontend/supabase-sql/security/`. Rolling back a migration together with its code returns to the previous behaviour, and no data is lost.

## Points ledger: email retention

| Finding | Detail |
|---|---|
| What the email is | `serve_ledger.email` holds the **worker's** email on `rating` credits (2 rows today). |
| Who can read it | Readable only by the service role. Nothing in the app reads it. Rows link to the profile by `account_id`. |
| Conflict with deletion | After a worker is deleted, the email is the only direct identifier left. It isn't needed: points are no-cash-value and `account_id` already links each row. The Privacy Policy discloses that it is kept, so there's no false statement, but it falls short of "delete my personal data". |

**Implemented in draft as migration 41 (not run):**
1. New worker credits are stored without an email, through an insert trigger. `submit_rating_reward` is unchanged.
2. `redact_ledger_email(account_id)` is service-only. It may set `email` to `NULL`, and nothing else. The append-only trigger allows that one change only inside the function, and still refuses every other update and every delete. Tested.
3. Existing rows keep their email until a verified worker deletion clears it.

**Risks:** the append-only trigger function is replaced (pre-checked against production's md5, and the rollback restores the original exactly). Anyone with the database owner role could already bypass triggers, so this adds no new power.

## Shift location check: 0 of 57 passed (separate fix, not in #48)

**Cause, read-only:**
- All 29 shifts with coordinates are from **April–June 2026**. Their `distance_meters` is always empty, meaning the venue lookup failed every time.
- Before PR #34 (merged Oct 6), the dashboard used Google's Geocoding web service from the browser, which rejects website-restricted keys.
- Since #34, there has been no worker-started shift with location: only 2 shifts, both manager-started, which have no location check.
- The fix is unproven in production. It also looks up the venue by its **name** (with " NYC" as fallback) rather than the stored `restaurant_address`, which is ambiguous for common names.

**Recommended narrow fix (separate PR, after the release):**
- Look up the venue by `server_restaurants.restaurant_address` first, and fall back to the name.
- Confirm with one observed worker shift.

**Why it can wait:**
- Nothing shows a shift's check result.
- The Privacy Policy describes the check, not its success.
- It doesn't block participant safety or accurate disclosure.

## Provider facts to confirm before publication

The Privacy Policy wording avoids promising any period. These are confirmations, not blockers to the wording:

| Provider | To confirm |
|---|---|
| Supabase (Free plan) | Whether it keeps any internal backups or log copies, and for how long |
| Vercel | Runtime and request log retention on the current plan |
| Resend | Retention of sent-email logs and recipient data |
| Beehiiv | Subscriber data retention after unsubscribe or removal |
| Google Maps | Venue lookups send venue names or addresses only, never user location (checked in code) |
