# C1AF-18 implementation handoff — formal component attempts

## Scope

This PR starts from C1AF-17 on `main` (`a5ef1ba0`) and adds one explicit formal assessment attempt per arranged Chapter 1 component request. The assigned assessor must choose **Start formal assessment**. The attempt freezes the approved criteria, source fingerprints, lesson revisions and rubric anchors, then supports a resumable evidence checklist, draft save, review and final submission. Each criterion records sufficiency separately from the existing three performance levels. Unseen or insufficient evidence has a null rating. Submission requires a factual account or explanation and next step for every criterion. The database derives `complete`, `needs_practice` or `insufficient_evidence` from the complete checklist. A submitted request becomes `assessed` and leaves the active assessor queue; the BHW sees only that assessment was recorded, with no outcome shown before C1AF-19 feedback release.

The server rechecks current role, status, catchment, cohort cutover, write flags, award, learner readiness, active assignment, request status, requirements version, criterion mapping, rubric content and lesson revision on every start, draft save and submission. Draft saves use an expected revision, so concurrent or recovered browser sessions cannot silently overwrite one another. Start and submission retries collapse to the same attempt/result. A draft blocks claim release or cancellation. Practice records never enter the formal evidence calculation. This migration creates no chapter certificate, award, approved contract, cohort member, cutover or enabled flag. The existing registry is empty and pilot writes remain closed.

The one attempt per request boundary is deliberate. An `assessed` request also keeps the component's unique active slot, so creating another request cannot bypass that boundary. C1AF-19 must define reviewed feedback release and an explicit reassessment/retry path before another official attempt can be opened. `complete` is a component result only and does not certify the BHW's chapter.

## Verification

- `scripts/tests/c1af18-formal-database.test.mjs` executes the exact C1AF-16, C1AF-17 and C1AF-18 migrations in isolated PGlite. It tests closed writes, private table denial, arrangement and owner gates, draft resume, duplicate submission, optimistic revision conflict, changed criterion wording/rubric/lesson revision, closed write flag, invalid and missing evidence, all three outcomes, hidden BHW outcome and no new chapter award.
- Run `npm run typecheck`, `npm run lint`, `npm run assessor:check`, `npm run build`, focused tests and a disposable full Supabase migration replay. Fresh PR CI must pass its own migration replay and browser smoke checks. Do not run development or E2E against the pilot.
- Local Docker image pull previously exhausted host storage, so fresh PR CI is the full Postgres migration gate. The exact migration test is a targeted fast check, not a replacement for CI replay.

## Release boundary

After review and approval, follow `docs/deploy-runbook.md`: check pilot Disk IO; apply this single additive migration once; verify the new private table, RLS and authenticated RPC grants; then squash merge and let Vercel deploy. Check the new `formal_attempts` table is empty, the approved component registry and request/assignment tables remain empty, and both global and cohort writes remain off with no cutover. Smoke the assessor working area, BHW request empty state and manual. A migration apply must not enable formal actions or issue chapter awards.

Before any live pilot, reviewers must approve component mappings, exact source revisions, rubric anchors and outcome interpretation, and retain the C1AF-17 readiness and test release checks. Activation needs a separate explicit decision. C1AF-19 owns feedback release, reassessment policy and Chapter 1 award aggregation; it must not infer a chapter pass from a single `complete` component attempt or from a practice rating.
