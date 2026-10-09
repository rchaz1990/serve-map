# PR #36 — truth and consent review packet

For **Rachel** (factual accuracy) and **Chrissy** (copy). Draft; not merged or deployed.
Branch `atlas/messaging-truth`, brought up to date with production `main` (`e3157a8`).

## Facts the copy now matches (checked read-only in production, 2026-10-09)
| Fact | Evidence |
|---|---|
| Ratings, follows and Slate Points are stored by Slate, not on a blockchain | The only Solana code (`lib/solana.ts`, devnet) is not imported anywhere in the app |
| Ratings are not location-verified | 0 of 21 production ratings have `gps_verified`; all are `qr_scan` |
| Coordinates are stored for vibe reports and shifts | 152/185 vibe reports and 29/57 shifts hold coordinates |
| Coordinates are not publicly readable; distance to venue and the pass/fail check are | Column grants: `distance_meters` and `gps_verified` readable by anyone; `user_lat/user_lng` not |
| A random account id is stored with each rating and is publicly readable | `ratings.guest_id` readable by anyone |
| No money or token payouts exist; Slate Points have no cash value | No payout code; `$SERVE` not issued |

## What changed in this update (on top of the earlier PR #36 commits)
**Consent (new, server-enforced)**
- Worker sign-up, final step: unticked box — "I'm 18 or older, and I've read and agree to Slate's Terms of Service and Privacy Policy" — plus a short plain-language summary (public profile, location stored with shifts, points have no cash value, not on a blockchain). The account is not created until it is ticked.
- Guest rating (first rating per policy version): unticked box — "I'm 18 or older, {name} personally served me, and I agree to Slate's Terms of Service and Privacy Policy" — plus "Your rating and comment appear on their public profile without your name. Slate stores them; they are not on a blockchain."
- The server refuses sign-up or rating without the current version (`lib/legal.ts`, `LEGAL_VERSION = '2026-10'`) and records version + time in the account's server-only metadata (`legal_worker_*`, `legal_guest_*`). Bump the version to re-ask everyone after a material change.

**Terms**: new "Agreeing to These Terms" and "Location Checks" sections; blockchain section now states the vision without a guarantee; "Changes" no longer says continued use = acceptance (we re-ask instead).

**Privacy**: location section rewritten to actual behaviour (coordinates + distance stored; distance and check result visible; device location not proof); rating account id disclosed; acknowledgment record disclosed; blockchain section states the vision without a guarantee; "Changes" re-asks instead of assuming acceptance.

**Pages and messages**
- Home: "Building on Solana" → "Blockchain portability: planned, not live"; vision line no longer says "built on Solana"; "$SERVE launches after milestones" → "hasn't been created, and it may never launch"; "never resets" → "stays with you when you change jobs".
- For-servers: "$SERVE… we're building toward" → "we'd like to build… may never launch".
- `/pay` (unlinked, public): fake balance, "≈ $47.23 USD", "converts to USD", "Arrives in 1–2 business days", "Coming Q3 2026" removed → plain "Not available" notice.
- `/whitepaper` (unlinked, public): content unchanged; prominent "Vision document — not a description of Slate today" notice added at the top.
- Signup header "Build it once, keep it forever" → "Your reputation, your regulars — wherever you work."
- "GPS Verified" / "GPS ✓" badges (vibe reports) → "Location checked" / "Location ✓"; "earn 5 pts" → "earn up to 5 pts" where the reward depends on the check.
- Vibe report messages: "$SERVE" → "Slate Points". Account page "+5 $SERVE" → "1–5 pts". Profile stat "$SERVE" → "Points". Dashboard "Only goes up" removed. Booking page "$SERVE token rewards" → reputation wording. Server waitlist "bonus $SERVE rewards" removed.
- Welcome emails: "forever", "Earn $SERVE rewards", "built on Solana" removed.

## Update 2 (2026-10-09 evening) — B2, B3, B6
**B2 — unapproved commitments**
- "Free forever" removed everywhere (home, for-servers ×3, get-started, server waitlist) → "Free for servers and bartenders".
- Terms "permanently free… will not change" → "currently free for servers and bartenders… if we ever introduce charges, we will tell you in advance and ask you to agree first".
- `/whitepaper` now returns **404**. The original April 2026 text is preserved, unpublished, at `docs/archive/whitepaper-v1.0-2026-04.tsx.txt` (not built).

**B3 — follow and guest sign-up consent**
- Rating page: the Follow action before the rating is removed. Follow appears only after the agreed rating succeeds.
- Scan page: Follow removed (Rate only). Server profile page: Follow kept, but behind the same confirmation.
- Every Follow now opens a confirmation first: "Slate will email you when {name} starts a shift, including where they're working · {name} will see your email address in their followers list · You can unfollow at any time". If the account has no acknowledgment on file, it also requires the unticked Terms/Privacy box, recorded server-side **before** the follow is created. Button: "Follow and email me".
- Guest sign-up (`/login`, sign-up mode): unticked "I'm 18 or older, and I agree to…" box; Create account and Continue with Google are refused until ticked. Recorded server-side (version + time) through `POST /api/legal/accept` (email sign-up) or the auth callback (Google sign-up).

**B6 — worker sign-up disclosure**: "Starting a shift is public. When you start a shift, anyone can see which venue you're working at and that you're on shift now, and Slate may email your followers… Choose who follows you: anyone can follow you unless you turn on follow approval in your dashboard settings."

### Limits of "server-enforced" for guest sign-up (founder decision)
Account creation happens directly at Supabase Auth, so the app server cannot refuse it. Enforcement is: the UI refuses without the tick; the acknowledgment is recorded server-side; and every data use is refused server-side without it (rating API now; follows once migration 38 runs). A Google **sign-in** by a brand-new user creates an account without the box (same server-side gates apply). Blocking account creation itself needs a Supabase "before user created" auth hook.

### New finding for decision
Workers receive each follower's **full email address** from the followers API (the list shows only the part before "@"). The follow confirmation now says the worker will see it. Option: return only the display part to workers (small separate change).

## Decisions needing founder approval (not changed here)
1. ~~"Free forever"~~ — removed per founder (not an approved commitment).
2. **18+ eligibility** is stated in Terms/Privacy and now affirmed by the checkbox, but there is no age verification. Is self-affirmation enough?
3. **Data retention**: no retention period exists for coordinates, ratings or accounts. What should Privacy say, and should old coordinates be deleted?
4. **Account deletion** is by email request only; deletion of ratings a guest left is not addressed. Policy needed.
5. **Public random account ids** on ratings (and `servers.wallet_address`): disclose (done) or remove from public view (engineering change).
6. **Legal review**: these pages were written without a lawyer (governing law, disputes, liability caps). Founder decides whether to get one before strangers.
7. ~~`/whitepaper`~~ — now 404; original archived for later review.
8. **`/pay`**: keep the "Not available" page or remove the route.
9. **Effective date / version**: pages say "Updated October 2026"; `LEGAL_VERSION` is `2026-10`. Set the real publication date at merge.
10. Existing accounts have no recorded acknowledgment. Workers are asked only at sign-up, so the 14 existing workers are not asked by this change. Ask them (e.g., on next dashboard visit)?

## Not changed (deliberately)
- Dashboard still computes an unused "next payout" date (not displayed). Code clean-up only.
- `app/providers.tsx` (Privy Solana wallets) is not used by the app.
- The whitepaper body text.

## Tests (local only, no production)
`tests/local-stack/legal.test.js` 30/30; regressions: ratings 15/15, vibe 25/25, managers 32/32,
recruiting consent 22/22, worker signup (offline) 24/24, security 115/115.
