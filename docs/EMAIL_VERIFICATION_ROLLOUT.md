# Email verification rollout (PR #42)

Status: prepared, not deployed. Every step below needs founder approval.
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

## Deployment order
1. **Merge PR #42** (Vercel deploys). Safe with confirmation OFF. Verify: `/reset-password` loads; guest sign-up still lands on `/live`.
2. **Supabase → Authentication → URL Configuration**
   - Site URL: `https://www.slatenow.xyz`
   - Redirect URLs: add `https://www.slatenow.xyz/auth/callback` (reset links now return there too)
3. **Supabase → Authentication → Emails → Templates** (links that work on any device):
   - *Confirm signup*: link to `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`
   - *Reset password*: link to `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery`
   - Keep the default templates' other text. (Default `{{ .ConfirmationURL }}` links also work, but
     only finish sign-in in the same browser; elsewhere people see "confirmed — sign in".)
4. **Delivery test (Milo)** with confirmation still OFF: "Forgot password?" to an address that is
   **not** a Supabase team member; open the link on a phone; set a new password; sign in with it.
   Check inbox vs spam. Check **Authentication → Rate Limits → emails per hour** is high enough.
5. **Turn on Confirm email.** Test: one guest, one worker (`?test=1`), one restaurant sign-up
   end to end, plus sign-in-before-confirming + resend.
   **Rollback:** turn Confirm email off (immediate; nothing else depends on it).

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
