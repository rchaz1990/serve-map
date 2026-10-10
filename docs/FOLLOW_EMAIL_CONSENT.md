# Follow emails: own address only, explicit opt-in (migration 38)

Status: draft, not deployed. Stacked on PR #36 (uses its follow confirmation and
Terms/Privacy acknowledgment). Every production step needs founder approval.

## Problem (verified 2026-10-09)
`follows.follower_email` was whatever the browser sent, and `notify-followers` emailed it
on every shift start. Any signed-in person could enrol a third party in "X is working at Y
now" emails. Following also silently subscribed people to those emails.

## Fix
| Layer | Change |
|---|---|
| Database (migration 38) | Trigger `follows_from_account` sets `follower_email` from the follower's own account on insert and on any change; client values are ignored. A follow is refused unless the account has a recorded Terms/Privacy acknowledgment. `notify_email` (client may request) → `email_opt_in_at` stamped by the trigger; clients can't write it. `notification_recipients(server)` (server-only) returns the **current account address** of **approved, opted-in** followers. |
| Database (privacy) | App users lose SELECT on `follows.follower_email` (table-level SELECT replaced by column-level on the other columns; RLS unchanged). `follower_list(server, status)` (server-only) returns `follower_label` = first name + last initial from the account, or `Guest ····<last 4 of id>`. |
| App | Workers' followers API (`approved`, `pending`, `blocked`) and dashboard list use `follower_label`; **no email addresses reach workers**. The follow confirmation now says the worker sees "your first name and last initial — not your email address". `notify-followers` sends only to `notification_recipients`. Follow buttons send `notify_email: true` only from the "Follow and email me" confirmation (PR #36's `FollowConsent`, which states the consequence first). |

## Existing follower records (read-only check, 2026-10-09)
- 15 follows (all approved), 11 followers, 6 workers (1 follow on the test worker); newest 2026-10-07.
- **All 15 stored addresses match the follower's account address.** No spoofed enrolment found; no correction needed.
- After migration 38 + this code, those 15 have no email opt-in and **stop receiving shift emails** until each follower confirms again. Founder decision: leave as is (recommended), ask them to re-confirm, or run `38_optional_backfill_existing_follows.sql` (resumes emails without a fresh confirmation).
- 158 notification records exist; all recipients have accounts.

## Deployment order (after PR #36 is live)
1. Run `38_follow_email_consent.sql` (pre-check: `follows_set_status` md5 `97d59eb4…`).
   Verify: `follows_from_account` md5 `06809a6b2c1140d7a396502d56a8964b`, `notification_recipients`
   md5 `73c5b4eca3f4d72ff40fba40edc8a1c8`, `follower_list` md5 `b350228801a88e29f80d6b4e76bb0749`; users cannot
   execute `notification_recipients` or `follower_list`, insert `email_opt_in_at`, or select
   `follows.follower_email`; `select count(*) from follows where email_opt_in_at is not null` → 0.
   Between steps 1 and 2 the old route still emails all approved followers (today's behaviour), but
   only at trigger-derived addresses for new follows.
2. Merge this PR.
Rollback: `38_rollback_follow_email_consent.sql` **and** revert this PR's code together.

## Tests (local only)
`tests/local-stack/follow.test.js` — 19 checks: spoofed address ignored; address can't be changed;
no opt-in → no email; no acknowledgment → follow refused; opt-in timestamp can't be forged;
recipients list not callable by users; pre-38 rows without opt-in not emailed; opted-in rows
emailed at the account address, never the stored one; notification records use account
addresses; pending followers not emailed; UI follow records opt-in; workers can't read follower
emails directly or through the followers API (labels only); a new Google account with no agreement
is refused for rating, follow and worker profile.
