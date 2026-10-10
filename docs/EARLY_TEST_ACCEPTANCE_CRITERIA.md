# Early Product Test: acceptance criteria (PR-A and PR-B)

Status: **DRAFT for independent review.** Written before any code, per the founder's instruction (2026-10-10).
Nothing here authorizes a merge, a production migration, a deployment, worker notices, invitations or any destructive operation.

## Sources
- Vera's final participant documents and nine outstanding requirements, verbatim (Appendix A–F).
- Founder decisions of 2026-10-10:
  - hide workers without the agreement, with notice where possible;
  - guest withdrawal blocks future actions, existing ratings stay;
  - no QR-scan tracking before agreement;
  - review 30 days after the test ends;
  - correct the Privacy Policy and issue a new legal version;
  - Vera's stop criteria, with team@slatenow.xyz as the contact;
  - target date 2026-10-13;
  - minimal consent records kept 12 months after deletion (provisional);
  - the founder declares the end of the test;
  - the review covers participants only;
  - deleting a worker deletes the ratings on that profile.
- Scope: scan a worker's QR code → sign up → agree → rate. Follow, shift emails, vibe reports and venue comments are paused.

## Version and date
- **Proposed version and publication date: `2026-10-13`.** One value is used for:
  - the Terms/Privacy version (`LEGAL_VERSION` and `current_legal_version()`);
  - the guest participant agreement;
  - the worker participant agreement.
- If release slips, `node scripts/legal-version.mjs set YYYY-MM-DD` changes all of them together, and `check --release` fails on any mismatch.
- The sheets show "Version: 2026-10-13".

## Acceptance criteria for Vera's nine requirements

| # | Requirement (Vera) | Acceptance criteria | Where | Test evidence |
|---|---|---|---|---|
| 1 | One exact version and publication date | The app constants (`LEGAL_VERSION`, `PARTICIPANT_VERSION`) and the database functions (`current_legal_version()`, `current_participant_version()`) all equal `2026-10-13`. The version script fails on any mismatch. Both sheets show the version. | PR-B | version script `check --release`; test E1 |
| 2 | "Profile may be hidden" means everything hidden consistently | For a worker who has not accepted the current worker participant agreement (never agreed, or withdrew), anyone else (logged out, other users, testers) gets nothing back for the profile row, workplaces, shifts or ratings, whether through the API directly or through embedded queries. `/server/<id>`, `/scan/<id>` and `/rate?server=<id>` show "not available". `rating-status`, `rating-relationship` and `track-scan` answer "not found". Venue staff lists, Explore and `/live` leave the worker out. The owner still sees their own dashboard. No row is deleted or changed (before and after counts equal). After the worker agrees, all of it reappears unchanged. | PR-B (44b) | test E4–E7 |
| 3 | End-of-test choice to remain, for guests and workers | `/account` shows participants "Keep my Slate account after the early test" (on/off) until the review. Each change is logged with a timestamp. The default is **not** to remain; silence means not remaining. Email to team@slatenow.xyz from the account address is the alternative; staff record it with the documented admin step (same log). **No automatic deletion is implemented**; the review needs a separately approved procedure. | PR-B | test E10 |
| 4 | Scope of "associated content", with exceptions | Documented below ("Associated content"). This PR deletes nothing. | docs | review |
| 5 | Withdrawal blocks future actions immediately, in the UI and on the server | On `/account`, "Stop taking part" (guest and worker separately) records the withdrawal time and a log entry. **Immediately**, even with a sign-in token issued before withdrawal: the rating route refuses, the database refuses a direct rating insert, a worker's shift start is refused, the worker's active shift ends, and the worker's profile is hidden. The UI shows the withdrawn state. Agreeing again restores participation. | PR-B | test E8–E9 |
| 6 | Participant inbox monitored during the test | Operational: founder confirms who monitors team@slatenow.xyz, how often, and the escalation path. **Not code.** | founder | open (blocker before invitations) |
| 7 | Sign-up without recording a QR scan before agreement | Opening `/scan/<id>` (logged out or signed in), signing up and rating creates **no** `qr_scans` row. `page_views` records no `/scan/...` path. `/api/track-scan` stores nothing during the test. | PR-A | test S9–S10 |
| 8 | Correct the Privacy Policy's rating-identifier wording; new legal version; renewed acknowledgment | The Privacy wording no longer says ratings carry a visible identifier; the identifier is actually not public (PR-A). The QR-scan sentence matches requirement 7. Legal version `2026-10-13`. Accounts on `2026-10-10` must acknowledge again: guests before rating; workers before shifts or receiving ratings. **Wording needs Vera's and legal review (requirement 9).** | PR-A (identifier private), PR-B (wording and version) | test S1–S5, E2–E3 |
| 9 | Professional legal review before strangers are invited | Operational. **Not code.** | founder | open (blocker before invitations) |

