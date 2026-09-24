# Reference Manual foundation — work package 2

This additive migration supplies a parent training program, ordered chapters mapped to existing delivery courses, lessons under existing modules, immutable content revisions and private facilitator notes. The learner-facing program can be one Reference Manual course with three chapters while the existing Chapter I course UUID continues to own assessments and certificates. Chapters II–III can remain unavailable with no delivery course.

No rows are seeded, no old UUIDs change, and no historical progress is rewritten. Authenticated administrators author within their organization scope. Learners see only currently published content in available chapters of published programs/courses. Facilitator notes are stored in a separate table, unreadable by learners. Progress reporting inherits existing administrator/session-owner policies; resume records are private to the learner.

## Mutation contract

- `rpc_course_lessons_publish(module_id, revision_ids)`: locks the module and atomically promotes one immutable revision for every planned lesson. Rejects partial sets, missing facilitator notes and modules with no required lessons. Identical publication is a no-op. Direct publication-pointer writes are denied.
- `rpc_course_lesson_resume(lesson_id, revision_id, modality, language, position_key, concept_id)`: validates an actual position/concept in the current revision. Saves Read and Slides independently without completing either. It may create the existing course-progress container.
- `rpc_course_lesson_complete(lesson_id, revision_id)`: active, scoped BHW only. Preserves first completion and its revision across repeat calls. All required published lessons complete the existing module and invoke the existing Chapter I assessment transition. No whole-manual certificate is introduced.
- `training_legacy_content_hash(module_id)` plus `rpc_course_lesson_approve_equivalence(lesson_id, revision_id, legacy_content_hash, review_reference)`: administrator-only approval evidence. Human review must establish substantive equivalence; a matching hash alone is not proof. Approval is immutable.
- `rpc_course_lesson_backfill(module_id, migration_batch, dry_run=true)`: explicitly requested, scoped conversion of completed legacy module rows for reviewed lessons only. Keeps original timestamps and all old rows; repeat runs insert nothing. Rejects stale legacy hashes or publication revisions. Incomplete rows never become lesson completions.

Requiredness and identity are immutable. Wording corrections use new revisions; already earned progress retains original evidence. A changed equivalence cannot overwrite existing approval; design an audited superseding-approval workflow if that becomes necessary. Content-shape/coverage validation and canonical content hashing belong to package 3; this foundation currently enforces database-level shapes and access constraints only.

The legacy whole-module completion RPC remains usable for unmapped modules. Once lessons are published, a trigger prevents that RPC from bypassing required lessons. Existing destructive course reset fails safely when lesson progress or resume references it; a compatible archival/reset workflow is needed before exposing reset on converted courses. Never delete new state merely to make an old reset succeed.

## Local verification

Run a disposable PostgreSQL server on **127.0.0.1:55432**, with a local `postgres` superuser and the pgcrypto extension available. Do not point this harness at a shared database. The runner deliberately ignores application connection URLs and creates a new `bhw_foundation_<timestamp>` database on every invocation. It leaves that disposable database for inspection.

Install `pg` in a scratch directory or use an existing development installation. With `pg` resolvable normally:

```sh
node scripts/tests/training-foundation-replay.mjs
```

If `pg` is elsewhere, set `PG_TEST_MODULE` to its absolute package path. Optionally set `PG_TEST_REPORT` to an output JSON path. The runner creates minimal Supabase auth/storage schemas, JWT helpers and platform roles, replays all repository migrations, inserts realistic old learner records before the new migration, then executes `training-foundation-scenarios.mjs` under authenticated roles.

Observed on 24 September 2026: PostgreSQL 18.4, all 35 migrations replayed, 15 scenario groups passed. Tests cover untouched historical rows, scoped authoring, unavailable chapter constraints, draft/private content isolation, atomic/idempotent publication, immutable identity/payloads, whole-module bypass rejection, reviewed dry-run/backfill, stable-position resume, self-only completion, legacy assessment compatibility, reporting scope, concurrent writes, stale revisions and archived programs. A strict standalone TypeScript check of `src/lib/elearning/types.ts` also passed.

This is real PostgreSQL testing with simplified platform stubs, not full Supabase/REST or production-version validation. Full app checks and a matching-version Supabase rehearsal remain required before release. No UI/loader is wired to these tables in this package. No production or shared-test database was contacted. Commits skip automatic CI because the existing PR E2E workflow writes to a shared Supabase test project.
