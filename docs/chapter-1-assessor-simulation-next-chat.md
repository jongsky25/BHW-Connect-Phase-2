# Next-chat handoff: C1AF-06a simulation storyboard

Prepared 12 October 2026 after the production release of PR #289.
This handoff PR changes documentation only; it does not implement the simulation.

## Starting prompt

> Continue from PR #289 and `docs/chapter-1-assessor-simulation-next-chat.md`.
> Start from current main and implement C1AF-06a in a small PR: a bilingual
> fictional Maria simulation story, versioned checkpoint contract and clickable
> local storyboard for owner review. Keep the storyboard isolated from real
> learner records and defer persistence/completion receipts to C1AF-06b. Preserve
> existing passes, scoring rules and qualifications. Keep revised writes, awards
> and authority cutover disabled. Do not approve draft criterion mappings or
> invent missing rubric decisions. Document blockers and demonstrate the concrete
> storyboard before asking for content approval.

If this documentation PR is still open, read it from its branch, but base the
implementation on current main. Do not stack implementation on a stale release
branch or silently merge this handoff PR without authorization.

## Released state

- [PR #288](https://github.com/jongsky25/BHW-Connect-Phase-2/pull/288): opening
  briefing, replayable navigation tour, versioned personal acknowledgement and
  seven-step preparation checklist. Merge `25e63cc621f3982bdb9d8497baebcd1355951b92`.
- [PR #289](https://github.com/jongsky25/BHW-Connect-Phase-2/pull/289): C1AF-06
  scoring context and recovery. Merge `a951b0129422524a9f6ac0d7217fb9047508a96c`.
  Human criteria and exact existing anchors appear beside each case for the
  enabled cohort. Lesson resume starts at the first unfinished lesson; ambiguous
  saves can recover server-recorded progress or a pass. The Alex/Rosa evidence
  walkthrough is fictional, local and unsaved.
- Production [deployment](https://vercel.com/jongsky25s-projects/bhw-connect-phase-2/J3RJJwfyzzwDgP7A8auh5Wyfnxqf)
  was verified READY at the #289 merge SHA, aliased to
  https://bhw-connect-phase-2.vercel.app. Login returned 200; signed-out orientation
  redirected to login. No error/fatal logs appeared during the verification window.
  There was no authenticated production browser session.
- Read-only production checks confirmed global `assessor_flow_ui=true`,
  `assessor_flow_writes=false` and `assessor_flow_awards=false`. Chapter 1 cohort
  `chapter1-preparation-release` had UI enabled, writes/awards disabled and
  `authority_cutover_at=null`. No migrations or flag changes occurred in #289.
  These are release-time observations, not permission to alter live controls.

## Read first

1. `CLAUDE.md` and `docs/session-handoff.md` for repository/database rules.
2. `docs/chapter-1-assessor-facilitator-flow-plan.md`, especially §5.4 and
   C1AF-06a/06b/07, for the full simulation sequence and increment boundaries.
3. `docs/chapter-1-assessor-flow-contract.md` and
   `docs/chapter-1-assessor-state-contracts.md` for evidence, authority and review gates.
4. `docs/chapter-1-assessor-scoring-orientation-handoff.md` for C1AF-06 behavior
   and the separate eight-case/nine-subchapter coverage review.
5. `docs/chapter-1-assessor-mapping-audit.md` before choosing any lesson/component
   mapping. The proposed registry is not approved.

Useful implementation references: `src/lib/assessor/flow.ts`, `flow-registry.ts`,
`orientation-context.ts`, and the components in `src/components/elearning/`
for the existing briefing/navigation tour, evidence walkthrough and orientation.
Keep the draft registry out of client bundles; pass only needed display data.

## C1AF-06a deliverable

Build the story and reviewable interaction contract, not a live assessment runner.
Use fictional Maria and supplied evidence around Chapter 1 communication, with
lesson 1.6.2 as the planned anchor. Confirm the applicable mapping and rubric
provenance; label unresolved decisions explicitly rather than treating the draft
crosswalk as approved. Do not invent a clinical standard or scoring threshold.

Follow the plan's eleven scenes: find Maria; prepare using the guide and learner
view; brief/facilitate supported practice; observe and record facts/prompts; give
private actionable feedback; handle insufficient evidence; review prerequisites
and authority; arrange a distinct formal task; assess a new independent attempt;
identify a missing chapter component; then review a separately labelled complete
fictional chapter record. A certificate preview must say SAMPLE and have no real
verification identity. One lesson observation cannot satisfy a whole component.

Deliver bilingual scene content, versioned scenario/checkpoint metadata, supplied
evidence, essential decisions, incorrect choices with explanations, hints/retries,
and a clickable local storyboard. Demonstrate guided success, a mistaken rating,
missing observation with no grade, a blocked prerequisite and correction/retry.
Make keyboard/mobile navigation usable and preserve English/Filipino parity.
Use in-memory fixture state; do not create production users, messages or records.
Where future platform screens do not exist, clearly identify fixture adapters and
record parity work for C1AF-20b. Request owner review of the concrete story and
completion checklist after it is inspectable.

## Boundaries to retain

- Keep six orientation lessons, eight cases, seven correct ratings and mandatory
  safety-case correctness. Expanding coverage is a separate reviewed version.
- Retain all existing passes, progress, qualification IDs and lifecycle states.
  Replay never resets or upgrades an award.
- The opening tour, Alex/Rosa evidence example, scoring calibration and later
  coached simulation are distinct. None of the earlier activities is a simulation
  completion receipt. Missing evidence is not a failed performance grade.
- Practice does not silently become formal evidence. Separate private notes from
  learner-facing feedback and retain earlier attempts.
- C1AF-06b owns persistence, pause/resume and actor-bound server-validated ordered
  completion receipts. C1AF-07 owns revised issuance. Do not implement either in
  this increment or enable revised writes/awards/cutover.
- Chapter 3 remains unavailable. Overall certification eventually requires three
  compatible chapter awards, not another overall exam.
- Never develop or run E2E against the live pilot `ltzicxyefizxoqhfuuzc`.
  Use isolated fixtures or local Supabase. Read `docs/deploy-runbook.md` before any
  future release; a new PR is not authorization to merge or deploy it.

## Verification baseline and outstanding work

#289 passed 138 focused local tests, TypeScript, lint (three unrelated warnings),
the assessor source audit and isolated Chromium checks at 390px/1024px in both
languages and themes. Browser fixtures verified eight criteria/24 anchors,
keyboard interaction, retained answers after failure and no practice RPC writes.
Those fixture checks are not authenticated full-stack verification.

[CI run 1091](https://github.com/jongsky25/BHW-Connect-Phase-2/actions/runs/38188191168)
passed the production build, full local Supabase setup and all 81 E2E tests.
Unit results were 1,911 passed and six failed: `lesson-152.test.mjs`,
`lesson-164.test.mjs`, `lesson-165-integration.test.mjs`, `lesson-172.test.mjs`,
`lesson-173.test.mjs` and `reference-narration.test.mjs`, under `scripts/tests/`.
These historical preservation/narration cases also fail on the prior baseline,
but the assertions cover newly changed bytes too: lesson-164 now reports the
intentionally changed `assessor-orientation.test.tsx` fingerprint. Do not describe
the release as green CI or every assertion as unrelated to #289.

The owner approved merging/deploying #289 with those failures retained and
disclosed. No test was skipped, weakened or repinned. That release instruction
does not authorize a blanket exception for future PRs. Track resolution separately;
do not regenerate narration or rewrite protected lesson sources merely to make a
storyboard PR pass. Verify the next PR's exact head and report its actual results.