## Scope lock (PR-A) criteria
- **S1–S5. The rating account identifier is not public.** For logged-out users, another signed-in user and the author, each of these is refused:
  - `ratings?select=guest_id`;
  - `ratings?select=*`;
  - a filter on `guest_id`;
  - an order by `guest_id`;
  - `servers?select=ratings(guest_id)`.

  Still working: `my_ratings()` returns only the caller's own ratings (without the identifier) and nothing for a logged-out visitor; public profile ratings; the rating-relationship check; rating submission, which still records the identifier internally.
- **S6. Paused features refuse in the database, for every role including Slate's server code:** new follows, vibe reports and venue comments (`feature_paused:<name>`). The routes refuse too (`/api/verify-vibe` returns 403). The UI hides Follow (including PR #51's returning-guest button), the vibe forms and the comment form. Unfollowing still works.
- **S7. Shift emails are paused.** `notify-followers` sends nothing and writes no notification rows.
- **S8. No shift distance is stored.** A shift insert with a distance is saved without it, and shift start still works.
- **S9–S10.** See requirement 7.
- **S11. Used or expired confirmation links** go to `/login` with: "This link has already been used or has expired. If you already confirmed your email, sign in below."
- **Re-enabling any paused feature** needs a new migration and a code change, under founder approval. There is no runtime switch.

## Agreement records (PR-B)
- **Account record:** server-only account data holds `participant_{guest|worker}_version`, `_at`, `_withdrawn_at`, and `participant_remain` plus `participant_remain_at`. Users cannot write it.
- **Log:** `participant_consent_events` is append-only (account id, role, action, version, time). App users have no access to it; updates and deletes are refused.
- **Retention:** minimal consent records are kept 12 months after account deletion (provisional, subject to legal review). There is no foreign key to accounts, so the log survives deletion. Purging the log after 12 months is a separate, not-yet-approved procedure.
- **Atomic writes:** one database function writes the log and the account record together, so they can't disagree.

## Associated content (requirement 4)

| Account | Deleted at the review (if not remaining), or on request |
|---|---|
| Guest | the account; ratings and comments they wrote (worker totals recalculated); their follows; notifications stored for them; vibe reports; venue comments; guest points |
| Worker | the account; the profile and photo; workplaces; shifts; **ratings on the profile** (founder decision 5); follows of the profile; notifications tied to it; QR scans and recruiting contacts |

**Exceptions (kept):**
- the append-only points record (worker email already removed by migration 41);
- Slate Points a worker earned from a deleted rating;
- provider logs and backups (Supabase, Vercel, Resend, Beehiiv) under their own practices;
- minimal consent records (12 months, provisional);
- evidence preserved under the stop criteria.

The process is `docs/PARTICIPANT_DATA_DELETION.md`. It is manual, each run needs founder approval, and nothing is automatic.

## UI copy not supplied by Vera (drafted by Atlas; needs Vera's review)

