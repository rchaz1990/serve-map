# Recruiting consent protections (migration 37)

Status: prepared, not deployed. Every production step needs founder approval.
**Depends on PR #44 / migration 36** (verified managers). Recruiting stays a separate
permission from venue-bound shift control and follower notifications.

## What it does
1. **Hidden by default.** New worker profiles are not visible to recruiters until the
   worker turns on "Appear in restaurant talent search". Enforced twice: the sign-up route
   sets it explicitly, and migration 37 changes the database default.
2. **One message per manager → worker, ever.** A second attempt returns 409 and sends
   nothing. Other managers are unaffected.
3. **Daily limit: 10 recruiting messages per verified manager per rolling 24 hours.**
   The 11th returns 429.
4. **Delivery is reconciled, never guessed.** The route reserves the contact, then sends
   with idempotency key `recruit/<reservation id>`:
   - provider accepted (message id) → `sent_at` + `provider_message_id` recorded;
   - provider definitely rejected (HTTP 4xx) → reservation released, manager may retry;
   - anything ambiguous (timeout, network failure, 5xx, no message id, function killed) →
     reservation **kept unresolved** (`sent_at` null), manager told not to resend,
     logged `[contact-server] RECONCILE reservation=<id> …` (ids only, no emails);
   - a failed release or failed `sent_at` update is also logged `RECONCILE`.
   Unresolved reservations count toward the limit and block a repeat (fail-safe).
   Manual reconciliation against Resend's logs: `docs/DEPLOY_RUNBOOK_VERIFIED_MANAGERS.md`.

### How concurrency is handled
`claim_recruiting_contact(manager, worker, limit)` runs inside one database transaction and
first takes a per-manager lock (`pg_advisory_xact_lock`). Two simultaneous requests from
the same manager therefore run one after the other, so "check pair → count last 24 h →
insert" cannot interleave and the limit cannot be overshot. A unique constraint on
(manager, worker) independently guarantees a single row per pair. The route claims
**before** sending (see item 4 for what happens after).
Tested: 8 simultaneous requests for one pair → exactly 1 sent; 12 simultaneous requests
to different workers → exactly 10 sent, 2 refused.

`recruiting_contacts` and the claim function are server-only (no access for app users).

## Existing workers (no change in this PR)
Read-only count of the 14 production worker profiles, using only the stored `is_test` flag:

| `is_test` | Profiles | Recruiting visible | Linked to a sign-in | Has non-test ratings |
|---|---|---|---|---|
| false | 13 | 13 | 10 | 6 |
| true | 1 | 1 | 0 | 0 |

`is_test = false` is the default, so it does not prove a profile is a real person; that
needs the founder's own knowledge. None of the 14 chose visibility — it was on by default,
and there is no record of anyone turning it on.

### Proposed consent-safe transition (separate approval)
1. Founder marks known test/team profiles (`is_test = true`) — no effect on real users.
2. Set `open_to_opportunities = false` for **all** existing profiles in one statement
   (hiding is the privacy-protective direction; nobody is exposed by it).
3. Workers see the setting on their dashboard, off, with the new explanation, and can turn
   it on. Optionally, one notice email or in-app banner explaining the change (needs
   separate approval; no contact has been made).

## Deployment sequence
Prerequisite: PR #44 merged and migration 36 run.
1. **Run `frontend/supabase-sql/security/37_recruiting_consent.sql`** (no existing worker
   setting changes), then the read-only `checks/deploy_post37.sql`: every `*_ok` true and
   the worker settings fingerprint equal to the preflight value. Full procedure, stop and
   rollback conditions: `docs/DEPLOY_RUNBOOK_VERIFIED_MANAGERS.md`.
   Rollback: `37_rollback_recruiting_consent.sql`.
   The currently deployed code ignores the new table, so this is safe on its own.
2. **Merge this PR.** If merged before step 1, recruiting messages fail closed (503) until
   37 runs; nothing else is affected.
3. **Separately approved:** the existing-worker transition above.

## Remaining risks
- The limit is per manager account; Slate verification is the control on who gets one.
- A worker's reply goes to the manager's email (reply-to) — outside Slate's limits.
- 10/day is a starting value (constant in `contact-server`); change needs a code deploy.
- Existing 14 profiles stay visible until the transition is approved.
