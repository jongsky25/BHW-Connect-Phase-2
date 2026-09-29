# AF-04 — Chapter I scoring orientation

AF-04 adds six bilingual lessons, a scoring guide, and eight observed BHW cases to the
**Study to become an assessor** path. It opens only after the diagnostic
pretest, all 42 current published Chapter I lessons, and the 80% chapter
post-test pass. The database rechecks those requirements when reading the
orientation and on every submission. Finishing lessons alone still leads to
the post-test, not directly to orientation.

The lessons cover component eligibility, factual evidence, exact rating
anchors, insufficient evidence, feedback and reassessment, and final review.
Each lesson completion is saved separately and all six are required before
the exercise. The cases use the authored three-level anchors across roles, records,
communication, problem analysis, and occupational safety. Seven correct
ratings out of eight pass, and the safety case must be correct; failed
attempts are retained and may be retried. The server keeps answer keys in the
private schema and records chapter and version with each attempt. A completed
orientation is training evidence only. AF-05 must separately review and issue
chapter qualification before assessment authority changes. Chapter II remains
unavailable because it lacks a qualifying exam and authored orientation.

The migration creates a private orientation unit, a self-readable attempt
history table with no client write grant, and state/submit RPCs. No BHW
progress, assessment, certificate, or qualification record is written. The
scoring source and migration are pinned in the assessor manifest; changing either requires review
and a new version.

Verification: `npm run assessor:check`, the AF-04 isolated PostgreSQL
migration test, component test, typecheck, lint, and full migration replay.
The owner must review the case wording, answer key, and 7/8 plus safety pass rule
before activation; this threshold was proposed in the plan, not previously
approved. Apply the migration to the pilot only with the PR's merge-time
migration batch under `CLAUDE.md`; a signed-in browser check is also required
before merge.