| Situation | Message |
|---|---|
| Guest taps "Not now" | "You haven't joined the early test. You can keep browsing, but rating stays off until you agree." |
| Worker taps "Not now" | "You haven't joined the early test. Your profile stays hidden, and new ratings and shifts are off until you agree." |
| Guest withdrew | "You've stopped taking part in the early test. You can't submit new ratings. Ratings you already submitted stay public unless you ask us to delete them at team@slatenow.xyz." |
| Worker withdrew | "You've stopped taking part in the early test. New ratings and shifts are blocked and your public profile is hidden. Your account and history are kept. You can take part again by accepting the current worker agreement." |
| Remain option | "Keep my Slate account after the early test" — "Thirty days after the test ends, Slate plans to delete early-test accounts and their content unless you choose to stay. You can change this until then." |
| Unavailable profile | "This profile isn't available right now." |

**Privacy Policy changes (needs Vera's and legal review):**
- Ratings: replace "Some older ratings also carry a random account identifier that others using Slate can see; it does not show your name or email." with "Slate does not show a public account identifier with your ratings, so others can't use one to link your ratings together."
- Usage data: replace "We record pages visited and QR code scans (with an anonymous browser identifier) to understand how Slate is used and to improve it." with "We record which pages are visited (the page address only, not who visited) to understand how Slate is used and to improve it. During our early test, Slate does not record QR code scans."

## Stop criteria and evidence (Appendix F)
These are operational. The product supports them with:
- no public identity data (S1–S5; comments paused);
- the existing duplicate guards (one rating per worker per 24 hours, one account per email);
- out-of-scope features refused (S6–S8).

Evidence-preservation mechanics were not supplied by Vera and remain open.

## Open items (not code)
1. Requirement 6: inbox monitoring. Founder.
2. Requirement 9: professional legal review of the final wording. Founder.
3. Vera's review of the Atlas-drafted UI copy and Privacy changes above.
4. Evidence-preservation mechanics (Vera to supply).
5. Advance notice to the 9 workers: Vera's draft (Appendix E) needs an approved link and separate sending approval.
6. SLATE-004 session cleanup; founder approval of invitations.

---

# Appendices: Vera's documents, verbatim

The version placeholder `[set exact release date]` is replaced by `2026-10-13` in the app; the text is otherwise unchanged.

## Appendix A: Guest information sheet (verbatim)

### Slate Early Product Test — Guest Information

**Version:** `[set exact release date]`

Slate is testing an early version of its app with adults in New York City. Taking part is voluntary. You must be 18 or older, and you may stop at any time.

The first test is limited to:

1. scanning a worker’s Slate QR code;
2. creating or using a Slate account;
3. reading the test information;
4. agreeing to participate; and
5. submitting a rating for a worker who personally served you.

Following, shift emails, vibe reports and venue comments are not part of this first test.

### What your rating does

Your rating may include stars, optional tags and an optional written comment. It appears on the worker’s public profile.

Your name and email address will not appear with your rating. Slate will not display a public account identifier that links your ratings together.

Ratings are stored by Slate and are not currently stored on a blockchain. Ratings cannot be edited after submission, but you may request deletion.

### Points and tokens

The worker may receive Slate Points because of your rating. Slate Points have no cash value and cannot be sold, transferred or exchanged.

$SERVE has not been issued. Slate does not promise that it will launch or that Slate Points will convert into $SERVE or anything else.

### Voluntary participation and withdrawal

You may stop participating at any time. Withdrawal immediately prevents you from submitting new ratings or taking part in future test actions.

Withdrawal does not automatically remove ratings you already submitted. Existing ratings remain public unless you separately request deletion.

### Deletion

To request deletion, email team@slatenow.xyz from the email address on your account. Slate will verify the request and aims to process it within 30 days.

At the 30-day post-test review, Slate plans to delete test participant accounts and associated content unless you explicitly elect to remain. This is subject to necessary legal, security, audit and provider-backup retention.

Previously awarded Slate Points may remain with the worker after your rating is deleted.

### Risks and limitations

This is early software. It may contain errors, interruptions or confusing screens. A submitted rating may be publicly visible until it is deleted.

### Questions or concerns

Contact team@slatenow.xyz. If a serious privacy, identity or attribution problem occurs, Slate will stop the test, preserve relevant evidence and escalate it to the founder.

## Appendix B: Guest consent card (verbatim, with Vera's note)

> **Take part in Slate’s early test?**
>
> This test is voluntary and for people 18 or older. The test is limited to scanning a worker’s QR code, signing up, agreeing to the test information, and submitting a rating.
>
> Your rating and optional comment may appear publicly on the worker’s profile without your name or email. Slate does not display a public account identifier linking your ratings together.
>
> Your rating is stored by Slate, not on a blockchain. Slate Points have no cash value, and $SERVE has not been issued.
>
> You may withdraw from future participation at any time. Existing ratings remain unless you separately request deletion. You may request deletion at team@slatenow.xyz.
>
> [Read the full guest information sheet]
>
> ☐ I am 18 or older, I have read the Slate Early Product Test guest information sheet, and I agree to participate.
>
> **[Agree and continue]**  **[Not now]**

If the guest selects **Not now**, Slate should allow browsing and signup only as permitted, but must block rating and other test actions.

## Appendix C: Worker information sheet (verbatim)

### Slate Early Product Test — Worker Information

**Version:** `[set exact release date]`

Slate is testing an early version of its app with adults in New York City. Taking part is voluntary. You must be 18 or older, and you may stop at any time.

The first test focuses on whether a guest can scan your Slate QR code, sign up, understand the experience and submit a rating.

### What may be public

If you participate, your Slate profile may publicly show:

- your name, photo, role, bio and specialties;
- your workplaces;
- ratings and comments;
- follower count;
- Slate Points; and
- your current venue when you are publicly marked as on shift.

Individual followers are not publicly listed. Workers may see a follower’s first name and last initial, but not the follower’s email address.

### Ratings

Guest ratings, tags and comments may appear on your public profile. Ratings are stored by Slate and are not currently stored on a blockchain.

You may ask Slate to review a rating that violates the Terms. A guest may request deletion of a rating they submitted.

### Location and shifts

Starting a shift is public and may show the venue where you are working.

A location check may be used to determine whether you are near the venue. Raw coordinates are not intended to be stored. Slate may retain whether the check passed and an approximate distance internally. These checks are not proof of presence.

### Points and tokens

Slate Points have no cash value and cannot be sold, transferred or exchanged.

$SERVE has not been issued. Slate does not promise that it will launch or that Slate Points will convert into it or anything else.

### Withdrawal and visibility

You may withdraw from the early test at any time.

After withdrawal:

- you cannot start new shifts or receive new ratings or followers through the test;
- new test activity involving your profile is blocked;
- your public profile may be hidden;
- your existing account and historical data are preserved;
- your profile becomes visible again if you later accept the current worker agreement.

Withdrawal does not delete your account or historical data. You may separately request deletion at team@slatenow.xyz.

Previously awarded Slate Points are not removed merely because you withdraw or a rating is deleted.

### Test review and deletion

Thirty days after the test ends, Slate will review participant accounts and associated content. Slate plans to delete test participant accounts and associated content unless the participant explicitly elects to remain.

Necessary legal, security, audit and provider-backup retention may remain.

### Questions or concerns

Contact team@slatenow.xyz. Slate will immediately stop the test and preserve evidence if a serious privacy, identity, attribution or unauthorized-disclosure problem occurs.

## Appendix D: Worker consent card (verbatim)

> **Take part in Slate’s early test?**
>
> This test is voluntary and for workers 18 or older. Your profile, ratings, comments, workplaces, follower count, Slate Points and current shift venue may be publicly visible.
>
> Ratings are stored by Slate, not on a blockchain. Slate Points have no cash value, and $SERVE has not been issued.
>
> If you withdraw, future test activity is blocked and your profile may be hidden. Your account and historical data are preserved, and your profile may become visible again if you accept the current worker agreement.
>
> [Read the full worker information sheet]
>
> ☐ I am 18 or older, I have read the Slate Early Product Test worker information sheet, and I agree to participate.
>
> **[Agree and continue]**  **[Not now]**

## Appendix E: Advance notice to affected workers (verbatim; not to be sent without approval)

**Subject: Action needed: Slate profile participation agreement**

Hi [First name],

We are preparing a limited Slate early test and are updating how worker participation works.

Our records show that your profile has not yet accepted the current Terms of Service, Privacy Policy and early-test worker information. Before the test begins:

- your existing account and historical data will be preserved;
- your public profile may be temporarily hidden;
- new ratings, follows and shifts through the test will be blocked;
- nothing will be deleted;
- your profile can become visible again after you review and accept the current worker agreement.

Your existing ratings and Slate Points will not be erased by this change.

Please review the current worker information and agreement here:

[approved Slate link]

If you do not want to participate, no action is required. If you want your account or data deleted, contact team@slatenow.xyz.

Questions are welcome at the same address.

Slate

## Appendix F: Nine requirements and stop criteria (verbatim)

1. Set one exact participant-document version and publication date.
2. Confirm whether “profile may be hidden” means all public profile data, ratings, workplaces and shifts are hidden consistently.
3. Define the exact end-of-test election method for workers and guests who want to remain.
4. Confirm whether “associated content” includes ratings, comments, follows and notifications, and document exceptions.
5. Confirm the withdrawal UI and server enforcement both immediately block future actions.
6. Confirm the participant contact inbox is monitored during the test.
7. Confirm the guest flow allows signup without recording a pre-consent QR scan.
8. Correct the Privacy Policy’s rating-identifier language and require renewed acknowledgment using the new legal version.
9. Obtain focused professional legal review of the final wording before strangers are invited.

Minimum stop criteria:
- any participant’s email, phone or unintended identity data becomes public;
- a rating is attributed to the wrong worker;
- a participant cannot withdraw or request deletion;
- a participant sees a false blockchain, token, permanence or payout claim;
- a worker’s profile or shift is exposed contrary to the agreed disclosure;
- duplicate ratings, accounts or shifts are created;
- any production data outside the approved test scope changes.

Stop the test immediately, preserve evidence, do not attempt an unapproved fix, and notify the founder through the designated contact path.


---

# Proposed production sequence (each step needs separate founder approval; nothing here authorizes it)

| Step | What | Why this order |
|---|---|---|
| A1 | Run `43_scope_lock.sql` | Database first: blocks paused features for every role; adds `my_ratings()`; drops shift distance. The current app keeps working (paused buttons just error). |
| A2 | Deploy the PR-A app | Hides paused controls; "My Ratings" uses `my_ratings()`; no QR-scan tracking. |
| A3 | Run `43b_rating_identifier_private.sql` | Only after A2 (the old app filtered "My Ratings" by `guest_id`). |
| B1 | Run `44_participant_agreements.sql` | Additive: log, checks, recorder. Blocks nothing. Must precede B2 (the app calls these functions and fails closed without them). |
| B2 | Run `legal-version.mjs check --release` (or `set` to the actual date), then deploy the PR-B app | Shows the cards, records agreements, enforces in routes. Between B2 and B3 the database still expects legal version 2026-10-10, so workers who re-acknowledge (2026-10-13) cannot start shifts until B3 (fails closed, minutes). |
| B3 | Run `44b_participant_enforcement.sql` | Database enforcement, visibility rules, legal version 2026-10-13. |
| Verify | Read-only production checks with test accounts only | E- and S-criteria above. |

Rollback is strictly in reverse: 44b → app → 44 (keeps the log) → 43b → app → 43. Every rollback refuses to run out of order.
