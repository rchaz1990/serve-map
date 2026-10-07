# Slate — Project Handoff Document
*Last updated: October 2026 | For AI tools and future collaborators*

---

## What Is Slate?

Slate is a Solana-based dApp that gives hospitality workers — servers, bartenders, hosts — **portable, on-chain professional reputations**. The core thesis: when a bartender changes jobs, they lose everything. Their ratings stay on the restaurant's Yelp page. Their regulars have no way to find them. They start from zero every time.

Slate fixes that. Workers own their ratings permanently. Guests follow the **worker**, not the restaurant. When a server moves spots, their followers get notified and their reputation comes with them.

**Live site:** https://slatenow.xyz
**GitHub:** https://github.com/rchaz1990/serve-map
**Founder:** Chaz Rodriguez — NYC bartender, solo founder, zero prior coding experience

**One-liner for investors/judges:**
"Blackbird rates the place. Slate rates the person."
"We never charge the workers. We charge the venues who need them."

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16.2.2, TypeScript, Tailwind CSS |
| Auth | Supabase Auth (Google OAuth + email/password) |
| Database | Supabase (PostgreSQL) — project: slate-prod |
| Blockchain | Solana devnet — Anchor 0.32.1 |
| Smart Contract | Program ID: `9zMshqvyGNRH9AMyWB8BxJp46U4e5Bish7rhtpq9T9EE` |
| Deployment | Vercel (auto-deploys from GitHub `main` branch) |
| Email | Resend (domain: team@slatenow.xyz) |
| Storage | Supabase Storage — bucket: "Avatars" (capital A — matters for queries) |
| Maps/Places | Google Places API |
| Cron | cron-job.org — runs cleanup-shifts hourly |
| Local project | ~/serve-mvp |

---

## Environment Variables

Set in Vercel dashboard AND in `~/serve-mvp/frontend/.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://dxolctisydznevcmtaed.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon key — in Vercel]
NEXT_PUBLIC_GOOGLE_PLACES_KEY=[Places API key]
FEE_PAYER_PRIVATE_KEY=[Solana fee payer key array]
RESEND_API_KEY=[Resend key]
SUPABASE_SERVICE_ROLE_KEY=[service role key — in Vercel]
CRON_SECRET_KEY=[cron secret — in Vercel; rotate if it was ever shared]
```

**Fee payer wallet:** `3WsYRLCAkaB7raRfSrQMhYhESQEfYq4UWfSMq1eWLRHz`

> ⚠️ Never put real key values in this file or commit them to git.

---

## Supabase Database

**Project:** slate-prod
**URL:** https://dxolctisydznevcmtaed.supabase.co

### Tables

| Table | Purpose |
|---|---|
| servers | Server/bartender profiles |
| server_restaurants | Links servers to restaurants (many-to-many join table) |
| restaurants | Restaurant records |
| ratings | Guest ratings of individual servers |
| shifts | Server shift activations (active/inactive) |
| follows | Guest follows of servers |
| vibe_reports | Live venue vibe reports from guests |
| notifications | In-app notifications |
| venue_comments | Guest comments on venue pages |
| suggestions | Worker Council suggestions from servers |
| restaurant_managers | Restaurant manager accounts |
| guest_rewards | Guest $SERVE rewards |

### Critical Column Notes

- `servers.serve_balance` — available $SERVE to spend/cash out (**was called `slate_points` — was renamed, caused major dashboard bug**)
- `servers.serve_balance_lifetime` — total $SERVE ever earned; never decreases; used as reputation score
- `servers.wallet_address` — **stores Supabase auth UUID, NOT a Solana wallet address**
- `servers.open_to_opportunities` — boolean; opt-in for restaurant talent discovery
- `servers.specialties` — text[]: Cocktails, Wine, Beer, Whiskey, Fine Dining, Casual Dining, Nightlife, Events & Catering
- `servers.follow_approval` — 'automatic' or 'approval'
- `servers.profile_visibility` — 'public', 'shift_only', or 'private'
- `ratings.serve_reward` — $SERVE earned for this rating
- `ratings.rating_stars` — star count column
- `shifts.activated_by` — 'server' or 'manager'
- `follows.status` — 'approved' or 'pending'
- **servers has NO `restaurant_name` column** — restaurant comes from server_restaurants join

### Key SQL Functions (run in Supabase SQL editor)

```sql
increment_serve_balance(user_email, amount, user_type)
increment_follower_count(server_uuid)
approve_follow_request(p_follow_id, p_server_id)
```

### RLS (Row Level Security)

