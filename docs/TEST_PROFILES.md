# Test worker profiles (migration 42, PR #50)

**Status:** draft. Not run. Every step needs founder approval.

## How it works

- **Authorized test accounts** are listed in `public.test_accounts`. Only the service role can read or write it.
- **Marking:** a worker profile owned by a listed account gets `servers.test_profile = true`. The database sets this at signup, or when the account is listed later. It is sticky, and neither the app nor the browser can change it. `is_test` (the browser test-device analytics flag) is unchanged.
- **Visibility:** test profiles, and their workplaces, shifts and ratings, are visible only to test accounts.
  - The database enforces this for anonymous and real users.
  - These routes, which use the service role, apply the same rule and answer "not found" to everyone else: `rating-status`, `track-scan`, `submit-rating` and `contact-server`.
- **No mixing:** follows and ratings between test and real accounts are refused in both directions.
- **Notifications:** `notify-followers` sends nothing (409) if a test profile has any follower who isn't a test account.

## Approval needed, in order

1. Merge PR #50 into the release, or deploy it after.
   - The code works with or without migration 42 (tested both ways).
2. Run migration 42, after migrations 38–41.
3. Data step: `insert into public.test_accounts (email, note) values ('<test email>', 'controlled testing');`
   - Do this **before** that account creates its worker profile.

## Limitations, kept on purpose

- **No profile photo for the test worker.** The `Avatars` storage bucket is public, so a photo would be reachable by anyone with its link. Storage isolation is separate work.
- **The logged-out first-time guest flow can't be tested against a test profile.** A logged-out visitor gets "not found". Testers must sign in with a listed account first.
- **The existing test profile "marcus jacobs" is not covered.** It isn't linked to its account, so listing that email won't mark it. Hiding it is a separate one-row step. It also has one real follow.
- **Rollback refuses** while any test profile or listed account exists. Remove test profiles with the approved deletion procedure (`docs/PARTICIPANT_DATA_DELETION.md`) and empty `test_accounts` first.
