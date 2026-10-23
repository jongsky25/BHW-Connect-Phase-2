# Feedback remediation — pilot baseline and first increment

## Baseline: 23 October 2026

Initial triage covers all 214 Spot Feedback submissions from 29 September to
23 October 2026. A read-only live count confirmed the export is still current;
all 214 live statuses are `new`. This work has not changed feedback statuses or
sent replies. The implementation baseline is `9c2a2cd4`.

[`triage-2026-10-23.csv`](triage-2026-10-23.csv) maps every feedback UUID to
increment IDs, responsible roles, a proposed disposition, related reports and
the next verification action. Roles are responsibility assignments, not named
staff commitments. Original messages, names and screenshots remain in the
feedback system and the separately exported private snapshot.

Initial triage is complete; verification of the full backlog is still open.
The 31 N/A/no-comment submissions are proposed no-action dispositions, not
resolved bugs. There is one unclear submission requiring screenshot inspection,
one acknowledgement paired with an apparently retracted 7S report, and one
candidate exact duplicate of a blocked-navigation report. Readability feedback
that also praises the material remains actionable.

## Delivery increments

| ID | Outcome | Responsible role |
| --- | --- | --- |
| FB-0.1 | Reproduce, consolidate and disposition every report | Triage lead with QA |
| FB-1.1 | Preserve answers and restore position; reconcile reported progress | Engineering with QA |
| FB-1.2 | Unblock lesson navigation and explain next steps | Engineering with QA |
| FB-1.3 | Correct user-creation validation and location selection | Engineering with QA |
| FB-2.1 | Verify health, legal and BHW-role accuracy | Content editor and qualified reviewer |
| FB-2.2 | Correct assessment context, questions and answer rationale | Content editor and assessment reviewer |
| FB-2.3 | Simplify language and complete explanations | Content editor and language reviewer |
| FB-3.1 | Clarify question navigation, review and submission | Engineering with QA |
| FB-3.2 | Provide results/history under approved assessment rules | Engineering with assessment reviewer |
| FB-3.3 | Improve mobile layout, labels and wayfinding | Engineering with QA |
| FB-4.1 | Align reading, slides, stories and visuals | Engineering with content reviewer |
| FB-4.2 | Restore narration and retain playback preferences | Engineering with QA |
| FB-4.3 | Verify supported language coverage and availability | Engineering with language reviewer |
| FB-5.1 | Decide and pilot learning/assessment policy changes | Product/training lead with engineering |
| FB-5.2 | Scope low-connectivity access and supporting features | Product/training lead with engineering |
| FB-5.3 | Validate a medicinal-plant identification protocol | Qualified health reviewer with product lead |

Implement one cohesive slice at a time. For each: link feedback IDs, reproduce
the current behavior, define acceptance criteria, implement, run focused checks,
release through the existing deployment workflow, verify the deployed flow, and
only then record evidence and resolve the linked submissions. Preserve original
feedback and historical assessment evidence. A multi-issue submission remains
open until each accepted issue has a disposition.

## Verified findings

- Chapter 1 uses `Chapter1Assessment` for both BHWs and assessors. The pilot's
  `chapter1_assessment_v2` and `assessor_flow_ui` flags are enabled, and
  `rpc_learner_assessment_save` is installed. Current code already saves answers
  and question position, displays numbered/color-coded navigation, and uses a
  30-item form. Older 42-item/no-autosave reports require current-flow validation
  rather than a second storage implementation.
- Chapter 2 still uses `AssessorExam`; its answers live in component state until
  submission. Treat draft persistence there as a separate follow-up, with
  attempt identity and authorization reviewed before implementation.
- For progress report `edd80e67-6710-494a-aee1-4176f1ca274f`, live read-only
  inspection found 42 stored Chapter 1 completions, all matching current
  published revisions. The route counts current revisions through `chapterStudy`.
  This does not reproduce or disprove the historical 15/42 display report. A
  signed-in display check is still required; do not rewrite completion data.
- The two “Cannot proceed” reports were submitted on `/feedback`. Establish the
  blocked lesson and prerequisite state before attributing a cause.
- The 4S report is followed 47 seconds later by the same reporter confirming all
  7S are present. Verify and disposition the pair together.

## FB-1.1a — reliable Chapter 1 question resume

Related feedback: `c9fcb354-09a1-403c-a3fc-e41404d3c3cc` (return to previous exam
position), and `12db9973-d584-4d1f-a278-4905ac4a8857` (lost progress plus separate
content/test-length requests). These fixes address confirmed navigation gaps;
they do not establish that every original symptom has been resolved.

Reproduced defects:

1. Selecting question 12 from the review screen changed only local state.
   Leaving and resuming could therefore restore an older question.
