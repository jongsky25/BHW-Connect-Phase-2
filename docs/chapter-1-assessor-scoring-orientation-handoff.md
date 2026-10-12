# C1AF-06 — Scoring orientation context and recovery

Continues PR #288 from main `25e63cc6`. This is a bounded presentation/recovery
increment, not a new scoring or certification version.

The existing enabled Chapter 1 cohort receives full observable criteria and all
three exact rating anchors beside each case, with human subchapter titles. The
server adapter uses only AF-04's manifest mappings and pinned rubric sources;
it does not activate the unreviewed C1AF criterion registry. The existing sources
remain the calibration baseline, not approval of the revised award rubric. A
different orientation version, case set/text, safety marker or threshold withholds
the context and exercise rather than substituting draft guidance. Recorded passes
remain visible even if context is unavailable. Chapter 2 and disabled/nonmember
presentation remain unchanged. Enabled Chapter 1 direct navigation checks the same
briefing receipt as study before reading personal orientation state.

Orientation resumes at the first unfinished lesson, including gaps in completion.
Save errors retain work and offer a read-only status check. An ambiguously saved
lesson or passing attempt can be recovered without another submission. Failed or
version-mismatched reads do not manufacture completion. Existing server scoring,
six lessons, eight cases, seven-correct threshold and mandatory safety correctness
are unchanged. Existing qualifications and prior pass records are not rewritten.

The bilingual fictional Alex/Rosa walkthrough contrasts observed prompted
performance with interrupted/missing observation. It explains factual evidence,
privacy, practice/formal separation, explicit saving and follow-up. It stores
nothing and calls no learner or assessment RPC. Only the existing explicit lesson
completion and scoring submission actions write personal orientation evidence.
Scoring calibration does not complete the later coached platform simulation.
Simulation and revised certification remain unavailable; no migrations, rollout
changes, award calls or authority cutover are included.

## Coverage review — separate future decision

The eight existing cases cover five indicators across four of nine subchapters:
1.1 roles (three cases) and records (two), 1.6 listening (one), 1.7 factual problem
analysis (one), and 1.8 safety (one, mandatory). Subchapters 1.2–1.5 and 1.9 have no
scored case. This increment neither claims comprehensive coverage nor adds cases.
Any expansion needs separate content review, versioning and an explicit pass-rule
decision; do not change the denominator or repin sources to bypass that review.

## Verification and next work

- 138 focused tests pass across eight suites: component recovery/context,
  route/cohort/access, exact source anchors, study/checklist, orientation SQL,
  qualification SQL and rollout guards.
- TypeScript and full lint pass (three existing unrelated warnings).
- `npm run assessor:check` passes with existing activation blockers retained.
- Browser fixture check and PR CI results are recorded in the PR description.
  Fixture browser checks are not authenticated full-stack verification.

The prior PR's six historical preservation/narration failures and its release
exception are not permission to weaken tests or assume this PR may merge. Require
current-head CI review before release. There is no migration batch for this PR.
Next feature is C1AF-06a: author and review the fictional simulation story and
checkpoint contract before implementing persistence in C1AF-06b. Keep revised
writes/awards and authority cutover disabled.
