# C1AF-17 implementation handoff — requests and arrangements

## Scope

This PR starts from C1AF-16 on `main` (`ef0736a2`) and adds one explicit Chapter 1 component request and arrangement lifecycle. An eligible assessor requests a ready component for a selected BHW. A bounded, scoped queue lets an eligible assessor claim it atomically, set or reschedule an agreed date and place/channel, cancel it, or release a claim back to pending. A second currently authorized assessor can release an unavailable assessor's claim. The BHW sees only their own request, the reviewed purpose and criteria frozen at request time, and the active arrangement. An in-app notification is created once per arrangement, reschedule, cancellation or release event. Claiming or arranging never creates formal evidence, an outcome, an award or a certificate.

All mutations recheck the actual actor, cohort write cutover, feature flags and current catchment. Request, claim and arrangement recheck C1AF-16 component readiness. Claim and arrangement also reject a changed requirements/rubric contract. Request row locking and unique active indexes prevent competing claims; request keys make retries idempotent. Private tables have RLS and no direct authenticated policies. Read APIs are scoped separately for assessor queue and BHW ownership. The request snapshots the reviewed bilingual purpose and criterion descriptions; blank labels cannot be entered into an approved contract. The component registry remains empty on the pilot.

## Verification

- `scripts/tests/c1af17-arrangements-database.test.mjs` executes the exact C1AF-16 and C1AF-17 migrations in isolated PGlite. It verifies closed writes, private table denial, scoped request creation, duplicate request collapse, one active claim, idempotent arrangement and notifications, reschedule, owner and unavailable-assessor release, cancellation, changed award, BHW ownership and catchment transfer.
- The working area test checks that request and claim actions appear for a ready selected learner and do not expose a formal outcome action. The BHW route test checks role/preview denial and reviewed purpose, criteria and arrangement display.
- Run focused tests, typecheck, lint, `assessor:check`, production build and a disposable full Supabase migration replay. Fresh PR CI must pass its own Supabase replay and browser smoke tests. Do not run development or E2E against the pilot.
- Local `supabase start` stopped before migrations while Docker pulled an image (`failed to register layer: no space left on device`). This is a host storage limit, so the fresh PR CI replay is the required full Postgres migration gate.

## Release boundary

At merge, follow `docs/deploy-runbook.md`: check pilot Disk IO, apply this single additive migration once, verify the new private tables and authenticated RPC grants, then squash merge and let Vercel deploy. Verify the component registry and request/assignment/event tables remain empty; `assessor_flow_writes` and cohort writes remain off with no cutover. Existing practice, formal assessment and award counts must not change. Smoke the manual, assessor working area and BHW request empty state. The approved contract registry is empty, so no official request or claim can be created on the pilot.

Before a later live pilot, reviewers must approve and enter each component's exact lessons, criteria, versions, bilingual purpose/criterion text and matching rubric/award contract; recheck learner test release identity and changed lesson revisions. Enable writes and persisted cohort cutover only in an explicit activation step. C1AF-18 owns formal evidence, submission and outcomes. It must recheck readiness and assignment at submission and must not treat C1AF-13 practice ratings or a C1AF-17 claim as a formal pass.
