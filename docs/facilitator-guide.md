# Facilitator guide in the Reference Manual

Facilitators (`assessor`) and admins open the same manual pages as BHWs
(`/training/:program/:chapter/:subchapter[/:lesson]`) but also see a
facilitator guide there. Designers keep the plain preview. BHWs never
receive guide data: every read is RLS-limited to assessor/admin, and
`manual-navigation.test.tsx` checks that learner and designer requests never
touch the guide tables.

## What the facilitator sees

**Subchapter page**, below the lesson list:

1. **What the BHW is learning here.** Subchapter objectives, then each lesson's
   objective and the takeaways of its published revision.
2. **Competency to look for.** The competency statement and each observation
   indicator (what "can do" and "not yet" look like, and the Kaya na /
   Kailangan pa ng practice / Hindi pa levels).
3. **How to run this subchapter.** The module's `facilitator-notes.*.md`
   (timing table, delivery script, misconception, answer keys), rendered as
   formatted text.
4. **BHWs in your area.** Every active BHW in the facilitator's org subtree
   (first 500), with lessons done in this subchapter, latest pretest and
   posttest, certification, current rating per indicator, and a form to
   record a new observation.

**Lesson page** opens on a "Facilitator guide" tab (the lesson's
`facilitator.*.md`, one collapsible section per template heading, plus the
lesson's observation indicator), with an "As the BHW sees it" tab
(`?view=lesson`) showing the unchanged read-only preview.

## Standard lesson guide

Every lesson's facilitator notes follow one 12-section template, enforced by
the loader. See `docs/training-content-style-guide.md` §5.1.
`modules/01-tungkulin-ng-bhw/lessons/bhw-health-educator/` is the worked
example. The 26 converted lessons' guides are **drafts for subject-matter
review**. Each file's last section says what could not be grounded in the
sources.

## Recorded observations

`competency_observations` (migration `20260926000000_facilitator_guide.sql`)
is append-only history. A re-observation adds a row, and the newest row per
BHW and indicator is the current rating. Writes go only through
`rpc_competency_observation_record`, which checks all of the following:

- The actor is an active assessor or admin.
- The BHW is active and within the actor's org subtree.
- The level is valid and the note is at most 1000 characters.
- The indicator exists on a published course the actor can see.

It snapshots the indicator text and writes a `competency.observed` audit
event against the BHW. BHWs cannot read observations.

The same migration lets facilitators read `course_progress` and
`course_test_attempts` for every BHW in their subtree, which previously they
could do only for BHWs enrolled in their own sessions. `course_lesson_progress`
follows `course_progress` visibility. `rpc_e2e_purge_test_users` is
redefined to clean up the new table.

## Release steps

1. Apply the migration.
2. Review the drafted lesson guides, then re-run
   `npm run training:load -- --mode lessons ...` for each converted
   subchapter. Notes are part of the revision hash, so changed notes stage
   new immutable revisions. Lesson completions are keyed by lesson and are
   kept. A saved resume position that points at an older revision may not
   restore.

## Verification

- `node scripts/tests/training-foundation-replay.mjs` (disposable PostgreSQL;
  see `docs/bhw-reference-foundation.md`) runs `facilitator-guide-scenarios.mjs`
  after the foundation scenarios. It covers scope, rejection cases,
  append-only history and audit.
- `npx vitest run src/app/training src/components/elearning src/lib/elearning scripts/tests`.
