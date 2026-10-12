# C1AF-10 Chapter 1 working area handoff

## Release baseline

Built from `main` at `954fcc6b` (PR #302), after the C1AF-09 merge
`758bc1a8` (PR #301). The pilot already has the C1AF-09 migration; this PR's
`assessor_chapter1_workspace` migration
must be applied once at merge, following `docs/deploy-runbook.md`. Verify this
PR's final CI, merge commit and Vercel production deployment before calling
it released. No pilot migration, flag, cohort or staff record is changed by
development of this PR.

## Delivered scope

- `/training/[programId]/assessor/workspace` gives an active, non-preview
  assessor three Chapter 1 sections: My preparation, BHWs I support and My
  assessment work. The manual and Chapter 1 candidate study page link to it.
- Preparation links to the existing study, certifications and facilitator
  guide. The current combined award is shown as an achievement record, never
  as automatic authority. A certification read failure remains distinct from
  incomplete preparation.
- A new read-only RPC checks the authenticated assessor and requested program,
  rejects an area outside the assessor's catchment, and returns at most 20
  active BHWs per page. Search matches a literal name or barangay substring;
  area and course-learning-status filters are server-side. Rows show both name
  and barangay, and a selected learner/back link keeps filters and page.
  No learner exam answers or private notes are returned.
- Learning status is labelled as descriptive progress, not a readiness or
  permission decision. The assessment section states that the new formal
  Chapter 1 queue does not exist yet. It links to the existing assigned shared
  learning-note queue only when that feature is available. It invents no task
  count and creates no assessment, observation, plan or delivery record.

## Boundaries and open policy

- The C1AF-09 lifecycle mutation control, revised award/writes, public
  verification and authority cutover remain off. This page does not authorize
  official actions. The future server-side Chapter 1 write paths must check
  current award validity, cohort/cutover, actor, learner, area and assignment.
- C1AF-09 still needs owner decisions on restoration/revocation, historical
  evidence equivalence and trusted conversion. The Chapter 1 mapping/rubric,
  simulation, issuer and award rules also need approval before activation.
- A maximum of 200 barangays is offered in the area picker; when the catchment
  has more, the page says so and name/barangay search remains available. This
  is a bounded pilot interface, not an exhaustive area directory.
- Existing generic `/assessments` and Chapter 2 flows are not repurposed.
  The existing facilitator guide and roster recording behavior is not changed
  in this increment; C1AF-13 onward supplies the new guarded practice and
  assessment contracts.

## Verification checklist

1. Run the focused PGlite migration test and rendered route test. Confirm
   zero/many BHWs, duplicate names, pagination, filters, errors, inactive
   people, preview denial and out-of-catchment rejection.
2. Run typecheck, lint, `assessor:check`, a production build and full PR CI.
   CI's local Supabase stack must replay every migration in order; do not run
   E2E or seed against the pilot.
3. At merge, apply this PR's reviewed migration to the pilot once, then merge.
   After Vercel deploys `main`, verify the production alias is on the merge
   commit and use stable pilot fixture accounts for an authenticated mobile
   walkthrough of search, filters, return navigation and empty states.
4. Confirm no activation flag, cohort, assessment, award or learner progress
   row changed because someone opened the page. If rollback is needed, remove
   the UI link and keep earned history and existing progress intact.

Local checks at handoff: focused SQL and rendered route tests passed (10 tests),
typecheck and production build passed, and `assessor:check` retained its
existing `curriculum_and_rubric_review` blocker. The local full Supabase stack
could not unpack its Postgres image within the 32 GB workspace; the partial
pull was stopped and disk space recovered. A broad local unit run was stopped
after unrelated historical Chapter 2 IPC and lesson 1.3.5 fixture failures.
Neither run is counted as a successful full replay or suite. Fresh PR CI is
the required full migration/E2E gate.

## Continuation prompt: C1AF-11

> Implement C1AF-11 from `docs/chapter-1-assessor-facilitator-flow-plan.md`
> in one bounded PR from current `main`. Start with lesson 1.6.2. Reuse the
> published guide and BHW lesson content to build Prepare and Run views with
> the same approved criterion, concise objective/materials/practice/feedback
> steps, complete guide expandable, and one-action BHW presentation. Retain
> workspace, learner and filter context on return. Check phone, tablet,
> keyboard and both languages. Do not invent missing rubric instructions,
> enable official writes, or activate any Chapter 1 gate. Include a
> handoff recording validation, remaining policy gaps and the exact C1AF-12
> boundary.