Enabled on all tables. Server-side API routes use `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS when needed.

---

## Pages and API Routes

### Frontend Pages
```
/                        Homepage — hero, how it works, for servers
/live                    Live vibe map (main guest feature)
/explore                 Explore servers with filters
/server/[id]             Server public profile page
/server/[id]/card        Shareable server card (for Instagram etc.)
/rate                    Rate a server (QR code scan destination)
/scan/[code]             QR code scan landing (redirects to rate)
/follow                  Follow a server
/dashboard               Server dashboard (authenticated servers only)
/account                 Guest account page
/my-servers              Guest's followed servers list
/servers/signup          Server signup form
/server-waitlist         Server waitlist
/restaurant/signup       Restaurant manager signup
/restaurant/login        Restaurant manager login
/restaurant/dashboard    Restaurant manager dashboard (3 tabs)
/venue/[name]            Venue detail page with vibe reports
/for-servers             Marketing page for servers
/for-restaurants         Marketing page for restaurants
/book                    Booking page
/waitlist                Guest waitlist
/pay                     Slate Pay (designed, not functional)
/how-it-works            How Slate works
/whitepaper              Slate whitepaper and roadmap
/login                   Auth login
/get-started             New user onboarding flow
/pitch                   Pitch deck page
/privacy                 Privacy policy
/terms                   Terms of service
/auth/callback           Supabase OAuth callback
```

### API Routes
```
/api/cleanup-shifts      Cron: closes shifts older than 12hrs (hourly via cron-job.org)
/api/notify-followers    Notifies followers when server starts shift (uses Promise.all)
/api/daily-reminder      Emails servers at 3pm to activate their shift
/api/contact-server      Restaurant manager contacts a server via email
/api/verify-vibe         Submits a vibe report with GPS + rate limiting
/api/signup-server       Server signup — creates Supabase auth + servers row
```

---

## Core Features Built

### For Servers
- Signup with Google Places restaurant autocomplete
- Profile photos via Supabase Storage (bucket "Avatars")
- Specialties multi-select (up to 8 options)
- Privacy: follow approval toggle (automatic vs manual) + profile visibility dropdown
- Pending Requests tab (only shows when follow_approval = 'approval')
- QR code generates as `https://slatenow.xyz/scan/[serverId]`
- Shift activation with GPS verification
- Talent opt-in toggle ("Appear in restaurant talent search")
- Worker Council suggestions
- Shareable profile card at `/server/[id]/card`

### For Guests
- Google OAuth + email/password login
- GPS-verified vibe reports (5 $SERVE GPS verified, 1 $SERVE unverified)
- Rate limiting: 20 reports/day, 2-hour cooldown per restaurant
- Live vibe map with three-tier system (Dead / Live / Packed)
- Venue detail pages with live comments (auto-refresh every 30s)
- Hot venue highlighting (3+ Packed/Live reports in 2 hours)
- Follow servers (with approval flow if server has it enabled)
- My Servers page showing followed servers

### Rating System — Merit-Based $SERVE Rewards

| Stars | $SERVE Earned |
|-------|---------------|
| 1★ | 2 |
| 2★ | 5 |
| 3★ | 10 |
| 4★ | 20 |
| 5★ | 35 |
| Written comment bonus | +10 |
| Follow bonus | +5 |
| Maximum per interaction | 50 |

### Dual Balance System
- `serve_balance` — available to spend or cash out (decreases on cashout)
- `serve_balance_lifetime` — permanent reputation score (never decreases)
- Both update on every rating received

### Restaurant Manager System
- Signup at `/restaurant/signup`, login at `/restaurant/login`
- Manager dashboard at `/restaurant/dashboard` with three tabs:
  - **Staff** — toggle staff on/off shift; followers notified automatically; **on-shift rows show guest rate QR** (`https://slatenow.xyz/scan/[serverId]`)
  - **Intelligence** — staff leaderboard, ratings, recent vibe reports
  - **Talent Discovery** — search servers by role/rating/followers; contact via email

### Notification System
- Email via Resend when server starts shift (to all followers)
- `Promise.all()` used to avoid serverless timeout on large follower lists
- Notification bell in navbar with unread count
- Notifications saved to `notifications` table

### Auth Routing Logic
- Navbar detects user type via localStorage: `slateUserType`, `slateServerId`, `slateManagerId`, `slateRestaurantName`
- Managers → `/restaurant/dashboard`
- Servers → `/dashboard`
- Guests → `/account`
- `/auth/callback` checks `restaurant_managers` first, then `servers`, then `/get-started`
- Sign-out clears all four localStorage keys

---

## $SERVE Token

- **Fixed supply:** 100,000,000
- **Status:** Devnet Supabase points only — NOT a real SPL token yet, NOT on mainnet
- **Planned:** Real SPL token mint on mainnet, Slate Pay 2% cashout fee, Raydium listing
- **Top 20% payout:** Active servers bi-weekly by $SERVE earned — funded from restaurant subscription revenue

