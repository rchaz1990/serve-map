> **Superseded for the combined Stranger Test release (#36, #46, #42, #47, #48).** Its deployment sequence assumed separate merges. Use [`STRANGER_TEST_RELEASE.md`](STRANGER_TEST_RELEASE.md) for the release order and migrations 38–41. The Supabase Auth settings and the Google notes below still apply; they are step 5 there.

# Email verification rollout (PR #42)

Status: prepared, not deployed. Rebased onto `main` `e3157a8`. Every step below needs founder approval.
The app code works with Supabase **Confirm email** OFF (today) or ON.

## What changes for people
| Flow | Confirmation OFF (today) | Confirmation ON |
|---|---|---|
| Guest sign-up (`/login`) | Signed in at once (unchanged) | "Check your email" → link → signed in |
| Worker sign-up | Unchanged | "Confirm your account" → link (any device) → finish profile |
| Restaurant sign-up | Manager row created at once (unchanged) | "Check your email" → link → manager row created → dashboard |
| Sign-in before confirming | — | Clear message + **Resend confirmation email** |
| Forgot password | Link now opens `/reset-password` to choose a new password (was: just signed you in) | Same |
| `/reset-password` while merely signed in | No form; told to request a reset link | Same |
| Waitlist claim by email | Google sign-in only (migration 31, unchanged) | Same — no database change in this PR |

Existing accounts keep working. Google users are unaffected. The one never-confirmed
account (never signed in) would need to confirm before signing in.

## Password recovery (what this PR delivers)
1. Person taps **Forgot password?** (guest or restaurant sign-in), or an operator uses
   **Supabase → Authentication → Users → Send password recovery**.
2. The email link (template below) opens `/auth/confirm?token_hash=…&type=recovery`. The **server**
   verifies the token with Supabase (`verifyOtp`), signs the person in, sets a 15-minute recovery
   marker, and opens `/reset-password`. Works on any device.
3. `/reset-password` shows the form only with a session **and** a marker for that same account.
   New password ≥ 6 characters, typed twice; on success the marker is cleared.
4. Errors: expired, reused or tampered link → `/login` "That link has expired or was already used";
   page opened without a valid link → "This reset link has expired or was already used. Request a
   new one"; signed in without a recovery link → "use Forgot password? on the sign-in page".
   Link lifetime = Supabase **Email OTP expiration** (default 3600 s); marker lifetime 15 minutes.

## Exact Supabase changes (NOT applied — founder approval required)
**Authentication → URL Configuration**
- **Site URL**: the production origin people use. Confirm whether that is `https://slatenow.xyz` or
  `https://www.slatenow.xyz` (templates below use `{{ .SiteURL }}`).
- **Redirect URLs**: add `https://slatenow.xyz/auth/callback` and `https://www.slatenow.xyz/auth/callback`.
  Do not remove existing entries.

**Authentication → Emails → Templates**
- **Reset password** — change only the link target:
  `<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery">Reset password</a>`
- **Confirm signup** (only needed when "Confirm email" is turned on):
  `<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">Confirm your email</a>`
- Leave other templates as they are.

**Authentication → Providers → Email**: keep **Email OTP expiration** at 3600 s (or lower); leave
**Confirm email** OFF for the controlled test (turning it on is a separate decision).

Rollback: restore the default template link `{{ .ConfirmationURL }}` (with this PR deployed, default
links still work in the same browser).

## Combined deployment sequence (PR #36 → migration 38 → PR #46 → PR #42)
Conflicts between this PR and #36/#46 were resolved and tested together on reference branch
`atlas/integration-36-46-42` (auth 36/36, legal 30/30, follow 13/13). Reuse those resolutions.
0. Preconditions: verified backup; `main` still `e3157a8` (else rebase all and re-test); green previews.
1. **Merge PR #36** (code only). Check `/terms`, `/privacy`, `/whitepaper` → 404, guest and worker
   sign-up agreement boxes, Follow only after rating. Rollback: Vercel instant rollback (no database change).
2. **Run migration 38** right after #36 is live (follows now need a recorded agreement, which #36
   collects). Verify per `docs/FOLLOW_EMAIL_CONSENT.md`. Until step 3, the old route still emails all
   approved followers — at account-derived addresses for any new follow. Rollback: `38_rollback…`.
   Do **not** run the optional backfill (founder decision: no backfill without fresh opt-in).
3. **Rebase PR #46 onto main, re-test, merge.** Check: UI follow records opt-in; a shift start emails
   only opted-in followers. The 15 existing follows stop receiving shift emails until re-confirmed.
   Rollback: Vercel rollback of #46 (38 can stay; old code keeps working with it).
4. **Rebase this PR onto main (reuse the integration resolutions), re-test, merge.** Check
   `/reset-password` loads; guest sign-up still requires the agreement.
5. **Apply the Supabase changes above.**
6. **One live reset** on the test account (sends one email; needs approval), then the observed live
   worker sign-up, scan, rating and follow (needs approval).

## Google sign-in — unresolved (not redesigned here)
- A **new** person who uses "Continue with Google" from sign-**in** mode, or from the scan/rating
  sign-in redirect, gets an account without seeing the agreement. Ratings and follows still refuse
  until they agree (server-side). Blocking creation itself needs a Supabase "before user created"
  hook (configuration decision).
- The Google sign-up agreement travels in a 10-minute cookie; if Google returns in a different
  browser (e.g. an in-app browser), it is not recorded and is asked again at first rating/follow.
- With "Confirm email" on, an email sign-up has no session yet, so the agreement is asked again at
  first rating/follow.
- Whether Google sign-in links to an existing email/password account with the same address (a possible
  extra recovery route for Gmail users) is untested; not relied on.
- Restaurant (manager) sign-up has no Terms agreement yet (restaurants are not in the test).

## Remaining risks
- Accounts created before step 5 were auto-confirmed; their inboxes were never proven. They are
  grandfathered (mostly team/test accounts).
- Waitlist claims stay Google-only. Confirmation time is not trusted as proof of inbox
  ownership, so a password account whose email matches a waitlist row gets the "sign in with
  Google" message instead of claiming it. A safer password-account claim path is future work.
- Confirmation does not stop one person using many inboxes (e.g. Gmail `+` aliases).
- Confirmation/reset emails may land in spam until sending reputation improves.
- `/reset-password` shows its form only when the server has set a 15-minute recovery marker
  (`slate_pw_recovery`, path `/reset-password`) for the signed-in user. The marker is set only
  after Supabase verifies a recovery link: `/auth/confirm?type=recovery` (any device) or
  `/auth/callback` when the code exchange reports `PASSWORD_RECOVERY` (same browser). It is
  cleared after a successful change. This makes the page's intent explicit; it is not a hard
  security boundary, because Supabase lets any signed-in session call `updateUser({password})`.
  Turning on **Authentication → Providers → Email → Secure password change** (requires recent
  sign-in for password changes outside recovery) closes that separately; it is optional and not
  part of this PR.
- Restaurant details for a pending sign-up are kept in the account's metadata until first
  sign-in; they are the same values the person typed on the form.
