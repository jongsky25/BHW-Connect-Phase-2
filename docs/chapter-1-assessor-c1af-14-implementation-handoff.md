# C1AF-14 implementation handoff — lesson observation

## Scope

This PR starts from `02723eb4` on `main` and adds the first Chapter 1 lesson to observation flow for published lesson 1.6.2 (`communication-clarify`). The facilitator's Prepare and Run views show the reviewed observation anchor when available. An assessor returning from the working area with a selected learner gets a direct **Observe a BHW** action. The observation page carries that learner, lesson and approved criterion version into the C1AF-13 practice evidence RPC; it does not open a generic roster or choose a criterion by guesswork.

The form asks for observed facts or a reason for unseen work before showing a rating. `not_observed` and `insufficient` save without a rating; sufficient evidence requires a deliberate rating. It distinguishes independent and prompted practice, requires the prompt when selected, and stores private assessor notes separately from releasable feedback. The assessor previews released text, chooses release explicitly, and sees a saved confirmation. Failed saves preserve the draft and a retry uses the same request ID while the payload is unchanged. Navigation links and full page unload warn about unsaved evidence. Earlier practice attempts and unmapped `competency_observations` appear in separate history sections; legacy rows never become approved evidence or a formal pass.

The new read only context RPC checks the actual active assessor, UI flag, persisted cohort UI access, published manual Chapter 1 lesson/revision, and selected BHW catchment. It only returns enabled, reviewed criteria tied to that exact published revision with all Filipino and English anchors. Each criterion is marked recordable only when its requirements and rubric versions match an active Chapter 1 award/contract, cohort membership, write flag, and cutover. The C1AF-13 write RPC remains the final authority and rechecks on save. No criterion, award, flag, cohort, or cutover is seeded or switched by this PR. The pilot therefore remains dormant after the migration and app deployment.

## Verification

- `scripts/tests/c1af14-context-database.test.mjs` runs the exact migration in isolated PGlite and checks closed UI, empty registry, actor/catchment denial, reviewed anchors, and matching write authority.
- `src/lib/assessor/lesson-observation.test.ts` checks learner, lesson, rubric, and return URL validation.
- `src/components/elearning/chapter1-practice-observation.test.tsx` checks unobserved/no grade, prompted evidence, failed save text retention, unsaved navigation warning, and Filipino read only state.
- `src/components/elearning/chapter1-lesson-flow.test.tsx` checks the reviewed anchor and direct lesson action.
- Run typecheck, lint, `assessor:check`, build, and the relevant route tests. Fresh PR CI must pass a disposable Supabase migration replay. Local `supabase start` has previously failed while extracting Docker's Postgres layer because the host ran out of space; the isolated SQL test does not replace CI replay. Do not use the pilot for development or E2E tests.

## Release boundary

At merge, follow `docs/deploy-runbook.md`: review the single additive migration, check the Disk IO budget, apply it to pilot once, then deploy the application. Verify the new context RPC and authenticated grant, unchanged rollout flags/cohort cutover, empty reviewed criterion registry, and unchanged legacy observation, attendance, progress, assessment and award counts. Smoke the existing manual and assessor working area. With UI and write gates still closed, the new action must not appear to pilot users.

A later reviewed activation must approve and insert the exact 1.6.2 criterion and bilingual rubric shape (`observable.fil/en`, `levels.kaya_na|kailangan_practice|hindi_pa.fil/en`), source fingerprint and review reference. It must separately confirm award contract/version, current staff award, selected learner cohort membership, UI/write flags and cutover, then pilot the phone flow in both languages: independent, prompted, not yet, insufficient and unseen attempts; failed save/reload; learner and criterion switching; released versus private text; legacy history. No practice rating creates formal component readiness, a BHW award, or a certificate. C1AF-15 owns follow-up assignment and learner notification.
