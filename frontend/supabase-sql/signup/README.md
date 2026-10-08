# Signup migrations — proposed, NOT run in production

Each needs explicit approval. Run in the Supabase SQL Editor, one file per run.
Both are independent; either order works. Tested on the local real-database stack
(`tests/local-stack`, 25/25) including rollback and re-apply.

| File | What it does | Rollback |
|---|---|---|
| `30_one_profile_per_account.sql` | Unique index: one server profile per sign-in account (UUID owners only; the 4 legacy April rows are left out). Builds without locking (`CONCURRENTLY`), so run it on its own — not inside a transaction or alongside other statements. | `30_rollback_one_profile_per_account.sql` (`drop index concurrently …`) |
| `31_link_by_owner_or_verified_email.sql` | Closes the legacy-email takeover: worker profiles link by owner only; restaurant waitlist rows link by email only for provider-verified sign-ins (Google). Same signatures and grants. | `31_rollback_link_by_owner_or_verified_email.sql` (restores the `10_additive.sql` versions) |

Verify after running:
```sql
select indexname from pg_indexes where indexname = 'servers_one_profile_per_account';           -- 1 row
select proname, md5(prosrc) from pg_proc where proname in ('link_my_server','link_my_manager'); -- matches local
select proname, proacl from pg_proc where proname in ('link_my_server','link_my_manager');      -- no anon
```
