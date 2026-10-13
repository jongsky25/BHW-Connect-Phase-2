# C1AF-13 implementation handoff — guarded practice evidence

## Scope

This increment starts from `928cb530` on `main`. It adds a separate Chapter 1 practice-evidence ledger in `assessor_rollout_private`. It does not extend or rewrite `competency_observations`, learner progress, formal assessments, or awards. Existing unmapped observations remain available as legacy history under their current read policy; nothing copies them into the new ledger or treats them as formal eligibility.

The new `practice_criteria` table holds a reviewed, versioned criterion and bilingual rubric snapshot tied to an exact published lesson revision. It is deliberately empty after migration. A future reviewed release must insert the approved criterion, source fingerprint, decision reference and approving user, then enable that version. The draft C1AF-03 registry cannot be silently promoted by the application. The private table has no Data API grants.

The new immutable `practice_attempts` table stores the learner, observer, Chapter 1 criterion and version, rubric/source snapshot, evidence sufficiency, optional performance rating, observed facts, prompts, private notes, feedback, next step, optional run activity snapshot, request ID, and a retry or correction link. `not_observed` and `insufficient` require a null rating; `sufficient` requires a rating and factual evidence. A repeat request returns the same attempt only when the normalized payload matches. Corrections and retries append a linked record; existing attempts cannot be edited or deleted. A second correction of the same predecessor is rejected.

`rpc_assessor_practice_record` rechecks active assessor identity, current Chapter 1 award and approved award contract, criterion/revision availability, both rollout flags, persisted cohort write/cutover state, BHW membership in that same cohort, current catchment and learner status for every write. Super-admin preview and legacy AF-05 qualification alone cannot write. An optional activity link requires the assessor's same-course session, a run or adapted activity for the lesson, and that BHW's attended enrollment; individual practice needs no session. `rpc_practice_evidence_history` returns only the assessor's own attempts for an in-scope learner, or only that learner's explicitly released feedback. Private notes and unreleased feedback never enter the learner projection.

The migration seeds no criterion, flag, cohort, cutover or award. Consequently this release adds the backend contract without opening an official Chapter 1 write path. It supplies no formal pass, observation UI, component decision, learner progress or certificate authority. C1AF-14 owns the lesson-to-observation action and interface.

## Verification and release boundary

`scripts/tests/c1af13-practice-database.test.mjs` executes the exact migration in an isolated PGlite database. It covers closed rollout, anonymous/foreign actor and catchment denial, disabled criterion and suspended award, insufficiency without a grade, retry identity, immutable correction history, attended activity snapshots and learner feedback privacy. Run it with `npx vitest run scripts/tests/c1af13-practice-database.test.mjs`.

The local `supabase start` full replay was attempted but Docker's Postgres image extraction reported `no space left on device`; fresh PR CI must complete its disposable Supabase migration replay before merge. Do not substitute the isolated SQL test for that replay. Run typecheck, lint, `assessor:check`, build and relevant tests. Do not develop, seed or run E2E against the pilot.

At merge time, review this single migration and apply it to the pilot once under `docs/deploy-runbook.md` after the Disk IO budget check. Keep the practice criterion registry empty and the current rollout gates unchanged. Post-deploy verify the new private tables and RPC grants, confirm legacy observation counts and existing attendance, assessment, progress and award counts are unchanged, and run the normal authenticated production smoke. A separate reviewed approval/release package is required before actual C1AF-13 practice writes can be enabled. Rollback can remove the RPCs and tables only if no new practice attempts exist; preserve any recorded immutable evidence and snapshots if a later activation has occurred.

## Next boundary

C1AF-14 may use this record contract to add a lesson-linked observation flow with explicit learner and criterion, evidence before rating, an insufficient-evidence route, private notes and releasable feedback, and unsaved-change protection. It must not read a practice rating as a formal component pass. Canonical mapping/rubric approval, component sufficiency and reassessment policy, simulation and issuer policy, and historical conversion remain separate review gates.
