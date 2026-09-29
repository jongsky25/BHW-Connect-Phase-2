# Chapter III draft staging runbook

**Current state: draft staged on the confirmed pilot after the owner's 29 September 2026 trigger.** Review of the modules occurs **after** staging. Publication and production asset deployment remain separate actions.

## Staging scope

Stage the Chapter III package as a **draft course** with 12 ordered modules, 65 unpublished lessons, lesson-level private facilitator notes and module-level private guides. The live database requires the draft course to be mapped to `chapter-3` before accepting lessons; the mapping stays `unavailable`, the course stays `draft`, and all lesson `published_revision_id` values stay null. No Chapter I/II content, assessments, certificates, learner progress, KB or published course row is changed by this operation. The repository's `program.json` continues to reserve Chapter III with `delivery_course: null` and is not a snapshot of live chapter mappings.

The trigger-time read-only check confirmed the active pilot project `ltzicxyefizxoqhfuuzc` and the BHW Reference Manual program under `Department of Health`. Draft course ID: `6881b261-4b4a-4041-aa67-6d8f3736140d`. Do not store credentials in this package or commit a generated `locks/<project-ref>.json`, which would contain target row IDs.

## Before contact with the target

1. Confirm the owner has triggered migration and identified the target organization.
2. Freeze a reviewed Git commit of this package. Record its SHA and the two supplied PDF hashes in the migration record.
3. Run `node scripts/chapter3-validate.mjs`, `node scripts/chapter3-stage.mjs --check`, and `node scripts/chapter3-narration-validate.mjs` locally. They must pass with 12 modules, 65 lessons, 23,520 facilitated minutes and 910 current bilingual audio sections.
4. Check `review-queue.json` and `local-configuration.template.json` remain pending. Draft staging is permitted for review; publication is not.

## After the trigger

1. Set the admin environment values expected by the existing Supabase REST loader: `NEXT_PUBLIC_SUPABASE_ANON_KEY` (or `KB_LOADER_ANON_KEY`), `KB_LOADER_USERNAME`, and `KB_LOADER_PASSWORD`. Use the approved secret source; never print them or commit an `.env` file.
2. The read-only plan confirmed the target, source program, unavailable Chapter III mapping and absence of a Chapter III course.
3. The migration used `scripts/chapter3-sql-stage.mjs` to generate 78 ordered, transactional SQL files and the connected Supabase project to apply them. The existing REST staging script requires admin credentials that were not configured locally. The SQL scripts create or reconcile the draft course, map it to still-unavailable Chapter III, and stage modules, guides and unpublished lesson revisions. They contain no publication operation.
4. The post-stage SQL check confirmed 12 modules, 12 module guides, 65 lessons, 65 revisions, 65 private lesson guides, zero published lessons, course status `draft`, and Chapter III availability `unavailable`. Keep this record with the source commit and generated SQL hashes. An admin/staff view should still be checked during the scheduled in-system review.
5. Run `node scripts/chapter3-sql-verify.mjs <staged-course-uuid>` and execute its read-only SQL against the confirmed target. The 29 September check returned 65 expected revisions, 65 staged revisions, 65 exact hash matches, and no missing or mismatched lessons.

The MP3s and narration manifest are static application assets in the Git branch; the database staging script does not upload them. Plan an asset deployment or preview separately after the owner's trigger before assessing in-app audio. No production deployment is part of offline narration work.

## Review after staging

Review the actual staged lesson views, clinical/program claims, Filipino/English wording and spoken pronunciation, local contact slots, accessibility, facilitator cards, observation criteria and hour allocation. Complete each `review-queue.json` record with authority, reviewer, date and disposition. Fill a local configuration copy through the authorized local health team. Resolve the guide's 384/392 discrepancy in the formal timetable and the F106 stock-card label before any official training-hour claim.

Publishing the course, making Chapter III available to learners, changing assessments/certificates, and announcing availability require a separate release plan after this review. Draft staging is reversible through a target-specific, reviewed cleanup that first checks for references and progress; this script intentionally contains no delete path.

## Lesson revision publication

On 29 September 2026 the owner requested publication of all 65 staged lessons and attested that review is complete; the signed review record is to follow. The package's `review-queue.json`, per-module `review.json`, and local configuration template have not yet been updated with that evidence. Do not fill reviewer identities or local service values by inference.

The normal authenticated path is `scripts/chapter3-publish-lessons.mjs`, which calls `rpc_course_lessons_publish` for each complete module. The owner had no local loader credentials, and the production app exposed no lesson-publication control. The connected SQL editor runs as `postgres` with no app-user identity. An explicit, one-time owner-authorized migration therefore used `scripts/chapter3-sql-publish.mjs` to produce a single transaction. It checked the exact 12-module/65-lesson target, matching immutable revision hashes, all private notes, approved assets, draft course and unavailable chapter before changing the 65 pointers. It inserted 12 `course.lessons_published` audit events with a null actor and metadata identifying the operation as a postgres content migration and the review record as pending. It did not impersonate an admin.

The live post-publication check returned 65/65 valid published pointers and 12 migration audit events. The course remains `draft`; Chapter III remains `unavailable`; Chapters I and II remain available and published. Audio assets were not deployed. The target record is `content/training/chapter3-core-competencies/release/pilot-2026-09-29-lessons.json`.
