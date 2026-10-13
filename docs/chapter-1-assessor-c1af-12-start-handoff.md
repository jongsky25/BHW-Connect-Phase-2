# C1AF-12 start handoff — saved activity plans and session return

**Status:** implementation handoff only. This document does not implement C1AF-12, change a migration, or release a feature. Start one bounded implementation PR from current `main`; do not build on this documentation branch if `main` has moved.

## Baseline and entry points

- C1AF-10 is merged as `de38b3e1` (PR #303). It provides the Chapter 1 workspace, scoped BHW roster, and a return URL carrying search, area, learning status, page, and selected learner.
- C1AF-11 is merged as `443f8301` (PR #304). Its first Prepare and Run views serve published lesson 1.6.2. The same-program workspace return path survives switching to the BHW presentation. Read [its handoff](chapter-1-assessor-c1af-11-handoff.md) before editing the route.
- At preparation time, `main` is `08cd2f8f` (PR #305). Recheck `main`, CI, published 1.6.2 content, feature flags, and migration state when the new chat starts. Do not assume this SHA remains current.
- The C1AF-12 contract is in [the flow plan](chapter-1-assessor-facilitator-flow-plan.md): select an existing owned session or create a draft plan from the lesson, save chosen activities with snapshots, allow ad hoc individual practice, and return from session to guide with context. Planning is distinct from delivery.

## Existing contracts to reuse and resolve

| Area | Current implementation | C1AF-12 implication |
| --- | --- | --- |
| Lesson entry | `src/app/training/[programId]/[[...path]]/page.tsx` validates the workspace `returnTo`; `src/components/elearning/chapter1-lesson-flow.tsx` renders Prepare and Run. | Add a plan/session handoff at the lesson level while preserving validated workspace and learner context through both directions. Validate any new session return parameter server-side. |
| Sessions | `src/app/training-sessions/page.tsx`, `[id]/page.tsx`, and `src/components/elearning/training-session-detail.tsx` use owned `course_sessions`, enrollments, deliveries, and activities. `rpc_course_session_create` creates a **scheduled** session. The table has only `scheduled`, `completed`, `cancelled`. | A “draft plan” is not a current session state. Decide and implement an explicit draft representation or clearly named planning state without treating a scheduled session as a draft. Bound session choices to the lesson's course and current owner. |
| Activities | `src/components/elearning/activity-library.tsx` selects activities and calls `rpc_course_session_activity_record`; `course_session_activities` stores `activity_snapshot` and supports `planned`, `run`, `adapted`, `skipped`. | Save lesson-appropriate choices as `planned` with the existing versioned activity data. Do not mark them run or delivered. The current upsert replaces `activity_snapshot` on conflict: preserve a previously saved snapshot when content changes unless the user explicitly replaces that choice. Test this behavior. |
| Lifecycle guard | `20261010145729_assessor_flow_rollout_controls.sql` guards session, enrollment, delivery, activity and observation mutations under the C1AF-09 rollout rules. | Any new write path must preserve those checks and current ownership/catchment rules. Do not enable a cohort, cutover, award, or official Chapter 1 write by adding the UI. |
| Ad hoc practice | Existing activity library can select and run a guide without `sessionId`; saved activity rows require a session. | Keep individual practice usable without enrolling a BHW or creating a session. Explain what is saved and what is only a local selection; do not fabricate an observation or learner progress record. |

## Acceptance and verification for the implementation PR

1. From 1.6.2 Prepare or Run, an active, non-preview assessor can select an owned, open session for the same course, or create a real draft plan using a reviewed lifecycle contract. Another assessor's, other-course, completed, or cancelled session cannot be attached or changed through a direct request.
2. Chosen lesson activities save and reload with their versions and immutable snapshots. Repeated submit or network retry cannot create a duplicate session or duplicate activity. A later published activity version does not silently rewrite a saved plan.
3. Guide → session → guide retains the lesson view, selected learner, and workspace search/filter/page return path. Unknown or external return URLs are rejected. The controls work on phone and tablet, with keyboard navigation, in Filipino and English.
4. Opening the views, selecting a local activity, saving a plan, and returning do not record attendance, delivery, practice evidence, assessment, award, or learner progress. A plan is visibly labelled as a plan. Existing attendance and delivery recording remain separate explicit actions.
5. Test ownership, catchment, course and lesson matching, session state, duplicate requests, stale activity versions, save/reload, direct RPC denial, and return navigation. Run focused route/RPC tests, typecheck, lint, `assessor:check`, build, then fresh PR CI with a disposable local Supabase replay. Never seed or run E2E against the pilot.

If a migration is needed, generate it with the Supabase CLI, review the security and rollback effects, and apply it to the pilot **once at merge time** under [the deploy runbook](deploy-runbook.md). The implementation PR must record the migration version and post-deploy checks. The separate C1AF-10 authenticated mobile walkthrough and before/after no-mutation audit were not evidenced in the prior handoff; do not describe them as complete without a receipt.

## Boundary after C1AF-12

C1AF-13 defines the guarded practice-evidence record, including stable criteria, rubric snapshots, sufficiency, optional rating, feedback and retry linkage. C1AF-14 adds lesson-to-observation recording after that contract. C1AF-12 must not repurpose generic `/assessments`, assign grades from a plan, change Chapter 2 flows, or activate Chapter 1 authority. Mapping/rubric approval, simulation/issuer/award policy, and C1AF-09 restoration, historical equivalence and trusted conversion remain open.

## Prompt for the next chat

> Implement **C1AF-12 only** from `docs/chapter-1-assessor-facilitator-flow-plan.md`, starting from current `main`. Read `CLAUDE.md`, `docs/session-handoff.md`, `docs/deploy-runbook.md`, `docs/chapter-1-assessor-c1af-11-handoff.md`, and `docs/chapter-1-assessor-c1af-12-start-handoff.md`. Start with published lesson 1.6.2. Connect Prepare/Run to an owned same-course session or a real draft plan, save selected activities with versioned snapshots, and preserve lesson, learner, workspace filters and page on return. Resolve the missing draft state and existing snapshot-replacing upsert explicitly. Keep ad hoc practice available without session enrollment. Do not imply delivery, write observations or assessments, change progress or awards, or activate any Chapter 1 gate. Verify ownership, lifecycle, retry, version changes, both languages and mobile/keyboard behavior with local/disposable data. Ship one bounded implementation PR and a handoff recording tests, release checks, open policy, and the exact C1AF-13 boundary.
