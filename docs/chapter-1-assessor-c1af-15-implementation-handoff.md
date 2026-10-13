# C1AF-15 implementation handoff — feedback and follow-up

## Scope

This PR starts from `3946d822` on `main` and implements only the C1AF-15 feedback and follow-up loop for published Chapter 1 lesson 1.6.2. A private follow-up ledger links one source practice attempt to a next practice or observation action, responsible assessor, optional agreed date, and open/completed/cancelled lifecycle. It preserves an event history and per-request idempotency. Completion may link a later attempt for the same learner, chapter, lesson and criterion, recorded by the responsible assessor after the plan was created. A retry remains a separate immutable practice attempt. An assessor can reassign an open plan to another currently eligible assessor; only the responsible assessor can complete it. The working area links to an outstanding queue, and the lesson observation page lets staff plan, reassign, cancel and complete work.

The BHW page shows only the BHW's released feedback, next step, and visible follow-up plan. Private assessor notes, unreleased attempts, observation facts and prompts are excluded by the server projection. A released attempt inserts one personal in-app notification with a generic message and a link to that page. The notification insert is bounded by a unique recipient/attempt index and only runs when feedback was released at the original C1AF-13 save. The existing notification bell still follows its own feature flag. The page explains that practice prepares the BHW and that formal assessment and certificate decisions are separate.

The follow-up RPCs recheck the actual active assessor, current Chapter 1 award and matching source requirements/rubric contract, published manual/lesson, learner cohort, write flag, cutover, and catchment. Read and write tables are private with no direct authenticated grants. No practice result issues a certificate or changes a formal assessment.

## Verification

- `scripts/tests/c1af15-followup-database.test.mjs` executes the exact migration in isolated PGlite. It checks closed writes, actor/assignee denial, idempotent create/update, reassignment, overdue and cancelled plans, cross-assessor retry linkage, no notification before release, exact recipient after release, and the private-note boundary.
- Run `npm run typecheck`, `npm run lint`, `npm run assessor:check`, `npm run build`, and the relevant C1AF-13/14 tests. Fresh PR CI must pass full disposable Supabase migration replay. Do not develop or run E2E tests against pilot.

## Release boundary

At merge, follow `docs/deploy-runbook.md`: review the single additive migration and Disk IO budget, apply it to pilot once, then deploy the application. Verify its private tables/RPC grants, notification constraint/index/trigger, unchanged rollout flags, cohort cutover and criterion registry, and unchanged legacy observation, assessment and award counts. Smoke the Chapter 1 manual, assessor working area, practice follow-up queue and BHW feedback empty state. The pilot currently has assessor UI access but `assessor_flow_writes=false`, cohort writes off, no cutover and no reviewed practice criteria or attempts. This PR does not activate or seed those controls. The new write path should remain closed; existing BHW learning stays available.

Before a later live pilot, approve and insert the reviewed 1.6.2 criterion and bilingual rubric, confirm the matching award contract and current staff award, explicitly enable the write flag and cohort cutover, then run a bilingual phone pilot of release, private notes, notification, reassignment, overdue/cancelled work and a linked retry. No follow-up action should imply formal component readiness. C1AF-16 owns that separate server-side readiness contract.
