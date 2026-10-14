# C1AF-16 implementation handoff — component readiness

## Scope

This PR starts from `5d497f3e` on `main` and adds one read-only Chapter 1 component readiness RPC. It returns one result per module for a selected in-catchment BHW, with separate learner prerequisites, assessor authority, and explicit blockers. The assessor working area shows these results only for the selected roster learner. Reading readiness creates no assignment, assessment, notification, award or certificate.

The private, initially empty component contract records a reviewed module mapping: required lesson IDs, required criterion IDs and versions, optional required test phases, requirements/rubric versions and approval reference. The RPC checks the published Chapter 1 course, each required lesson's current published revision and the learner's matching completion, enabled current criterion snapshots and matching approved award contract, and submitted tests for a current validated learner test release only when a phase is explicitly required. It does not use chapter-wide completion or impose the assessor's exam score on the BHW. An old lesson completion is a stale-evidence blocker. Practice attempts remain context and do not satisfy formal component evidence.

Authority separately checks the actual active assessor, Chapter 1 award and version, feature flag, persisted cohort cutover and selected BHW membership, catchment, and an existing active assignment to another assessor. The private assignment table has no client write grant or mutation RPC; C1AF-17 owns its claim/release lifecycle. Invalid actors and out-of-catchment learners are denied before any component data is returned. The new tables have RLS and no direct authenticated policies.

## Verification

- `scripts/tests/c1af16-readiness-database.test.mjs` executes the exact migration in isolated PGlite. It covers direct table and actor denial, catchment and self-read denial, empty contracts, component-only progress, old or unpublished revisions, missing/withdrawn tests, unapproved rubric, revoked/wrong-chapter award, competing assignment and transfer out of catchment. It confirms the read does not create an assignment.
- `src/app/training/assessor-workspace.test.tsx` checks the selected-learner blocker display and absence of a formal assessment action.
- Run typecheck, lint, `assessor:check`, production build and focused readiness/workspace tests. Fresh PR CI must pass disposable Supabase migration replay and browser smoke tests. Do not use the pilot for development or E2E.

## Release boundary

At merge, follow `docs/deploy-runbook.md`: check pilot Disk IO, apply this single additive migration once, verify the private tables and authenticated RPC grant, then squash merge and let Vercel deploy. Verify the approved component registry and assignment table remain empty; `assessor_flow_writes` and cohort writes remain off with no cutover. Existing practice, formal assessment and award counts must not change. Smoke the manual and assessor working area. An empty registry must show approval blockers, never readiness.

Before a later live pilot, reviewers must approve each component's exact required lessons, criteria and versions, any actual required test phase, source/review reference and matching rubric/award contract. Activation must be deliberate and must not infer a policy from the draft audit mapping. Recheck changed lesson revisions and learner test release identity. C1AF-17 owns assessment requests, atomic claims and arrangements; C1AF-18 owns formal evidence and outcomes. Neither should treat C1AF-13 practice ratings as a formal pass.
