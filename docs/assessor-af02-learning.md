# AF-02 — assessor personal chapter study

Implemented as a separate increment after AF-01 (PR #167). The foundation and
initial course is the **BHW Reference Manual**. Legacy content folder names do
not define a separate course.

## What changed

An actual active assessor can open **Study to become an assessor** from the
existing Reference Manual pages. The study route is
`/training/[programId]/assessor/[chapterKey]/[moduleId]/[lessonId]`, with chapter
and subchapter lists at its parent URLs. Admin View-as stays a read-only preview
and cannot enter this personal-study route.

The existing bilingual lesson reader, reading/slides modes, lesson checks,
completion feedback, narration and debounced resume/retry behavior are reused.
The candidate studies the same published lessons, with separate personal records.
The chapter page resumes the latest unfinished lesson, otherwise the first
unfinished published lesson. After all lessons are complete it offers review.

Progress uses the full AF-01 authored inventory: 42 required Chapter I lessons
and 55 Chapter II lessons. A partial publication never shrinks that denominator.
Missing content stays visibly unavailable; unknown chapters are not enrollable.
Module positions are checked against the authored delivery sources in tests.
A completion counts only against the current published revision. Older evidence
is retained; an outdated bookmark is ignored by the reader.

## Database and authorization

The CLI-generated migration adds `assessor_lesson_progress` and
`assessor_lesson_resume`. Neither table is shared with BHW learning records.
Both have RLS, self-only active-assessor reads, explicit read-only client grants,
foreign keys and indexes. Writes go through two RPCs which derive the actor from
Supabase authentication, validate the actual role/status, Reference Manual
program, chapter/course/lesson mapping, published revision and existing geographic
visibility. The internal context helper is in an unexposed schema with no client
access. There is no caller-supplied user id.

Completion is idempotent and locks in the publication lock order. Resume is
lock-free, validates the position/concept against the current revision, keeps
reading and slides bookmarks separately, and skips identical writes. Reads do
not create enrollments or write to the database. Route queries use named columns,
bounded lists and no link prefetching.

No BHW course progress, assessment queue, certificate, orientation completion or
assessor qualification is created. No pilot database was queried or modified.

## Deliberate increment boundary

This increment records personal study, not qualification readiness. The AF-01
curriculum remains draft. AF-03 will add candidate diagnostic pretest capture,
80% required-exam passing and retakes; existing BHW test RPCs are not repurposed.
There is no candidate pretest gate in AF-02 because the candidate exam pathway
has not been implemented. AF-04/05 add orientation and per-chapter qualification.
The UI explicitly says those steps are still required and not yet available.
Candidates do not require another assessor's practical assessment.

## Verification and merge gate

- Regression tests cover full inventory, current revision matching, saved resume,
  failure handling, Filipino/English pages, admin preview denial, actual assessor
  writes and unchanged BHW reader calls.
- Embedded PostgreSQL tests execute the exact migration plus the existing auth
  and visibility function bodies: role/ownership checks, RLS/direct-write denials,
  unavailable publication, cross-chapter and stale-revision denial, idempotency,
  bookmark validation and revision history. The fixture contains only the schema
  surface this increment uses; it is **not** a full Supabase replay.
- Full unit suite, lint and typecheck results are recorded in the PR.
- A first concurrent full-suite/build run hit an unchanged Chapter II preview
  timeout. Its isolated rerun passed; no timeout or assertion was loosened.
- `supabase start` is blocked locally: neither Docker nor Podman is installed.
  Full migration replay and a signed-in browser journey remain required before
  merge. CI already starts a disposable Supabase stack from all migrations.
- Production build validation was blocked by automatic approval review when it
  attempted Sentry network reporting. Compilation had completed, but a complete
  production build is not claimed. No alternative telemetry path was attempted.

Keep this PR draft until the remaining validation is satisfied. Review AF-01
first, then rebase/retarget AF-02 onto main after its squash merge. Do not merge
AF-02 into the foundation branch, repeatedly merge main, or apply this migration
to the pilot before the reviewed merge-time migration batch.
