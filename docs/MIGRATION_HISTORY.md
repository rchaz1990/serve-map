# Database migration history and the Supabase migration ledger

**Status:** documented 2026-10-09. The ledger is **not** modified.

## The drift

Supabase's ledger (`supabase_migrations.schema_migrations`) lists only 4 entries:

| Version | Name |
|---|---|
| 20261005135625 | `funnel_instrumentation` |
| 20261009084010 | `one_profile_per_account` (30) |
| 20261009092948 | `submit_vibe_report_33` |
| 20261009100731 | `rating_limits_34` |

Production also contains objects from SQL that is **not** in the ledger:
- the early schema files in `frontend/supabase-sql/*.sql`;
- hardening `10_additive` and `20_tighten`;
- signup 31;
- security 36 (verified managers) and 37 (recruiting consent).

## Cause

A row is written to the ledger only when SQL runs through Supabase's *apply migration* path. Those 4 entries were run that way.

Everything else was run as plain SQL, through the dashboard SQL editor or *execute SQL*, and that writes no ledger row. Migrations 36 and 37 were run as plain SQL, so their objects are live but unrecorded. The drift is therefore wider than 36 and 37 alone.

## Impact today

- Nothing reads the ledger.
- The repo has no `supabase/migrations` folder, and deploys don't use the Supabase CLI.
- The risk is in the future. A Supabase preview branch, or `supabase db push`/`db reset`, would rebuild only those 4 entries and produce a broken schema.

## Record of truth

- The SQL files in `frontend/supabase-sql/` are the record of what was run.
- So are their verification and check scripts (`security/checks/deploy_post36.sql` and `deploy_post37.sql`).
- So are the deploy runbooks in `docs/`.

## Going forward (one tracked method)

1. **Use *apply migration* for every new migration** (38, 39 and later), with names that match the files: `<nn>_<file name>`. Each run is then recorded.
2. Do not use the SQL editor or *execute SQL* for schema changes, only for read-only checks.
3. Keep each migration's pre-checks, verify queries and rollback file in the repo, as now.
4. **Do not use Supabase branching or the CLI against production** until a baseline exists.
   - If that's wanted later, take a one-time snapshot of the live schema with `supabase db pull`.
   - Commit it as the baseline, then mark it as applied (`supabase migration repair`).
   - That is a separate, reviewed change to the ledger.
