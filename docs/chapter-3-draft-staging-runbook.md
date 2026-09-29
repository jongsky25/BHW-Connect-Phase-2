# Chapter III draft staging runbook

**Current state: prepared offline; no live calls authorized yet.** The course owner will explicitly trigger migration. Review of the modules will occur **after** they are staged in the system. Do not substitute the old planning sequence, which called for review before authoring.

## Scope of the future trigger

Stage the Chapter III package as a **draft course** with 12 ordered modules, 65 unpublished lessons, lesson-level private facilitator notes and module-level private guides. The program's `chapter-3` mapping stays `unavailable` with `delivery_course: null`. No Chapter I/II content, assessments, certificates, learner progress, KB or published course row is changed by `scripts/chapter3-stage.mjs`.

The project reference and exact organization name must be confirmed at trigger time. Repository history names a pilot project, but a historical release record is not proof of the current target. Use an active admin account scoped to the intended organization. Do not store credentials in this package or commit the generated `locks/<project-ref>.json`, which will contain target row IDs.

## Before contact with the target

1. Confirm the owner has triggered migration and identified the target organization.
2. Freeze a reviewed Git commit of this package. Record its SHA and the two supplied PDF hashes in the migration record.
3. Run `node scripts/chapter3-validate.mjs` and `node scripts/chapter3-stage.mjs --check` locally. Both must pass with 12 modules, 65 lessons and 23,520 facilitated minutes.
4. Check `review-queue.json` and `local-configuration.template.json` remain pending. Draft staging is permitted for review; publication is not.

## After the trigger

1. Set the admin environment values expected by the existing Supabase REST loader: `NEXT_PUBLIC_SUPABASE_ANON_KEY` (or `KB_LOADER_ANON_KEY`), `KB_LOADER_USERNAME`, and `KB_LOADER_PASSWORD`. Use the approved secret source; never print them or commit an `.env` file.
2. Run a **remote read-only plan**: `node scripts/chapter3-stage.mjs --project <confirmed-ref> --org-unit "<exact organization>"`. The pilot guard in `scripts/lib/pilot-guard.mjs` may require `ALLOW_PILOT=1` for a deliberate pilot operation. Confirm the report says draft course, Chapter III mapping unchanged/unavailable and publication not performed.
3. Run `node scripts/chapter3-stage.mjs --project <confirmed-ref> --org-unit "<exact organization>" --apply` once the plan is accepted. The script saves a row-ID lock after each created course/module/lesson and can reconcile on rerun. It has no `--publish` option.
4. Re-run the remote read-only plan. Expect unchanged modules, guides and lessons. Save the report and lock in the authorized release record. Verify in an admin/staff view that all 12 modules and 65 lessons are present as drafts, private notes are staff-only, and a BHW cannot see Chapter III.

## Review after staging

Review the actual staged lesson views, clinical/program claims, Filipino/English wording, local contact slots, accessibility, facilitator cards, observation criteria and hour allocation. Complete each `review-queue.json` record with authority, reviewer, date and disposition. Fill a local configuration copy through the authorized local health team. Resolve the guide's 384/392 discrepancy in the formal timetable and the F106 stock-card label before any official training-hour claim.

Publishing the course, attaching Chapter III to the learner program, changing assessments/certificates, and announcing availability require a separate release plan after this review. Draft staging is reversible through a target-specific, reviewed cleanup that first checks for references and progress; this script intentionally contains no delete path.
