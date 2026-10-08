# Slate Operations Follow-ups
Last updated: 2026-10-08
Status: Tracking record. Planning, not evidence of completion or authorization.
Companion to [`EXECUTION_REGISTER.md`](EXECUTION_REGISTER.md) (same entry format: why, owner, status, next action, evidence, dependencies).

Editing this file authorizes nothing: no deployments, migrations, credential or environment changes,
spending, outreach, PR merges, or agent permission changes. No new work is assigned to any agent here.

## Summary

| ID | Item | Class | Status |
|---|---|---|---|
| OPS-004 | Current deployment sequence (migrations 31 → 30, PR #39, smoke test) | **Immediate blocker** for resuming the Stranger Test | Prepared; each step separately approval-gated |
| OPS-002 | Public wording and participant trust | **Immediate blocker** for recruiting unfamiliar workers or guests | Open |
| OPS-001a | One-off verified backup before production changes | **Immediate blocker** for OPS-004 | Method prepared; not run |
| OPS-003 | `FEE_PAYER_PRIVATE_KEY` exposure | Near-term security follow-up | Open; not a rollout blocker |
| OPS-001b | Permanent backup and disaster recovery | Longer-term improvement | Open |

---

## OPS-001 — Backup and disaster recovery

### OPS-001a — Temporary one-off backup (short-term safety measure only)
- Type: Operational safeguard | Priority: P0 | Status: Method designed and dry-run locally; not run against production.
- Why: Supabase organization is on the Free plan. Supabase documents automatic daily backups and point-in-time recovery only for paid plans, so no restorable production backup currently exists.
- Approach (temporary): one manual GitHub Actions run in a temporary **private** repository. Read-only production dump, restore into an empty Postgres 17, compare fingerprints of tables and objects (row contents, columns, constraints, indexes, functions and their permissions, triggers, policies, RLS flags, table/column grants, sequences, views, types, default privileges), copy public Storage files, encrypt with AES-256 under a founder-held passphrase.
- Owner: Founder runs it; Atlas prepared the scripts.
- Next action: Founder decision on setup. The database password must already be known (no credential resets).
- Completion evidence: run `RESULT: PASS` line (0 differences); encrypted artifact downloaded to encrypted founder storage; temporary database secret deleted.
- Cleanup: remove the temporary repository and secrets **only after** the encrypted artifact is preserved.

### OPS-001b — Permanent backup and disaster recovery
- Type: Infrastructure | Priority: P1 | Status: Open. The OPS-001a approach is **not** the permanent solution.
- Why: Slate needs recurring, restorable backups that do not depend on ad-hoc credentials or temporary repositories.
- Scope:
  - Recurring database backups with secure storage and a defined retention period.
  - A written, **tested** restore procedure (periodic restore drills, not just dump creation).
  - Gaps the temporary backup does not cover: Supabase Auth configuration and settings, database roles and memberships, extensions, Supabase-managed schemas, and Storage files (all buckets, including private ones).
  - Confirm recovery works **before larger production changes**.
  - Remove temporary credentials and repositories only after backup artifacts are securely preserved.
- Options to evaluate (no decision made): Supabase paid plan backups / point-in-time recovery; scheduled `pg_dump` to encrypted storage owned by Slate; Storage sync.
- Owner: Founder decision (cost and storage location); Atlas technical design when requested.
- Next action: Founder chooses a direction after OPS-004 is complete.
- Completion evidence: documented procedure, a successful timed restore drill, and retention/storage location recorded.

---

## OPS-002 — Public wording and participant trust
- Type: Product truth / legal | Priority: P0 for recruitment | Status: Open. **PR #39 does not resolve this.**
- Why: Vera's participant-readiness review found claims that may not match how the product actually works. Unfamiliar participants must not be recruited on inaccurate or unconsented terms.
- Scope:
  - Review and correct potentially inaccurate claims about Solana, permanent/immutable ratings, $SERVE tokens and rewards, Slate Pay, and cash payouts.
  - Reconcile the website, Terms of Service, Privacy Policy, and actual product behavior.
  - Obtain legal review where necessary (Terms and Privacy at minimum).
  - Existing draft: PR #36 (copy-only messaging corrections) is unmerged and was flagged for legal review; it may cover part of this scope.
- Rule: **Keep unfamiliar-participant recruitment paused** until wording and consent concerns are resolved.
- Owner: Founder decision; legal reviewer to be chosen by founder.
- Next action: Founder decides scope of corrections and legal review.
- Completion evidence: merged corrections, legal sign-off where required, and a founder decision recorded to resume recruitment.

---

## OPS-003 — `FEE_PAYER_PRIVATE_KEY` exposure
- Type: Security | Priority: P1 | Status: Open. Not a blocker for OPS-004.
- Known (2026-10-08, metadata only; no values read):
  - The variable is set for Development, Preview and Production in Vercel and is not marked Sensitive (Vercel flags it as a readable secret). Any preview build of any branch can read it.
  - No application code on `main` reads it; Solana code is devnet-only with in-browser demo keypairs.
  - The `FEE_PAYER_PRIVATE_KEY=` text in repository history (`HANDOFF.md`) is a placeholder, not the key.
- Next actions (founder approval required for each):
  - Remove it from Development and Preview; remove it from Production too if nothing outside the app uses it, otherwise re-add it as Sensitive, Production only.
  - Check whether the keypair holds mainnet funds or any authority. If yes, rotate now. If devnet only, retire it and never use it for mainnet, token mint, or program authority.
- Owner: Founder.
- Completion evidence: Vercel variable scope after the change; recorded rotation/retirement decision.

---

## OPS-004 — Current deployment sequence
- Type: Release | Priority: P0 | Status: Prepared and preflighted; **every step separately approval-gated**. Nothing below has been run.
- Order:
  1. OPS-001a backup completed and verified.
  2. Migration 31 — `frontend/supabase-sql/signup/31_link_by_owner_or_verified_email.sql` (closes the legacy-email takeover), then verify.
  3. Migration 30 — `frontend/supabase-sql/signup/30_one_profile_per_account.sql` (one profile per account), then verify.
  4. Merge PR #39 (signup recovery and `/api/signup-server` authentication) → Vercel production deploy.
  5. Controlled production smoke test with a fresh `?test=1` worker signup.
- Rollbacks: `30_rollback…` / `31_rollback…` (tested); Vercel instant rollback to the current production deployment.
- References: PR #39 (head `e2bdf00` at preflight); migration README in `frontend/supabase-sql/signup/README.md`.
- Owner: Founder approves each step; Atlas executes or guides only after approval.
- Completion evidence: migration verification output, deployment ID, smoke-test result.
