# Participant data deletion (limited Stranger Test)

Manual process for deleting a test participant's data on request. There is no in-app
deletion. Every deletion needs founder approval for that request. Prepared 2026-10-09;
not yet used.

**Target:** complete within **30 days** after the request is verified.

## 1. Receive and verify the request

1. The request comes by email to team@slatenow.xyz.
2. Verify that the requester controls the account:
   - Accept a request only if it comes **from the email address on the account**.
   - If it comes from another address, reply to the account's address and ask them to confirm from there. Do not use a link or a code, and do not trigger a Slate email to do this.
3. Log the request in the deletion log, which is kept outside the database:
   - date received and date verified;
   - account id;
   - type of request: whole account, or a single rating.
   - Do not copy the person's data into the log.
4. The 30-day clock starts at verification.

## 2. Preview (read-only)

Run `frontend/supabase-sql/manual/participant_deletion_preview.sql` in the Supabase SQL editor.
Use the account email and the auth user id (Authentication → Users).

| Check | Required value |
|---|---|
| `account_matches` | 1 |
| `manager_rows` | 0. Restaurant managers are not covered by this procedure; escalate. |
| `worker_profiles` | 0 for a guest, 1 for a worker |

If the account both follows its own profile or rated itself (normally blocked), counts overlap. Stop and handle it by hand.

## 3. Delete (one transaction)

1. Open `frontend/supabase-sql/manual/participant_deletion.sql`.
2. Fill in the email, the account id and every expected count from step 2, then run it.
3. If any count differs, the block raises an error and **nothing is deleted**. Preview again.

| Removed for everyone | Also removed for a worker profile |
|---|---|
| Ratings and comments they wrote; the rated workers' `total_ratings` and `average_rating` are recalculated | The profile row |
| Their follows; follower counts update by trigger | Ratings guests left on the profile |
| Notifications sent to their address | Followers of the profile |
| Their vibe reports, which carry any old stored coordinates | Notifications about the profile |
| Their venue comments | Workplaces, shifts and suggestions |
| Their guest points row | QR scans and recruiting contacts, which cascade |

## 4. Outside the database (same day)

| Item | Action |
|---|---|
| Profile photo | Storage → `Avatars`: delete the file named in `photo_to_remove_in_storage`. |
| Sign-in account | Authentication → Users: delete the user. This step comes **after** step 3: nothing in the database references the account, so deleting the account first would leave the rows behind. |
| Newsletter | Beehiiv: remove the subscriber if present. |
| Email provider | Resend keeps its own delivery logs. We don't delete these; this is disclosed in the Privacy Policy. |

## 5. Kept, and disclosed in the Privacy Policy

- **`serve_ledger`** is append-only (`serve_ledger_append_only` blocks update and delete).
  - For a worker profile, its rows keep the points amounts, dates and the profile's email address.
  - **Not bypassed.** Changing that is a separate founder decision.
  - Points a worker earned from a guest rating that is later deleted stay in the worker's balance.
- **Provider copies.** Backups kept by Supabase, and logs and records kept by Vercel, Supabase, Resend and Beehiiv, follow each provider's own retention practices.
  - We have not confirmed those periods. The project is on Supabase's **Free plan**, so it has no project backups we can download or restore ourselves.
  - The Privacy Policy therefore promises no expiry date.

## 6. Single-rating deletion

1. Verify the request as in step 1.
2. Find the rating id: `ratings` where `lower(guest_email)` = the account email.
3. Delete it.
4. Recalculate that worker's totals, using the same two `update` expressions as `participant_deletion.sql`.

## 7. Confirm and close

1. Re-run the preview. Everything except `account_matches` and `ledger_rows_kept` should be 0. `account_matches` becomes 0 once the auth user is deleted.
2. Reply to the requester that the deletion is complete.
3. Log the completion date.

## 90-day inactive test data review (manual, not automatic)

During the limited test, a person reviews monthly the accounts created for the test that haven't signed in for 90 days:

```sql
-- read-only
select u.id, u.created_at, u.last_sign_in_at
from auth.users u
where u.created_at >= '<TEST_START_DATE>'
  and coalesce(u.last_sign_in_at, u.created_at) < now() - interval '90 days';
```

For each one, the reviewer chooses one of three outcomes:
- keep it;
- contact the person;
- delete it using the steps above, with founder approval.

Nothing runs on a schedule.

## Tested

The preview and delete scripts run against the local stack in `participation.test.js`:
- a guest with a rating, follow, vibe report and notification;
- a worker with a profile, workplace, shift, follower and rating;
- a count mismatch, which must leave everything unchanged;
- the points ledger rows, which must remain.
