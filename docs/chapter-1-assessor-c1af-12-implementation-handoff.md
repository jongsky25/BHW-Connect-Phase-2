# C1AF-12 implementation handoff — saved 1.6.2 activity plans

## Scope and lifecycle

This PR starts from `08cd2f8f` on `main` and implements C1AF-12 for published Chapter 1 lesson 1.6.2 only. Its migration is `20261013044457_c1af12_activity_plans.sql`. A draft is an explicit `course_sessions.status = 'draft'` with no scheduled date and a bound lesson. The create RPC reuses the owner's existing draft for that lesson, including after a request retry. Scheduling is a separate action on the draft screen. The existing session detail remains the place for explicit enrollment, attendance, delivery and activity run records after scheduling.

The lesson's Prepare and Run views show owned, open sessions for the lesson's course. Activity saves require the exact published 1.6.2 activity ID and version, preserve the JSON snapshot on retry, and allow an explicit replacement when a newer version is published. The older session activity RPC also preserves a planned snapshot on repeated `planned` saves. Saved plans reload from `course_session_activities`; choosing an activity for individual practice in the full guide remains local to the view and creates no session or learner record.

The guide-to-session link carries the current Prepare or Run view and validated workspace return URL. The session route accepts the return only when its program, Chapter 1 course, module and lesson match the session. It rejects external and unknown destinations. The workspace URL continues to carry search, area, learning status, page and selected learner.

Draft creation and activity writes still pass the C1AF-09 legacy guard. No flag or cohort is enabled, and this PR adds no attendance, delivery, observation, assessment, progress, award or certificate write on the planning path. Closed sessions cannot be changed or reopened.

## Verification record

- Focused UI and return tests: 16 passed across three files, including Filipino and English plan controls, return URL rejection and a PGlite execution of the exact migration with direct RPC denial, duplicate, lifecycle, stale-version and snapshot cases.
- `npm run typecheck`, `npm run lint` (three existing warnings, no errors), `npm run assessor:check`, and `npm run build` passed.
- A full local `supabase start` replay was attempted. The managed Docker daemon reported `failed to register layer: no space left on device` while pulling the Postgres image. Fresh PR CI must complete its disposable Supabase replay before merge. Do not substitute the isolated SQL test for that replay.
- The C1AF-10 authenticated phone/tablet walkthrough and before/after no-mutation audit remain unevidenced. Complete a phone and tablet keyboard walkthrough and check the six non-plan record families before release; do not count this handoff as that receipt.

## Merge and release boundary

Review the migration's draft state, lifecycle trigger, RPC grants and scope checks. Rollback requires first resolving every draft: restoring `scheduled_at NOT NULL` and the old status check would reject any remaining draft row. Preserve `course_session_activities` snapshots during rollback; dropping the planning RPCs and UI alone does not remove saved rows. Once fresh PR CI is green, apply migration `20261013044457` to the pilot **once at merge time** under `docs/deploy-runbook.md`, after checking the pilot's Disk IO budget. Do not seed or run E2E on the pilot. Post-deploy, use a stable assessor account to open published 1.6.2, create/reopen a draft, save/reload an activity, return through both lesson views to a filtered workspace, and verify that plan actions leave attendance, delivery, observation, assessment, awards and learner progress unchanged. Check existing scheduled-session attendance and delivery actions separately. Record the migration application and smoke receipts before describing the release as complete.

## Next boundary

C1AF-13 defines guarded practice evidence with stable criteria, rubric snapshots, sufficiency, optional rating, feedback and retry linkage. C1AF-14 can then add lesson-to-observation recording. A saved plan supplies none of that evidence and grants no Chapter 1 authority. Mapping/rubric approval, simulation and issuer policy, C1AF-09 restoration, historical equivalence and trusted conversion remain open.
