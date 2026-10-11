# Next-chat handoff: Chapter 1 assessor preparation

Release PR: https://github.com/jongsky25/BHW-Connect-Phase-2/pull/288

This handoff was prepared during release. Check the PR's final status, exact merge
commit and Vercel production deployment before assuming the release is live.
The PR description is the release-status record; do not infer activation from
the default-off migration files.

## Implemented scope

Chapter 1 now has bilingual objectives/responsibilities, preparation sequence,
an eight-step replayable fictional navigation tour, an explicit versioned personal
acknowledgement and a seven-step personal preparation checklist. Study uses all
42 required lessons across nine subchapters, current revisions, saved bookmarks
and current assessor exam attempts. It recommends one next action and keeps
missing publication and unknown status distinct from unfinished work.

Existing active/suspended/revoked qualification records remain separate from
revised certification. Tour replay never grants competency. Acknowledgement is
onboarding evidence, not an award. The platform competency simulation, revised
Chapter 1 issuer and overall three-chapter award are still unavailable. BHW lesson
content, narration and the newer learner-assessment release were not rewritten.

Read these first:

1. `CLAUDE.md` and `docs/session-handoff.md`.
2. `docs/chapter-1-assessor-facilitator-flow-plan.md` (increment/dependency plan).
3. `docs/chapter-1-assessor-flow-contract.md` and
   `docs/chapter-1-assessor-state-contracts.md` (draft decisions and authority).
4. `docs/chapter-1-assessor-briefing-handoff.md` and
   `docs/chapter-1-assessor-preparation-handoff.md` (implementation boundaries).

## Next feature: C1AF-06 scoring orientation

Work in a new branch from current `main`, in one bounded PR. Improve the current
scoring orientation before building the later full platform simulation:

- Show human criterion titles and approved anchors beside each case.
- Resume the first unfinished orientation lesson and keep retry/error handling
  clear. Preserve already recorded orientation passes.
- Add a fictional evidence-entry and insufficient-evidence explanation before
  the scored exercise. Use no production BHW records for practice.
- Preserve server scoring, the current seven-of-eight threshold and mandatory
  safety-case correctness. Review eight-case/nine-subchapter coverage separately;
  do not silently add scored cases or change the rule/version.
- Keep scoring calibration separate from the later coached facilitation and
  assessment simulation. Do not mark that simulation complete from this exercise.

Do not activate draft mappings or award prerequisites. All 42 proposed criterion
identities/groupings remain unreviewed; source fingerprints are a dated audit
snapshot and must be reconciled with subsequent lesson changes before approval.

## Release and database rules

Use the connected GitHub/Supabase tools if shell GitHub credentials are invalid.
Never develop or run E2E against the pilot (`ltzicxyefizxoqhfuuzc`). CI constructs
its own local Supabase stack and runs `e2e/assessor-preparation.spec.ts` to check
explicit save, replay, reload and checklist access. The spec rejects hosted DBs.

The workspace previously ran out of its 32 GB disk while unpacking Docker's
Supabase database image. Native PostgreSQL and isolated browser checks passed,
but full-stack release verification must be obtained from CI before merge.

The two reviewed migration files introduce explicit program/chapter/cohort
controls and versioned acknowledgement. The later acknowledgement migration
also preserves both assessor-role flags and the newer `chapter1_assessment_v2`
role scope after all earlier migrations replay. Apply a PR's reviewed migrations
together once at merge, following `docs/deploy-runbook.md`.

Keep `assessor_flow_writes`, `assessor_flow_awards` and authority cutover disabled
until their later approved implementations are ready. A UI rollback must never
erase a future persisted authority cutover. The navigation gate/checklist is not
an authorization boundary; future official actions must check canonical evidence
on the server. Overall certification requires three compatible chapter awards,
without an extra overall exam; Chapter 3 remains unavailable.
