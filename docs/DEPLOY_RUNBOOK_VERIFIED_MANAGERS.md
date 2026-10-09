# Deployment runbook — verified managers (PR #44, migration 36) and recruiting consent (PR #45, migration 37)

Status: **not approved.** Each numbered step needs founder approval. Stop at the first
failed check and report; do not improvise or retry blind.

All check queries are read-only and live in `frontend/supabase-sql/security/checks/`.
Paste a file's full contents into the Supabase SQL Editor and record the output.

## Roles and timing
- One operator does steps 3–5 back to back, with the SQL Editor open and migration 36
  pasted before step 3 starts. Quiet hour; Stranger Test stays paused.
- The old direct-database shift weakness stays open only from "step 3 Ready" to "step 4
  committed" (target: under 5 minutes).

## 1. Preconditions (stop if any is false)
- A fresh database backup has completed and been verified (founder).
- `main` is still the commit PR #44 was tested on (`1578497`). If not: rebase, re-run
  the local suites, and restart this runbook.
- PR #44 head is the reviewed commit and its Vercel preview check is green.
- Nobody else is deploying or editing the database.

## 2. Preflight (read-only)
Run `checks/deploy_preflight.sql`. Expected:

| Column | Expected |
|---|---|
| `manager_can_staff_is_current_prod` | true |
| `link_my_manager_is_current_prod` | true |
| `no_verification_columns_yet` | true |
| `no_recruiting_table_yet` | true |
| `visibility_default` | `true` |
| `manager_accounts` | 3 |
| `visible_workers` | 14/14 |
| `worker_settings_fingerprint`, `active_shifts`, `shift_policies_fingerprint` | record |

Run `checks/deploy_manager_probe.sql`. Expected today: `jobs ≥ 1`, `manager_can_staff = true`
(confirms the weakness and that the probe works). Record both outputs.

**Stop** if any expected value differs.

## 3. Deploy PR #44 (code first)
Squash-merge PR #44. Wait for the Vercel production deployment of the merge commit to be
**Ready**. Then check:
- Home page, `/dashboard`, `/restaurant/dashboard` load (HTTP 200).
- `POST /api/notify-followers` with no sign-in → 401.
- Vercel shows no new runtime errors.

The new code fails closed until 36 runs: managers see "Pending verification" with toggles
disabled; follower notifications and contact by managers are refused; workers are
unaffected.

**Stop / roll back:** build fails → nothing changed, stop. Pages error or workers can't use
the dashboard or ratings → Vercel instant rollback to the previous production deployment
(database untouched), stop.

## 4. Run migration 36 (immediately)
Run `frontend/supabase-sql/security/36_verified_managers.sql` (one transaction).
- If it errors (including its own "not the expected version" pre-check), **nothing is
  applied**. Confirm with `deploy_preflight.sql` (`no_verification_columns_yet` still
  true). **Hold:** keep the new code live (it is safe), do not roll it back (that would
  restore the old follower-notification route), do not retry. Report.

Then run `checks/deploy_post36.sql`. Every `*_ok` column must be true;
`manager_accounts`, `worker_settings_fingerprint` and `shift_policies_fingerprint` must
equal the preflight values. Run `checks/deploy_manager_probe.sql` again: same `jobs`,
`manager_can_staff = false`.

**Stop / roll back:** any `*_ok` false, a fingerprint changed, the probe still true, or
workers can no longer start/end their own shifts → run
`36_rollback_verified_managers.sql` (restores `8ea02c80…`); confirm with
`deploy_preflight.sql`; keep the code (it stays fail-closed); report.

## 5. Run migration 37
Run `frontend/supabase-sql/security/37_recruiting_consent.sql` (PR #45 branch; one
transaction; changes no existing worker). Then `checks/deploy_post37.sql` (PR #45 branch):
every `*_ok` true; `visible_workers` and `worker_settings_fingerprint` equal the preflight
values.

**Stop / roll back:** error → nothing applied, stop (PR #44 + 36 remain fine). Check
failed → `37_rollback_recruiting_consent.sql`, report.

## 6. Retarget, re-test and merge PR #45
PR #44 is squash-merged, so replay only PR #45's own commits onto `main`:
```bash
git fetch origin
git rebase --onto origin/main <last PR #44 commit on atlas/verified-managers> atlas/recruiting-consent
git push --force-with-lease origin atlas/recruiting-consent
gh api -X PATCH repos/rchaz1990/serve-map/pulls/45 -f base=main
```
Re-run `consent.test.js` and `manager.test.js` locally on the rebased head; wait for a green
Vercel preview; then squash-merge PR #45. Check: worker dashboard shows the talent-search
toggle off for a new profile (local evidence suffices; no new production accounts).
If merged before 37 ran, recruiting messages return 503 until it does; nothing else is
affected. **Roll back:** Vercel instant rollback (37 can stay).

## 7. After deployment
- No manager is verified and no existing worker is changed by any step.
- Recruiting reservations: daily reconciliation below.
- Later, separately approved: manager verification, existing-worker transition.

## Recruiting reservation reconciliation
`contact-server` reserves a contact before sending. Outcomes:

| Email provider result | Reservation |
|---|---|
| Accepted (message id returned) | Kept; `sent_at` and `provider_message_id` recorded |
| Definitely rejected (HTTP 4xx from the provider) | Released (deleted) |
| Ambiguous: timeout, network failure, provider 5xx, unreadable reply, function killed | **Kept, unresolved** (`sent_at` null). Manager told "couldn't confirm; don't resend". Logged `[contact-server] RECONCILE …` with the reservation id |
| Release or `sent_at` update failed | Kept; logged `[contact-server] RECONCILE …` |

Unresolved reservations still count toward the manager's daily limit and block a repeat to
that worker (fail-safe: never over-contacts). Emails carry the idempotency key
`recruit/<reservation id>`, so the provider never sends two emails for one reservation.

**Procedure (operator, SQL Editor + Resend dashboard):**
1. List unresolved, older than 10 minutes:
   `select id, created_at from public.recruiting_contacts where sent_at is null and created_at < now() - interval '10 minutes' order by created_at;`
2. For each, look up the recipient (server-side only):
   `select s.email from public.recruiting_contacts c join public.servers s on s.id = c.server_id where c.id = '<id>';`
   and find the email in **Resend → Emails** around `created_at`.
3. Delivered or queued → `update public.recruiting_contacts set sent_at = <time from Resend>, provider_message_id = '<Resend id>' where id = '<id>' and sent_at is null;`
4. Not in Resend at all → `delete from public.recruiting_contacts where id = '<id>' and sent_at is null;` (frees the pair and the daily slot).
5. Unclear → leave it; it only blocks a repeat contact.
Steps 3–4 change production data and need operator approval each time.