2. If a position save committed but its response was lost, retrying generated a
   new mutation ID with the old revision. The RPC rejected it as stale instead
   of returning its stored successful receipt.

Changes:

- Review selections use the existing position-save RPC and enter the question
  screen only after success. A failed save stays on review with a retryable error.
- Identical position retries reuse the original mutation ID and payload.
  Successful saves and loading another attempt clear the pending operation.
- Review navigation is disabled during saving/submission. Save-and-leave blocks
  while a save is in flight, as it already does for an unsaved answer.
- No schema, scoring, content, authorization or historical-answer changes.

Acceptance coverage includes BHW and assessor review-to-question resume,
preserved saved answers after remount, failed-save retry, lost-response recovery
without an extra revision, and disabled competing navigation while saving.
The five new regression cases failed before the fix and passed afterward;
both pre-existing navigation-color tests also pass.

Validation: repository lint and TypeScript checks pass. The full unit run
passed 2,139 of 2,142 tests; its three failures were historical release checks
whose pinned Git objects were absent from this checkout. After fetching the
exact reviewed commits, both affected test files pass (five tests), clearing
all three failures. `git diff --check` passes. No test assertions were relaxed.
The CSV validation confirms exactly 214 unique feedback IDs, with no omitted
submissions and an increment, owner role and next action for each.

Release receipt: [PR #329](https://github.com/jongsky25/BHW-Connect-Phase-2/pull/329)
merged as `1be8fb18ed2ffda4935d02b2c438c730ddebada0` after CI run
`39986459735` passed checks and isolated E2E. Vercel production deployment
`dpl_715DYm4BKTSoK354F8M91x1J1fqh` is READY for that exact SHA, with
`bhw-connect-phase-2.vercel.app` assigned. A public `/login` smoke returned
HTTP 200 and BHW application content. Signed-in pilot verification and feedback
closure remain pending; CI browser evidence is from the disposable database.

Release verification still required: signed-in browser checks for BHW and
assessor, mobile review navigation, leaving/reopening an attempt, and the exact
My Feedback/browser-back scenario. The managed environment has no configured
signed-in test credentials. Do not run write-based E2E against the pilot; use
the repository's isolated test environment/CI.

## FB-1.2a — lesson progression across subchapters

Related feedback: `2f7a7fb6-89f9-4a3a-bf67-42bf09a49add` asks for a direct next
lesson option. The two blocked reports submitted on `/feedback` remain open
until their exact lesson/prerequisite context is established.

Confirmed gap: the BHW lesson route calculates its next destination only from
lessons in the current subchapter. Its final lesson therefore has no next link
even when another published subchapter follows. The assessor personal-study
route also hides Continue studying on lesson pages, including completed ones.
This increment builds on the approach in the older open PR #193 and adapts it
to the current routes and their lesson, preview and slide behavior.

The fix derives the next lesson from the current chapter's published non-quiz
modules in delivery order. It supplies the same destination to the completion
panel and route navigation, skips empty/unpublished destinations, retains
facilitator slide mode and read-only preview, and leaves the final chapter
lesson without an invented next destination. The assessor continuation appears
on completed/reviewed lesson pages when another unfinished published lesson
exists; it does not point back to the current lesson or a completed bookmark.
Existing pretest, completion and qualification rules remain in force.

Nine new navigation cases cover English/Filipino transitions, empty/unpublished
and quiz gaps, the last chapter lesson, admin/assessor slide previews, completed
assessor lessons, self-links and completed bookmarks. Six regressions failed
before the fix; all 54 focused route tests pass afterward. The test query
adapter now honors the production query's non-null published-revision filter.
The tracker retains all 214 IDs and marks only the directly related next-lesson
report as partially fixed locally. Its line endings are normalized for future
tracker updates.

Validation: full lint and TypeScript checks pass, and all 2,151 unit tests in
244 files pass. `git diff --check` and the 214-unique-ID tracker check pass.
Status: implemented locally, awaiting PR checks and release verification.

## Next work

1. Finish signed-in verification of FB-1.1a and the original feedback-return path.
2. Confirm the progress display using the reporter's correct account/persona and
   chapter, then disposition the historical mismatch based on evidence.
3. Release and verify FB-1.2a; identify the original blocked lessons before
   closing the two reports submitted on `/feedback`.
4. Reproduce the Puerto Princesa selection and field-error reports for FB-1.3.
5. Start authoritative-source review for FB-2.1 while engineering proceeds.

The remaining increments keep their proposed assignments until reproduction or
content review establishes an implementation-ready task. Mandatory question
sequence, lesson locks, answer-key visibility and course-length changes must
follow the existing approved learning policy and explicit product decisions.
