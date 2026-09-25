# Subchapters 1.6–1.8 learner lesson release

25 September 2026. The owner requested: “for 1.6 to 1.8, release the learner facing short lesson.” This authorizes promotion of the thirteen existing bilingual short lessons in 1.6–1.8 on the pilot. It does not represent a separate clinical, translation, accessibility, or facilitator review.

The authored lesson files are copied without teaching-text changes from the reviewed authoring snapshots in `drafts/` to the loader's release paths in `modules/`. The snapshots remain in place for comparison. `training-validate-drafts.mjs` checks that the release copies and snapshots have identical canonical content hashes.

| Subchapter | Short lessons | Read sections | Slides | Legacy concepts |
| --- | ---: | ---: | ---: | ---: |
| 1.6 Communication | 5 | 24 | 24 | 11 |
| 1.7 Problem solving | 4 | 19 | 19 | 8 |
| 1.8 Occupational safety | 4 | 20 | 20 | 11 |

These 13 lessons are required learner lessons. They add to the 26 existing published short lessons only after the `lessons` loader publishes each complete selected subchapter. The loader creates immutable revisions and uses `rpc_course_lessons_publish`; course/session enrollment, facilitator activity logs, attendance, assessment results, historical progress, and certificate rules are unchanged. No equivalence or progress backfill is requested.

The 13 lessons have no draft image assets. They publish as text and independently authored slides. Visuals, narration, real-group timing, manual screen-reader checks, and review of 1.8 by a local qualified clinical trainer remain follow-up work. Training activity participation remains separate from learner lesson completion and competency assessment.

Release evidence: record the selected-module dry run, apply run, resulting lock IDs, published revision counts, and authenticated learner view in the task or PR before declaring the live result verified.
