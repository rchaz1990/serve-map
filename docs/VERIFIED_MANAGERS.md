# Verified restaurant managers (migration 36)

Status: prepared, not deployed. Every production step below needs founder approval.

## Problem
Anyone could create a manager account naming any restaurant. The database trusted that
self-typed name, so the account could start/end shifts for every worker listing that
restaurant, email those workers' followers, and email workers in the restaurant's name.

## Fix
Manager powers now require a **Slate verification** that binds the account to **one venue
by name AND street address**:

| Column (restaurant_managers) | Who can write | Who can read |
|---|---|---|
| `verified_at` | Slate only (SQL Editor) | everyone (public business fact) |
| `verified_restaurant_name` | Slate only | everyone |
| `verified_restaurant_address` | Slate only | everyone |
| `verification_note` (who verified, what evidence) | Slate only | nobody via the app |

Users cannot write these: the table has column-level INSERT grants for five other columns
and no UPDATE/DELETE grants. A check constraint requires name **and** address whenever
`verified_at` is set.

`manager_controls(auth_id, server_id, restaurant)` (service role only) is the single rule:
the account is verified, the shift's venue name matches the verified name, and the worker
has a job (`server_restaurants`) whose **name and address** both match the verified venue
(trimmed, spaces collapsed, case-insensitive). `manager_can_staff()` — used by the
unchanged shift policies — now just calls it with `auth.uid()`.

### Same-name restaurants
Workers record the Google Places formatted address for each job (all 16 production jobs
have one). Verification records the venue's address too, so "Joe's" at 1 A St and "Joe's"
at 99 Z Ave never match. A worker job with no address is never controllable (fails closed).
The self-typed `restaurant_name` no longer grants anything.

## Manager permissions
| Action | Who may do it | Bound to the verified venue? | Enforced in |
|---|---|---|---|
| Start / end a worker's shift | Verified manager | **Yes** — worker job must match verified name + address | Database (shift policies → `manager_controls`) |
| Notify a worker's followers ("on shift") | The worker, or a verified manager | **Yes** — same rule | `/api/notify-followers` → `manager_controls` |
| Contact a worker (recruiting) | Verified manager | **No, by design** — the Talent tab is for recruiting from other venues | `/api/contact-server`: verified manager + worker's `open_to_opportunities` |
| View staff, analytics, talent list | Any manager account | Reads public profile data only | Column grants (no emails, phones or locations) |

Recruiting is a separate permission from shift control. The worker's email is looked up
server-side and never shown to the manager; the message comes from Slate with the
manager as reply-to, and names the **verified** venue, not the self-typed one.

**Open decision — is worker opt-in sufficient?** Today `open_to_opportunities` defaults to
`true` and all 14 production workers have it on, so it is an opt-*out*, not consent.
There is also no limit on how many workers a verified manager can email. Options:
(a) default new profiles to hidden (schema default only; no data change),
(b) also set existing workers to hidden and tell them (production data change),
(c) per-manager daily contact limit / one message per worker per manager.
None of these is in this PR; each needs a decision.

## What changes for people
| | Before verification | After verification |
|---|---|---|
| Manager sign-up / sign-in | Unchanged | Unchanged |
| Dashboard | Loads; "Pending verification" banner; shift toggles disabled | Toggles work; staff list shows only workers at the verified address |
| Start/end a worker's shift | Refused by the database | Only for workers at the verified venue |
| Notify a worker's followers | 403 | Only for workers at the verified venue |
| Contact a worker | 403 "pending verification" | Allowed; email names the verified venue |
| Workers' own shifts and notifications | Unchanged | Unchanged |

All three existing manager accounts become **unverified** when 36 runs. Nothing is
verified automatically.

## Verifying a manager (after the evidence standard is decided)
Run in the Supabase SQL Editor, once per manager, with values copied **exactly** from the
venue's worker job rows (`select distinct restaurant_name, restaurant_address from
server_restaurants where restaurant_name ilike '…'`):

```sql
update public.restaurant_managers
set verified_at = now(),
    verified_restaurant_name = '<venue name>',
    verified_restaurant_address = '<formatted address>',
    verification_note = '<who verified, date, evidence>'
where id = '<manager row id>';
```
Revoke: `update public.restaurant_managers set verified_at = null where id = '<id>';`

## Deployment sequence (code first, then database — no permissive window)
The new code fails closed when migration 36 has not run yet: `notify-followers` and
`contact-server` refuse every manager, and the dashboard shows "Pending verification" with
shift toggles disabled (tested in `manager-premigration.test.js`). Shipping code first
therefore removes the old follower-notification route before 36 runs, so there is never a
moment where 36 is live and the old route still trusts self-typed restaurant names.

1. **Merge this PR** (Vercel deploys). Check: a manager's dashboard shows "Pending
   verification" with toggles disabled; a worker can still start/end their own shift and
   notify followers. Until step 2, the database still accepts manager shift writes sent
   directly to the API (today's behaviour); keep the gap short.
2. **Run `frontend/supabase-sql/security/36_verified_managers.sql`** in the SQL Editor,
   right after the deploy is live. It stops by itself unless `manager_can_staff` is the
   expected production version (body md5 `8ea02c808366da74d12025a910477a8d`). Verify:
   - `manager_can_staff` body md5 `9e86d5f328646b5442316ff26625b438`
   - `manager_controls` body md5 `e2760eb3d6d4eb7974c52ae022432360`
   - `manager_controls` not executable by `anon` or `authenticated`
   - `select count(*) from restaurant_managers where verified_at is not null` → 0
   Rollback: `36_rollback_verified_managers.sql` (restores md5 `8ea02c80…`; discards any
   verifications). The new code keeps failing closed after a rollback, so no code revert
   is required for safety.
3. **Later, separately approved:** verify specific managers using the agreed evidence.

## Remaining risks
- Verification is manual; its strength depends on the evidence standard (to be decided).
- The address match relies on workers picking the venue from Google search. Two job rows
  for the same venue with different address formatting would need separate handling.
- A worker who wrongly lists a venue can be put on shift by that venue's verified manager
  (their own choice of venue; no ratings or money depend on shifts).
- Workers still set their own shift location fields (separate open item).
- Verification status is publicly readable (by design).

## Tests (local stack, no production)
`tests/local-stack/manager.test.js` — 32 checks: self-registration still works; unverified
managers cannot start/end shifts, notify followers or contact workers; users cannot set or
patch verification fields or call the internal rule; verification note private; constraint
needs name and address; verified manager controls only workers at the verified name +
address (same-name other venue refused for start, end and notify); impostor and Google
waitlist claim stay powerless; dashboard pending state and filtered staff list; toggle works
when verified.
