-- One server profile per sign-in account.  NOT YET RUN IN PRODUCTION — needs approval.
--
-- Closes the last duplicate-profile race in /api/signup-server (two requests for
-- the same account committing at nearly the same moment). The API already turns
-- the resulting 23505 into "return the existing profile".
--
-- Only auth-ID (UUID) owners are covered. Four legacy April rows share one older
-- non-UUID value and are left out, so this builds on current data without edits.
-- Checked 2026-10-08 (read-only): 10 UUID-owned rows, 10 distinct owners.
--
-- CONCURRENTLY: no table lock; must run on its own, outside a transaction.
create unique index concurrently if not exists servers_one_profile_per_account
  on public.servers (wallet_address)
  where wallet_address ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
