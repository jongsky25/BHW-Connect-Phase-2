# Feedback remediation — pilot baseline and delivery record

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
Release receipt: [PR #330](https://github.com/jongsky25/BHW-Connect-Phase-2/pull/330)
merged as `34313dcf2a20bae296f715f00d8df2fb918b8ba1` after CI run
`39988428200` passed checks and isolated E2E. Vercel production deployment
`dpl_Gd8oinC2uaMyjKxyTZfvewS6u8MF` is READY for that exact SHA and has the
production domain assigned. The public login fetch returned HTTP 200 and BHW application
content. Signed-in navigation verification and feedback closure remain pending.

## FB-1.3a — identify create-user errors and independent-city placement

Related feedback: `716bd5c2-a758-4449-9596-24c40f90c3bb` asks for highlighted
fields requiring correction, and `f278d210-3a87-4dfa-9368-72fbd6a02b78` reports
Puerto Princesa missing from the city options.

The create-user form disabled native validation without adding client validation
or field-specific messages. It now validates whitespace-only required username
and full name, uses native email validity for the optional email, and identifies
invalid placement. Errors add red borders, `aria-invalid`, linked descriptions,
a form-level summary and focus on the first invalid field. Correcting a field
clears its error. Known duplicate username constraints and server placement
errors point to the corresponding field; other failures remain form-level.
Entered values are preserved after failure, and successful creation still uses
the existing RPC and normalization. Submit remains available for invalid
placement so users can receive the explanation and focus; invalid data is stopped
before the RPC.

A read-only pilot query confirmed the existing MIMAROPA hierarchy:
`City of Puerto Princesa (HUC)` is a provincial-level group, containing the
city-municipal `City of Puerto Princesa (Capital)`. It is separate from Palawan.
The picker now labels that level Province / independent city and explains the
city-group path in both supported interface languages. This preserves all IDs,
hierarchy, placement rules and organization boundaries.

Eight new component cases cover blank fields and city selection in English and
Filipino, invalid email, duplicate username and successful retry, generic failure
and location correction. Seven failed against the old implementation; all eight
pass with the fix. The focused run including existing error mapping passes all
16 tests. Both feedback IDs are marked partially fixed locally in the tracker;
the 214 original IDs remain present. Signed-in create-user and scoped city-picker
verification are required after release; no test users were created on the pilot.

Validation: all 2,159 tests in 246 files pass; TypeScript and lint pass (lint
reports four pre-existing unused-variable warnings in unrelated scripts).
English/Filipino user-management and picker translation keys match. The tracker
retains 214 unique feedback IDs, and `git diff --check` passes.
Release receipt: [PR #331](https://github.com/jongsky25/BHW-Connect-Phase-2/pull/331)
merged as `693962a0962b521f5f546424fa71a185aa022ee4` after CI run
`39990532029` passed checks and isolated E2E. Vercel production deployment
`dpl_3hcAk8s7KStya8SA3s6CU3uUQJfU` is READY for that exact SHA, with the
production domain assigned. Signed-in field-error and scoped picker verification
remain pending before feedback closure.

## FB-2.1a — source accuracy and current publication audit

The [UHC audit](uhc-audit-2026-10-23.md) covers seven source-accuracy submissions,
two published lessons and the active assessment's coverage/referral slots.
Read-only pilot observations match the locally computed lesson and form hashes.
Official PhilHealth copies of the UHC Act, selection circular and 2026 YAKAP
advisories were checked alongside the project's Reference Manual transcription.

Current English/Filipino teaching addresses three reported concerns: official
benefit confirmation, inclusion versus clinic registration, and BHW coordination
versus clinical decisions. Four assessment/editorial requests remain open,
including explicit YAKAP assessment and the statutory provider definition.
An advisory page-range citation also needs verification in the next controlled
lesson revision. This slice records evidence and acceptance criteria for the
next versioned assessment proposal; it does not alter published content, mark
feedback resolved or assert independent clinical/legal approval.

Run `node scripts/feedback-policy-audit.mjs` to check local lessons/forms against
the recorded publication observation and retain all 214 feedback IDs. This is a
local check, not a fresh live query. It passes, along with all nine targeted UHC
lesson/assessment-content tests. The seven tracker entries now link their exact
finding and next action. Ten FB-2.1 assignments remain outside this first slice.

Release receipt: [PR #332](https://github.com/jongsky25/BHW-Connect-Phase-2/pull/332)
merged as `95f997be999753dae3b014ac1cdbc20980cc2e2c` after CI run
`40039631246` passed checks and isolated E2E.

## FB-2.2a — versioned UHC assessment proposal

The [bilingual review packet](../../content/training/day1-basic-competencies/learner-assessment-v2/proposals/fb-2.2a-uhc/REVIEW.md)
contains two new version-2 T05 questions, with every option, proposed answer and
rationale, plus an unscored provider terminology note. The source JSON links
all four remaining UHC wording requests and the official sources. T05 retains
its coverage objective with a linked secondary primary-care source; T06's
referral items are unchanged. Reviewers are unassigned, and the package is draft.

The local builder verifies the exact approved baseline, requires new release,
form and item identities, and exports a full draft candidate. The other 58 form
items, 48 checkpoint items and 42 lesson pins remain exact copies. Existing
enrollments remain on the original release for both phases, existing drafts
finish their pinned forms, and historical answers/scores are retained. There
is no import or activation operation, and the unchanged approved-release
validator rejects the draft.

Run `node scripts/feedback-uhc-proposal.mjs` for the candidate summary, `--review`
for the exact review packet, or `--output /tmp/fb-2.2a-candidate.json` for an
explicit local export. Exports refuse source-folder destinations and existing
files. The checked-in review copy is tested against the JSON proposal.
Sixteen new tests cover identity/version reuse, blueprint drift, translations,
claimed approvals, review-copy consistency, draft continuity and export/import
boundaries. The four tracker entries now point to this draft; feedback remains
open pending review and release.

Validation: all 2,175 tests in 247 files pass, including the 16 new proposal
cases. TypeScript and lint pass (the same four unrelated script warnings
remain). The current approved-release contract, recorded publication/hash
check and `git diff --check` pass. No active release, approval record, lesson
content, migration or learner record was changed.

## FB-2.2b — approved UHC publication

Owner `jongsky25` approved the FB-2.2a packet in chat with “approved contents
then publish”. The separate approval receipt pins the reviewed proposal hash
and commit `1b5d44db019934a2f962824c88535ab5d239f408`; this records owner
content/publication approval without claiming independent specialist review.
The new immutable release is `chapter1-feedback-uhc-v2`. It replaces only the
paired T05 questions, with the approved provider-definition note appended to
the post-test rationale and displayed after submission. Original questions,
options and answer keys exactly match the approved packet. The other 106
items and all 42 curriculum pins are unchanged. Comparability is unvalidated.

The guarded publisher reuses the existing draft importer, verifies live
curriculum pins and expected baseline form hashes, and switches new-enrollment
assignment atomically. It never writes enrollment, attempt, answer or score
records. Existing learners finish both phases on their original release. A
local PostgreSQL rehearsal covers a failed guard with full rollback, repeated
publication, unchanged history, and both old/new release selection. This is a
data release, with no schema or application route changes.

The final activation receipt and live hash verification are recorded in
[PR #333](https://github.com/jongsky25/BHW-Connect-Phase-2/pull/333).
On 24 October the owner explicitly requested closure of the four related UHC
reports. They are now resolved; signed-in confirmation remains outstanding.
The closure receipt is in the [remaining content audit](remaining-content-audit-2026-10-24.md).

## FB-2.1b — remaining ten assignments reviewed

[The review](remaining-content-audit-2026-10-24.md) covers exactly the ten
previously unreviewed content assignments, with findings, mappings, acceptance
checks and source/access limits. The system now records four UHC reports as
resolved on owner instruction and these ten as in_review. Automated closure
leaves resolved_by null; it does not impersonate an application administrator
or claim the pending signed-in journey was completed. No notifications or
replies were sent.

Five reports support wording improvements, one needs a local plant-aid protocol,
two are substantially addressed by current text, and two need original-item
context or reporter intent. Eight Chapter 1 lesson hashes match publication.
The two plant lessons were checked against actual published bilingual Read and
Slides because their whole draft hashes differ; copy matches excluding media
references. Exact legacy gift/lactation questions are identified separately
from active shared forms. No learning content, answer key, enrollment, attempt,
response or score changed in this increment.

The next proposed increment is FB-2.3: clearer accreditation recommendation
scenarios plus CSC naming/application precision. FB-2.4 handles legacy question
explanations, FB-2.5 defines accessible plant aids and local ownership, and
FB-2.6 recovers context and checks current wording. These are review outcomes,
not approved or published content edits.

## FB-2.3a — accreditation and CSC draft prepared

[The review packet](../../content/training/day1-basic-competencies/learner-assessment-v2/proposals/fb-2.3-accreditation-csc/REVIEW.md)
provides the exact proposed English and Filipino copy for the three FB-2.3
reports. T11 names a local recommending committee and keeps the board decision
separate. The Filipino stems use plain wording for the recommendation, and
feedback explains its meaning. Both paired questions use new identities;
all other test/practice items, including the approved UHC update, are retained.

The CSC lesson proposal expands Civil Service Commission (CSC) in Read and
Slides while preserving the current qualification conditions. A separate
unscored section explains authorized filing channels and personal certificate
receipt after approval, without inventing fees, approval or appointment promises.
Its Read, display and narration copy are in the same review packet.

The local builder pins the assessment/lesson baselines, validates both draft
structures and refuses claimed approvals, reused item identities or changed
continuity. Exports never overwrite files and must be outside the repository.
The candidate has explicit publication blockers: content review, media
reconciliation, a real approved lesson revision, refreshed curriculum pins and
separate assessment activation. Existing media and live learner content have
not been edited or regenerated. The three system reports remain in_review.

Validation: all 2,195 tests across 249 files pass, including 17 new draft
contract/export cases. TypeScript and lint pass, with the four existing
unrelated script warnings. The approved-release validator, immutable UHC
release reconstruction, baseline policy audit, tracker identity check and
`git diff --check` pass. No development or E2E was run against the pilot.

## FB-2.3b — approved CSC/accreditation publication; FB-2.4 drafted

The owner approved the exact FB-2.3 packet and directed continuation. The
approval receipt pins reviewed commit `a38f98c2383dfdebbdc869a06f8ac9348c3f6cd8`
and proposal hash. Release `chapter1-feedback-accreditation-csc-v3` contains the
new T11 pair and real new CSC lesson identity; its transaction publishes the
lesson and assessment atomically with all curriculum pins checked. Existing
learner records and earlier releases are retained. The publication PR carries
the final live activation receipt and record-integrity verification.

Narration rendering was rejected with HTTP 403. Five unchanged section tracks
remain usable; mismatched/new section tracks are withheld, with prior recordings
retained in history. Read and Slides include the full approved copy. The
optional qualification story's VTT was checked and its scope caption points to
the new filing section. New audio was not generated and no listening approval
is claimed. Historical test views remain hash-bound to their original bytes;
new release tests inspect the current source and audio selection.

[FB-2.4](../../content/training/day1-basic-competencies/learner-assessment-v2/proposals/fb-2.4-gifts-lactation/REVIEW.md)
now supplies exact bilingual T08/T09 proposals for gift/conflict and lactation
facility concerns. It separates the policy objectives, scopes the inducement
examples to infant formula, and preserves original legacy keys. It is an
unapproved authoring packet, with no import/activation capability. No further
feedback closures are claimed from approval/publication alone.

Validation: all 2,208 tests in 252 files pass, including 13 new publication,
continuity, preservation and next-draft cases. Lint and TypeScript pass with
the four existing unrelated script warnings. The database rehearsal verifies
rollback of lesson, criterion binding and assessment together; idempotent
execution; and preservation of original evidence/progress. The approved release
rebuild, retained C1AF registry check, baseline policy audit and whitespace check
pass. No development or E2E was run against the pilot.

## FB-2.4 publication and FB-2.5 inventory

The owner directed publication of the prepared FB-2.4 packet with “do it”.
[The review record](fb-2.4-review-2026-10-24.md) documents the fresh statute
checks, bilingual assessment review, owner approval and specialist-review limit.
The exact original proposal remains unchanged. The separate approved v4
snapshot replaces only four T08/T09 shared-form items, retaining the other 56
form items, all 48 checkpoints and 42 curriculum pins from CSC v3. The guarded
publisher preserves legacy keys, enrolled release assignments, historical
snapshots, responses and scores. No lesson, media or criterion changes occur.
The release PR records the final CI, publication, integrity and production
receipt; signed-in confirmation and report closure are not implied.

Continuation on [FB-2.5](fb-2.5-plant-aid-review.md) inventories 72 bilingual
practice files across twelve plant lessons and the two current published
process-diagram assets. Practice scenario cards are not verified botanical
reference cards. The draft defines the local clinical/training ownership,
provenance/version register, access/print checks, uncertainty stop rule and
consultation handoff. No named local owner or actual approved card is invented,
and no plant guidance is published. This report remains open for that local
handoff. The four FB-2.6 context/comprehension cases remain separately assigned.

Validation: all eleven focused proposal/publication tests pass, including
unchanged approved copy, drift refusal, failed-pin rollback, unexpected-active
release refusal, idempotence and preservation of pinned snapshots/scores.
Full repository and CI results are recorded in the release PR. Feedback statuses
remain in_review and no notifications or replies are sent.

## FB-2.5 owner approval and training assignment

The owner approved the plant-aid inventory, implementation plan and proposed
bilingual wording, and named **Ray Justin Ventura as training owner**. The
[approval record](fb-2.5-owner-approval-2026-10-24.json) pins the reviewed files
at commit `d43f6d59322e92e926c0c2c459eae1a0dfef843f` and preserves the exact
instruction. The inventory and current review packet now record this assignment.
Ray coordinates the actual reference aids, appropriate clinical review, local
consultation route and bilingual/mobile/print access checks. This does not
attribute clinical sign-off to him or publish an absent aid. The report remains
open until the recorded access and local-route acceptance checks are met.

## FB-2.5 pilot-first review experience

The owner clarified that a live pilot to inspect and comment on is the immediate
goal; local document collection should not block showing a prototype. The
[implementation record](fb-2.5-pilot-preview.md) describes the ten bilingual,
source-linked cards at `/plant-aids`, catalog entry, name search, printing,
fictional practice case and existing page feedback. Ray Justin Ventura remains
training owner. Clinical verification and a local consultation contact stay
pending for operational use; the current deliverable is explicitly a pilot for
review. No learner history, assessed lesson, rubric, release or feedback status
is rewritten. The release PR records final CI and production verification.

## FB-2.6 live clarifications

The owner directed continuation with the four remaining concerns. The
[review and implementation record](fb-2.6-live-clarifications.md) maps each
original report to a bilingual explanation and fictional unscored practice
case at `/content-clarifications`. Courses links to the page; the five relevant
BHW and assessor lesson routes link directly to their topic. The explanations
clarify the BHW's verification role, source-example ranking versus local causal
evidence, provider networks versus referrals, and benefit-specific conditions.
The existing page-comment feature supports feedback on particular sentences.

Current questions already preserve several of these boundaries, and the
network/benefits reports do not establish a specific historical scoring error.
The increment therefore supplies explicit learning clarifications without
rewriting the active forms, keys, lesson revisions, criterion pins or saved
scores. The four reports remain open for live comments and any exact-item or
presentation check still needed. CI/merge/deployment evidence is in the PR.

## FB-2.6 owner approval; FB-3.1 finish guidance

The owner approved the live clarification increment and directed continuation.
[The approval receipt](fb-2.6-owner-approval-2026-10-24.json) pins the deployed
artifacts at `2407f5667cdddc4fe224a7936e790bf019bdda16`; PR #340 was already
merged. Approval does not claim that original questions were edited or that
all remaining presentation/context concerns are resolved.

The next [FB-3.1 slice](fb-3.1-assessment-finish-guidance.md) addresses the two
reports about unclear review-before-submit and the missing next step after the
last answer. Chapter 1 now explains the finish sequence, distinguishes saved
choice/unknown/unanswered/marked counts, emphasizes Review all at the end and
provides review shortcuts. Failed saves cannot claim completion. Existing
navigation, confirmation, scoring, answer visibility and saved records remain
intact. The PR carries CI, merge and exact production deployment evidence.

## FB-3.2 personal results and completed-test review

The owner directed implementation of [the seven results/history reports](fb-3.2-personal-test-results.md).
A personal `/my-results` page links from Courses, the assessor queue and Chapter
1 assessment screens. It shows completed pre/post results, dates, form versions
and supported post-test review links, with exact raw counts only when complete
frozen evidence agrees with stored grades. Older/inconsistent records keep
percentages without guessed counts. Review can filter questions needing work
while retaining original numbers; scoring orientation uses labeled colors.

An additive owner-checked read-only history function returns safe aggregates,
never keys or item-level baseline correctness. Existing baseline restrictions,
post-test authorization, learner histories and grading remain intact. The PR
records database/access/UI tests, migration integrity and production evidence.
No reports are automatically closed and broader pre-test answer disclosure
remains a separate policy request.

## FB-3.3a mobile header and search

The owner directed the next mobile/wayfinding increment. The
[review of all 11 assignments](fb-3.3a-mobile-header.md) identifies the first
cohesive slice: consistent mobile control targets/alignment, compact accessible
search, wrapping brand text and a viewport-bounded search panel anchored below
its trigger. Explicit bilingual close and Escape return focus to search;
clicking another control dismisses the panel. Existing role/flag navigation and
search behavior remain. Lesson hierarchy, chapter/KB labels, destination
descriptions and preferred greetings retain their separate follow-ups. CI and
production evidence are recorded in the PR; no report is automatically closed.

## FB-3.3b lesson headings and chapter context

The owner directed the [heading and chapter-label slice](fb-3.3b-lesson-headings.md).
Lesson/subchapter pages in training and assessor personal study now share a
visible chapter/subchapter block, route-appropriate outline links and a stronger
responsive H1. The historically pinned shared reader remains unchanged.
Numbering comes from existing delivery metadata, and existing lesson sequence
scopes remain intact. Long-title wrapping and light/dark accessibility are
checked on disposable fixtures. No learning content, grades or policy changes;
linked reports remain open for live comments. The PR records final CI and
production verification.

## FB-3.3c destination descriptions and reference collections

The owner directed the [navigation and KB-label slice](fb-3.3c-navigation-and-kb-collections.md).
Home cards and expanded menus now explain each destination, using the same
existing role/flag-filtered item list and concise accessible names. KB browse
and category pages show exact source-collection context: Reference Manual
Chapter 1 modules, separate HHP+/PhilPEN modules, PhilHealth guidance and
additional reference topics. General topics receive no invented course sequence.
Stored category names, content, URLs, visibility and lesson/progress rules remain
intact. Both linked reports remain open for live comments; CI and exact production
verification are recorded in the PR.

## FB-3.3d preferred greeting name

The owner directed the [preferred-greeting slice](fb-3.3d-preferred-greeting-name.md).
Settings now offers a saved personal Home greeting name, with explicit save and
blank reset. Home uses it when available and otherwise retains the full name.
A private, owner-checked preference store leaves official names, certificates,
grades and existing auth/settings contracts intact. Preview does not fetch or
edit the preference. Database, UI and fresh-session browser tests are recorded
in the PR with migration integrity and exact production receipts. The linked
report remains open for live comments.

## FB-3.3e reading tools and labeled zoom controls

The owner directed the [lesson-control/readability slice](fb-3.3e-reading-tools.md).
Manual lesson pages now offer a bilingual local Comfortable/Standard layout and
collapsed help for existing controls. Regular inline Read pages gain a narrower
column and more paragraph space; authored story layouts, Slides and full-screen
fitting retain their existing presentation. The fit toolbar displays Zoom out,
Zoom in and Fit to screen with wrapping touch targets. Reader identity, answer
state, content, narration, gates and progress APIs remain intact. The three
reports stay open; broad illustration/subchapter-copy requests remain separate.
The PR records CI and exact production evidence.

## FB-4.1a section continuity across Read and Slides

The owner directed the [first confirmed presentation mismatch fix](fb-4.1a-mode-continuity.md).
The review covers all 15 FB-4.1 assignments (correcting the earlier count of 14),
12 published lessons and 46 available referenced image paths. Two educator
reports lead to a reproduced shared-concept/stale-resume section jump. Explicit
format changes now prefer the unique matching section while lesson reopening
retains existing saved-position behavior. Bilingual inline/full-screen tests
cover reordered slides and fallback cases. Authored lessons, media, assessments,
completion rules and historical approval hashes remain intact. An exact shared
reader successor preserves the prior source for historical guards. All reports
remain open; the review records each visual, story, disclosure or rendering
follow-up. CI and production receipts are in the release PR.

## FB-4.1b AI illustration disclosure

The owner directed [visible visual-provenance labels](fb-4.1b-ai-visual-disclosure.md).
English/Filipino captions now identify verified AI illustrations and distinguish
animations that include them. A registry binds 155 exact asset identities to
source evidence and complete media hashes; it avoids classifying unknown media,
code-authored schematics, photographs or AI narration alone. The reported UHC
scene is covered in Read, Slides and fullscreen. Existing text, media, controls,
assessment and completion rules remain intact. Three earlier built-in scenes
still need stronger provenance; the report remains open for that follow-up and
live comments. The release PR records CI and production evidence.

## FB-4.1c story case context and literal transcript

The owner directed the [story/context comparison and focused fix](fb-4.1c-story-context.md).
The current recording already identifies Liza's childcare concern, but omits
Jo/Ben/Ramon's situations while summarizing how to respond. The story view now
introduces all four people using approved Read excerpts and replaces its generic
Steps as text fallback with the exact bilingual caption transcript. Revision,
video/caption identity and excerpt checks prevent stale supplements. Existing
media, questions, grades, completion rules and historical approval hashes remain
intact. This is on-screen context, not regenerated speech. Both reports remain
open for live comments and later spoken-story/placement review. The release PR
records CI and exact production evidence.

## FB-4.1d relationship learning visuals

The owner directed [four relationship visuals and the follow-up image review](fb-4.1d-relationship-visuals.md).
The four text-only positions now have bilingual native-text role/limit cards,
known/unknown comparison, parallel concern/contact rows and neutral practice
cards. Every slide has an existing image or a new diagram; approved summary
lines are reflowed where appropriate. The revision-bound graphics retain
practice-response gates and all source/media/history/grade contracts. The
Following up constructively scene was inspected: it fits the opening, while
later question-comparison and next-contact concepts merit distinct visuals.
That remains a separate follow-up. Reports stay open for live comments; CI
and exact production evidence are in the release PR.

## Next work

1. Finish signed-in verification of FB-1.1a and the original feedback-return path.
2. Confirm the progress display using the reporter's correct account/persona and
   chapter, then disposition the historical mismatch based on evidence.
3. Finish signed-in verification of FB-1.2a; identify the original blocked lessons before
   closing the two reports submitted on `/feedback`.
4. Finish signed-in verification of FB-1.3a for admin location scopes and both interface languages.
5. Retain the pending signed-in FB-2.2b check despite owner-directed report
   closure. Verify the approved FB-2.3 release in a signed-in new-enrollment
   journey and verify the approved FB-2.4 release. Continue FB-2.5 with the named
   training owner Ray Justin Ventura to obtain the actual approved plant aids and
   consultation route; then handle FB-2.6 context checks.

The remaining increments keep their proposed assignments until reproduction or
content review establishes an implementation-ready task. Mandatory question
sequence, lesson locks, answer-key visibility and course-length changes must
follow the existing approved learning policy and explicit product decisions.

## FB-4.1e — follow-up question, response and contact visuals

[Delivery record](fb-4.1e-follow-up-visuals.md) documents three bilingual diagrams
in Following up constructively, retained opening scene and assessment, exact
revision binding, responsive accessibility checks and the live review boundary.
