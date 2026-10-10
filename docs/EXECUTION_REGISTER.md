# Slate Execution Register
Last updated: 2026-10-09
Status: Initial register; planning record, not evidence of completion or authorization.

## Purpose
Record consequential next steps, experiments, blockers and founder decisions so they survive chats. Keep this short and current. Each entry must state WHY, OWNER, STATUS, NEXT ACTION, EVIDENCE, and DEPENDENCIES. Proposed plans are not approvals. No new agent permissions are granted by this document.

## Active entries

### SLATE-001 — Stranger Test
- Type: Field experiment | Priority: P0 | Status: Protocol pending; not yet confirmed run
- Why: Test whether unfamiliar NYC hospitality workers activate Slate, and separately whether real guests scan, rate or follow. Longer-term portable relationships are not established by this first test.
- Owner: Founder decision; Vera proposed coordinator; Jack QA/evidence, Larry recruitment research, Chrissy honest copy, Coach sequence, Hazel readiness checks (proposed assignments).
- Known: Atlas reports scan → rate → follow worked end-to-end in prior internal testing. This is NOT stranger-test evidence. Original participant count, script and pass/fail thresholds are unverified. A prior seven-person planned-gathering recruitment discussion may be a distinct experiment; do not combine without confirming.
- Next action: Vera proposes minimum executable worker protocol and separate guest protocol, with recommended sample size, behavioral measures, consent/privacy safeguards and explicit stop/go criteria. Founder approves field outreach and execution.
- Dependencies: Confirm only necessary live product capabilities; email is not a dependency for scan/rate/follow.
- Completion evidence: Dated, consent-appropriate observed worker and guest actions, failures, denominators and founder continue/revise/stop decision.
- Decision (founder, 2026-10-09): the first Stranger Test baseline evaluates the natural interface **without guided onboarding hints**. Interactive first-time hints stay on hold; if added later, ship them before a round and keep them fixed for that round (or use a defined comparison group). Hints must never suggest a score or push following. For Vera's protocol.
- Prerequisite noted (2026-10-09): first-time guest rating flow fix (draft kept through sign-up/sign-in, returns to the worker's rating page) — separate draft PR, needs approval to deploy before the baseline.

### SLATE-002 — Shift email reliability / PR #37
- Type: Engineering fix and diagnostic | Priority: P1 | Status: Atlas reported PR open, reviewed as safe to merge; merge/deployment NOT verified here
- Why: Prevent Resend send rejections from being counted as success; independently diagnose provider delivery versus inbox placement.
- Owner: Atlas technical review/implementation; founder approves merge.
- Known: Atlas reports build, typecheck and lint pass; no automated behavior tests or independent review. SPF and DKIM passed in provided headers. Inbox placement inconsistent: founder reports another follower received notification outside spam. Raw headers already showed a text/plain MIME part, so do not assume adding plain text alone solves placement.
- Risks: Notification row may be written before actual send and thus overstate success. Provider Delivered is not proof of Inbox. DMARC DNS record not verified.
- Next action: Confirm current PR status and founder merge authorization; after authorized deployment, run controlled send and record provider outcome, Inbox/Spam, and any errors. Do not change DNS without approval.
- Dependencies: Not a blocker for core Stranger Test scan/rate/follow; notification-return experiment depends on reliable exposure.
- Completion evidence: PR merge SHA and production deploy, provider send log, inbox placement observation, documented residual limitations.

### SLATE-003 — Portable reputation hypothesis
- Type: Strategic hypothesis / research | Priority: P1 | Status: Unvalidated
- Why: Founder vision: hospitality workers can carry professional reputation and guest relationships across employers.
- Owner: Founder strategic authority; Vera coordinates one focused 5–10 minute research round, Larry leads market evidence (proposed).
- Next action: Investigate adjacent solutions and disconfirming evidence, including whether workers already have adequate alternatives or do not value portability; translate findings into falsifiable next-step experiments. Start actual assigned work immediately after the short round.
- Dependencies: Distinguish existing Slate features from aspirational capabilities. Do not claim long-term portability, rewards or economic outcomes are proven.
- Completion evidence: Concise sourced findings, contrary evidence, specific recommended test and founder decision.

## Operating rule
1. Capture any founder-approved critical next step or consequential open question here before it disappears into a chat.
2. Each work handoff references an entry ID; report observed evidence separately from claims and proposals.
3. Update status and next action after meaningful work; do not mark complete without evidence.
4. Review P0 items first when planning. Avoid duplicative planning, extra ceremonies or Academy work blocking real execution.
5. This register is a lightweight Slate-specific starting point, not an automatic cross-project dashboard. No deployments, outreach, spending, PR merges or agent permission changes are authorized by editing it.
