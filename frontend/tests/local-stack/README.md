# Local real-database stack (no production)

Real Postgres + PostgREST with production's grants, RLS and functions
(`local-tests/00_supabase_shim.sql`, `01_prod_baseline.sql`, `10_additive.sql`, `20_tighten.sql`),
and `gateway.js`: Supabase-shaped URLs, a simulated sign-in that issues real signed
tokens (email confirmation OFF, as in production), and `/rest/v1` proxied to PostgREST.

On 2026-10-08 the local policies, column grants and linking functions for
servers / server_restaurants / restaurant_managers / notifications / follows
fingerprinted identical to production (146 items, same md5).

```bash
# 1. database (local Postgres on :54329, socket /tmp)
createdb slate_stack; psql -f …/00_supabase_shim.sql -f …/01_prod_baseline.sql -f …/10_additive.sql -f …/20_tighten.sql
psql -c "create role authenticator login noinherit password 'local-only'; grant anon, authenticated, service_role to authenticator"
# 2. PostgREST v12 on :54401 (db-anon-role=anon, jwt-secret=<same secret as gateway>)
# 3. node gateway.js 54400 54401 <secret> keys.json        # writes anon/service keys
# 4. build + start the app with only: NEXT_PUBLIC_SUPABASE_URL=http://localhost:54400,
#    NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon>, SUPABASE_SERVICE_ROLE_KEY=<service>, dummy Resend/Beehiiv keys
node stack.test.js http://localhost:3103 keys.json         # API + database security tests
STACK_DB=slate_stack EMAIL=x@example.com node ../isolated/flow.js http://localhost:3103 stack interrupt-before-api
```

## Vibe reports (`vibe.test.js`)
Apply `supabase-sql/security/33_submit_vibe_report.sql` to the local database first, then:
```bash
node vibe.test.js http://localhost:3104 keys.json   # 25 checks: auth, forged identity/location, limits, races, permissions
```

## Ratings (`rating.test.js`)
Apply `supabase-sql/security/34_rating_limits.sql` to the local database first, then:
```bash
node rating.test.js http://localhost:3104 keys.json   # 15 checks: identity, limits, self-rating, races, direct DB access
```

## Verified managers (`manager.test.js`)
Apply `supabase-sql/security/36_verified_managers.sql` to the local database first, then:
```bash
node manager.test.js http://localhost:3104 keys.json   # 32 checks: verification binding (name + address), shifts, routes, recruiting boundary, dashboard
```
Deploy-window check (code before migration): apply `36_rollback_verified_managers.sql`, then
`node manager-premigration.test.js http://localhost:3104 keys.json` (6 checks: managers refused, dashboard pending, workers unaffected).

## Recruiting consent (`consent.test.js`)
Apply 36 and `37_recruiting_consent.sql`, start the app with `RESEND_BASE_URL=http://localhost:54400`
(the gateway records emails instead of sending), then:
```bash
node consent.test.js http://localhost:3104 keys.json   # 22 checks: hidden default, one per pair, daily limit under concurrency, delivery outcomes + reconciliation logging, access (set APP_LOG=<app log> to check log lines)
```

## Terms/Privacy acknowledgment and public copy (`legal.test.js`)
```bash
node legal.test.js http://localhost:3104 keys.json   # 30 checks: acknowledgment (worker sign-up, guest sign-up, rating, follow), follow-after-rating, shift disclosure, corrected copy, /whitepaper 404
```

## Follow emails (`follow.test.js`)
Apply `38_follow_email_consent.sql` (after 36/37), start the app with `RESEND_BASE_URL=http://localhost:54400`, then:
```bash
node follow.test.js http://localhost:3104 keys.json   # 19 checks: no third-party enrolment, explicit opt-in only, no follower emails to workers, Google consent gates
```
Note: `vibe.test.js` check "4th eligible report" fails during the first UTC hour of a day (its seeded
reports then fall inside the 1-hour flag window). Test artifact, not a product change.

## First-time guest rating flow (`rating-draft.test.js`)
Run on the integrated stack (36 + 37 + 38 applied); pass the app log path as the third argument:
```bash
node rating-draft.test.js http://localhost:3104 keys.json <app.log>   # 22 checks: draft kept through sign-up/sign-in/confirmation (incl. link opened on another device)/Google, never auto-submitted or auto-consented, no leaks
```