### Token Allocation
- 35% Server Rewards
- 20% Treasury & Operations
- 15% Team & Founders
- 12% Investors & Advisors
- 10% Community & Ecosystem
- 8% Liquidity Pool

---

## Business Model

| Stream | Details |
|---|---|
| Restaurant subscriptions | Free for 60 days, then $29/mo (Oct 2026). Old $99/$299 tiers parked in `frontend/docs/parked-restaurant-pricing.md` |
| Slate Pay cashout fee | 2% when servers cash $SERVE out to bank |
| Data licensing | Anonymized NYC hospitality intelligence (Year 2-3 plan) |

**Servers are free forever. No exceptions. Ever.**


---

## Known Bugs & Issues

### Critical (blocks mainnet)
1. **Reward logic triggered client-side** — anyone technical can call reward functions without actually rating. Must move on-chain before mainnet.
2. **No smart contract audit** — required before any real funds involved.
3. **GPS is spoofable** — GPS verification is done client-side; server trusts what the browser reports.

### Dashboard / Auth
4. **Dashboard shows "Setting up your profile"** — caused by Supabase query selecting columns that don't exist. Root cause was `slate_points` rename. If it comes back, check that all column names in dashboard query match actual DB schema.
5. **`wallet_address` lookup** — dashboard looks up server by `wallet_address = session.user.id`. If these don't match, dashboard breaks. Email fallback was added.

