# Stranger-test hardening (Oct 2026)

Closes the open database access rules and fixes the follow loop. Nothing here has been
applied to production; each step needs founder approval.

## Order (do not change)

1. **Run `10_additive.sql`** in the Supabase SQL editor.
   Adds helper functions and follow triggers, backs up `follows` and follower counts to a
   private `backup` schema, removes 2 duplicate follows, approves 3 follows stuck as
   "pending" on automatic-approval servers, and recounts follower counts (2 servers change).
   Removes no access, so the current live site keeps working.
2. **Merge and deploy the app changes** on branch `atlas/stranger-test-hardening`.
   The new code works with or without step 3.
3. **Run `20_tighten.sql`.** Replaces every open browser rule with owner-only writes and
   hides emails, phone numbers and GPS columns from public reads. The old app code breaks
   under these rules, so step 2 must be live first.
4. **Phone test** (see the readiness report): scan → rate → follow → start shift → email.

## Rollback

- Undo step 3: `29_rollback_tighten.sql` (restores the Oct 7 rules exactly).
- Undo step 1: `19_rollback_additive.sql` (after undoing step 3; restores follow rows and counts from the backup).

## Local tests

`local-tests/run_tests.py` rebuilds a throwaway Postgres from the production structure
(no production rows), seeds synthetic users, and checks 115 cases (with Supabase's automatic function grants reproduced): the holes open today,
old-code compatibility after step 1, every browser query and write the new code makes,
attacks that must fail, and both rollbacks.
Needs a local Postgres on `/tmp:54329` and `pip install "psycopg[binary]"`.