### Restaurant Manager
6. **Talent Discovery shows no servers** — filter on `open_to_opportunities = true` may not be working.
7. ~~Manager Google OAuth leads to blank page~~ **FIXED** (PRs #8–#10, Oct 2026). Live browser re-test still pending.
8. ~~Manager login stuck on "signing in"~~ **FIXED** (PR #7, Oct 2026). Live browser re-test still pending.

### Bugs Found in Code Review (May 2026)
9. **`server_id` missing from shifts insert** — ~~shift rows saved without server_id, so "Servers Here Tonight" on venue pages always shows empty.~~ **FIXED** (`fix/shifts-server-id-handoff-9`): server dashboard insert requires `servers.id` + `activated_by: 'server'; venue/tonight queries filter null `server_id` + 12h window. Optional SQL to deactivate residual null-`server_id` actives is in `migrations/optional_deactivate_null_server_id_shifts.sql` (do not run without Spvce approval).
10. ~~Rating tags never saved~~ **FIXED** — ratings now go through `/api/submit-rating`, which saves tags and the $SERVE ledger row.
11. **Anonymous vibe reporters bypass rate limiting** — `reported_by` is undefined for logged-out users; all share the same null key.
12. **Vibe reward mismatch** — API gives 2 $SERVE for non-GPS verified but UI says "earn 1 $SERVE".
13. ~~Follower count race condition~~ **FIXED by the Oct 2026 hardening patch** — the database recounts `follower_count` from approved follows on every change.
14. ~~Server can follow themselves~~ **FIXED by the Oct 2026 hardening patch** (database rejects it).
15. **Comment likes have no per-user dedup** — any user can tap Like unlimited times.
16. ~~Follow approval function missing~~ exists in production; `block_follower` was missing and is added by the Oct 2026 hardening patch.

### GPS / Vibe Reports
17. **Android GPS hangs on "verifying"** — fixed with `enableHighAccuracy: false` and 4-second timeout but may still affect some devices.

### QR Code
18. **QR URL (canonical guest entry)** — `https://slatenow.xyz/scan/[serverId]` (QR + manager Staff copy link). Scan landing → Rate button → `/rate?server=[serverId]`. Direct `/rate?server=` also works. `/review` and `/r` are not routes (404).

---

### Security model (Oct 2026 hardening patch)
- Browsers use the public key. They can read public profile data only; emails, phone numbers and GPS columns are not readable from the browser.
- Each user can change only their own rows (own profile settings, own shifts, own jobs, own follows). Managers can start/end shifts only for staff linked to their venue.
- Ratings, $SERVE balances, vibe reports, QR scans, page views and notifications are written only by server routes using the service key.
- Email routes (`notify-followers`, `contact-server`, `welcome-email`) require a signed-in user and look up recipients in the database.
- New follows are approved automatically unless the server turned on follow approval. `follower_count` is maintained by the database.
- SQL lives in `frontend/supabase-sql/hardening/`. Order: `10_additive.sql` → deploy app → `20_tighten.sql`. Rollbacks: `29_` then `19_`.

---

## Key Decisions Made & Why

| Decision | Reasoning |
|---|---|
| Solana over Ethereum | Sub-cent fees — servers can earn $SERVE on every rating without gas destroying the value |
| Supabase for everything | Fast to build, handles auth + RLS + storage in one place |
| Servers are free forever | Remove friction to adoption; monetize restaurants not workers |
| Dual balance columns | Lifetime score never decreases even when available balance is cashed out |
| Merit-based rewards | Stars earned = $SERVE; incentivizes quality service not just participation |
| GPS verification optional | Android compatibility issues; blocking on GPS caused too much friction |
| Follow approval optional | Privacy control without making it the default friction |
| No dollar value display | Avoid SEC/token securities issues; show only $SERVE amounts |
| Bi-weekly payout removed from UI | Token not live yet; kept as plan, removed from dashboard to avoid confusion |
| Static restaurant QR | One QR per restaurant, never expires; host toggles staff on/off shift |
| $SERVE not real SPL yet | Phase 2 milestone. Currently Supabase points. TGE triggered by traction milestones |
| Blackbird is complementary, not competition | "Blackbird rates the place. Slate rates the person." A server at a Blackbird restaurant adds value to both platforms. |

---

## Cron Jobs (verify these are running at cron-job.org)

| Job | URL | Schedule | Purpose |
|---|---|---|---|
| Shift cleanup | `https://slatenow.xyz/api/cleanup-shifts?key=[CRON_SECRET_KEY]` | Every hour | Closes shifts older than 12 hours |
| Daily reminder | `https://slatenow.xyz/api/daily-reminder` | 3pm EST daily | **Route does not exist in the code (Oct 2026).** Disable this job or rebuild the route |

---

## Infrastructure to Verify on Restart

After any break (like the 5-month gap in 2026), check these:

1. **Supabase** — Was paused; may need restart. Check all tables still exist and RLS policies are intact.
2. **Vercel** — Visit https://slatenow.xyz. Check deployment is live and env vars are set.
3. **cron-job.org** — Verify both cron jobs are enabled and running.
4. **Resend** — Check email domain `slatenow.xyz` is still verified.
5. **GitHub** — Confirm repo is public at https://github.com/rchaz1990/serve-map.

---

## Traction (as of May 2026)

- ~20 real server profiles
- 40+ vibe reports
- ~1 real QR scan rating
- 0 confirmed restaurant partners
- 0 funding received
- Applied to: Superteam USA ($10K), Solana Foundation ($25K), Solana Mobile Builder ($10K), DD.xyz ($10K), a16z Speedrun (up to $1M), Colosseum Frontier hackathon

---

## Competitive Position

"Blackbird is Yelp for restaurants on Base. Slate is LinkedIn for servers on Solana."

No Solana dApp found with individual hospitality worker profiles, portable on-chain ratings, or server-specific token rewards. The worker reputation angle on Solana appears to be unbuilt. Blackbird's $85M raise validates the market size — the fact they raised that much for the venue side and nobody built the worker side is the thesis.

---

## Roadmap

| Period | Milestone |
|---|---|
| Q4 2026 | Restart, verify infrastructure, fix critical bugs, first restaurant partner, 50 servers |
| Q1 2027 | Smart contract audit, mainnet prep, 100 servers, 10 restaurant partners |
| Q2 2027 | Mainnet launch, real $SERVE SPL token, Slate Pay live |
| Q3 2027 | $SERVE on Raydium, 250 servers, 25 restaurants |
| 2028 | National expansion, 1000+ servers, data licensing revenue |

---

## Immediate Next Steps (October 2026 Restart)

1. Verify all infrastructure is alive (Supabase, Vercel, cron jobs, Resend)
2. ~~Fix the `server_id` missing from shifts insert (bug #9 above)~~ Done on branch `fix/shifts-server-id-handoff-9` (PR) — still optionally deactivate residual null-`server_id` prod rows
3. Fix manager Google OAuth → blank page issue
4. Run balance backfill SQL if `serve_balance_lifetime` is empty for existing users
5. Restrict vibe report venue search to hospitality types only (bars/restaurants, not schools etc.)
6. Get ONE real restaurant partner on the platform
7. Get to 50 real server signups
8. Form LLC via Stripe Atlas ($500)
9. Re-apply to Superteam / Solana Foundation grants

---

## Notes for AI Tools

- The founder has no coding background. Explain things clearly and check before making assumptions.
- The project folder is at `~/serve-mvp` with the Next.js app in `~/serve-mvp/frontend`.
- Pushes go to GitHub from Terminal 3: `cd ~/serve-mvp && git add . && git commit -m "message" && git push`
- Vercel auto-deploys on every push to `main`.
- Run SQL migrations in Supabase SQL editor BEFORE pushing code that uses new columns.
- The Anchor smart contract is at `~/serve-mvp/programs/serve_mvp/src/lib.rs`.
- Fee payer wallet for devnet transactions: `3WsYRLCAkaB7raRfSrQMhYhESQEfYq4UWfSMq1eWLRHz`

---

*Generated October 2026; corrected 2026-10-07 against the live repo, Vercel and Supabase. Traction numbers above are from May 2026. No secret key values are included in this document.*
