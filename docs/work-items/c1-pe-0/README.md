# C1-PE-0 — Chapter 1 baseline

Owner: current Codex session, single-session discovery; no parallel assignment.
Updated: 20 November 2026 (UTC).
Branch / PR: `plan/chapter1-pilot-enhancements-2026-11-20`, [#515](https://github.com/jongsky25/BHW-Connect-Phase-2/pull/515).
Code baseline: `44ba7477057c1495256b729d5f5d4fd13beb2c01` (current main).
Planning head on entry: `456050b2077ad5e65572189ce857f8cefa768422`.
Owned paths: this directory, parent phase plan and work-register pointer only.

**Status: repository/publication inventory and local recovery checks established;
signed-in usability evidence remains outstanding.** This baseline made no code,
schema, learner-record, policy, flag or publication changes. The following
[C1-PE-1 reference increment](../c1-pe-1.md) adds the reading surface.
The source map is usable for C1-PE-1 discovery, with the effective loader parity verified below;
it is not approval of verbatim excerpts or a claim of full content alignment.

## Evidence and limits

- Current PR #515 is open. `git fetch` confirms its code baseline equals main.
  `gh pr list` also finds older open work, including #193 lesson progression and
  #324 middleware caching. This audit does not take ownership of those branches.
  Connector issue search returned no results despite the known open PR; use the
  direct PR lookup and CLI list as the reliable evidence here.
- Vercel read-only deployment listing reports production
  `dpl_HqqkAVCLbRoP2iVGqNqAZR4pcPYT`, READY, at the exact main SHA above.
  This establishes deployment identity, not authenticated browser behavior.
- Bounded SELECTs through the Supabase connector inspected only Chapter 1 content
  identities, published reading sections, release/form metadata, flags, and two
  function definitions. No personal learner records were retrieved. No RPC that
  starts an attempt or writes progress was invoked.
- [Publication receipt](publication-baseline.json) records all 42 live lesson
  IDs/revision IDs/hashes, nine module identities, active form IDs/hashes and
  item-to-lesson links. Queries limited lessons to 60, flags to 40, releases to
  20 and active forms to four; returned 42, four, eight and two respectively.
- `npm run doctor -- --brief`: no local DB configured; pilot loader credentials
  absent. Connector SQL access nevertheless works. Signed-in browser access was
  not established; there was no pilot E2E or fault injection.
- Original manual downloaded from the documented Drive ID
  `13auqmQNRLevwxTm3lkMRHX13U1_d0TYs`; 150 pages, SHA-256 in the receipt.
  Text/page footers inspected for PDF 11–25; PDF 20–23 rendered and visually
  checked for the missing tables. The 40 MB PDF is not added to the repository.

## Published lessons and source map

[lesson-source-map.csv](lesson-source-map.csv) has one row per published lesson,
in live module/lesson order. Each row includes the lesson UUID/key/number, exact
named source section and printed/PDF pages, published scenario opening and
section/check IDs, active pre/post item UUIDs and slots, checkpoint group,
repository source path, publication identity and source limitations. An empty
direct item mapping is explicitly distinguished from a supporting blueprint slot.
Scenario openings are inventory excerpts, not the whole scenario or a full
semantic review. The source ranges identify candidate complete sections; use
the named headings to avoid including unrelated text sharing the same page.

| Major section | Published lessons | Primary manual section: printed / PDF pages |
| --- | ---: | --- |
| 1.1 Roles | 6 | Ang mga Tungkulin ng Isang BHW: 3–4 / 11–12 |
| 1.2 UHC | 4 | Mga Polisiya — R.A. 11223: 5 / 13 |
| 1.3 BHS policies | 5 | Mga Polisiya — Iba pang polisiya: 5–6 / 13–14 |
| 1.4 RA 7883 | 5 | R.A. 7883 and BHWE: 5 / 13; role definition: 3 / 11 |
| 1.5 Barangay and teamwork | 6 | Barangay partners: 7–9 / 15–17; Team Work: 9 / 17; Self-Management: 9–10 / 17–18 |
| 1.6 Communication | 5 | Epektibong Pakikipagkomunikasyon: 10–11 / 18–19; records also 4 / 12 |
| 1.7 Problems and solutions | 4 | Pagkilala sa mga Problema at Pagpaplano ng mga Solusyon: 11–13 / 19–21 |
| 1.8 Safety | 4 | Occupational Safety and Health: 13–15 / 21–23 |
| 1.9 Sustainable practice | 3 | Partial support: single-use plastics policy, 6 / 14; authored audit/trial procedures have no direct complete passage |

Corrections to the historical source README's index: communication begins on
PDF 18, problem solving begins on PDF 19, and safety starts on PDF 21 with its
table continuing through PDF 23. Printed page 15 / PDF 23 is almost entirely
an image and appears as only “15” in the transcription. PDF 22 covers sharps,
infection and muscle strain; PDF 23 covers stress and accidents. PDF 20 has the
Five Why table; PDF 21 has the priority table (19, 17, 16, 15, 12, 10).
Do not copy the old index's safety pages 16–17 into new citations.

No curriculum-wide misalignment is established. Some scenarios intentionally
teach application beyond a short manual paragraph. In particular, the resource
audits and trial calculations are not verbatim manual procedures; BHWE contains
cited statutory/CSC detail beyond the manual summary. Preserve these boundaries
and do not silently edit quotations to match an authored explanation.

### Resolved raw-source differences — effective loader parity

The existing `loadReferenceModule` validator accepted all nine modules / 42
lessons. Its `contentHash(lesson)` matched 34 live publication hashes. Eight
did not match. Canonical reading-section comparison narrowed seven to:

| Lesson | Fields differing between current checkout and publication |
| --- | --- |
| bhw-roles-hepo | morning.body_fil |
| bhw-roles-application | check.check |
| bhs-decline | section-4.body_fil and body_en |
| bhw-legal-role | status-and-other-processes.body_fil |
| bhw-accreditation | accreditation-application-check.check |
| communication-clarify | open-question.heading_fil |
| safety-identify | check.check |
| communication-explain | Approved item-12 contextual story media, captions/posters and English duration; reading sections equal |

Follow-up correction: these are intentional raw-source differences, **not a
loader/publication discrepancy**. `training-load.mjs` calls
`applyApprovedReferenceReleases` after `loadReferenceModule`. That chain applies
four wording successors, the transfer and accreditation checks, the safety
choice, and the item-12 contextual story media. Complete published payloads for
all eight were compared, including private facilitator notes (unchanged).
The effective loader output matches **all 42 published hashes**. The eighth
case is the approved `communication-explain-context` media/caption/poster URLs
and English duration, all already in the repository.

The initial baseline omitted the approved-release overlay step and overstated
the risk as publication drift. The CSV now records both raw and effective
hashes. Do not edit protected raw authoring packages to remove this intentional
difference; that would break the reviewed predecessor chain. A new regression
check in `scripts/tests/chapter1-manual-reference.test.mjs` verifies all 42
using the actual effective loader. Inventory scenario excerpts remain from the
live reading sections. No republish or data repair is needed.

## Route and screen inventory

Route variables: `P=8dfe8b88-84ce-4e60-a353-93031eceda59`,
`C=73e0edda-6c28-420f-9c35-05a29563abd3`; module and lesson UUIDs are in the
CSV. These are route templates, not claims of signed-in live verification.
Sources below are relative to repository root.

| Surface | Route / current behavior | Source |
| --- | --- | --- |
| Entry and dashboard | `/home`, `/courses`; assessor home has Assessor Courses and BHW Assessments cards | `src/app/home/page.tsx`, `src/app/courses/page.tsx` |
| BHW chapter/module/lesson | `/training/P/chapter-1[/moduleId[/lessonId]]`; Read/Slides, checks, saved completion, next lesson or return to list | `src/app/training/[programId]/[[...path]]/page.tsx`, `src/components/elearning/reference-lessons.tsx` |
| Assessor study | `/training/P/assessor/chapter-1[/moduleId[/lessonId]]`; separate own study progress, Prepare/Run/BHW view and guide/reference expansion | `src/app/training/[programId]/assessor/[chapterKey]/[[...path]]/page.tsx`, `chapter1-lesson-flow.tsx` |
| Shared assessment | `/courses/C/assessment`; entry, overview, recap, questions, review-before-submit, result; 30 questions per pre/post form | `src/components/elearning/chapter1-assessment.tsx` |
| Persistent results | `/my-results`; submitted post-test detail at `/courses/C/assessment/review/attemptId`; all / needs-review filter, selected/correct answer, rationale and lesson links | `src/app/my-results/page.tsx`, `src/app/courses/[id]/assessment/review/[attemptId]/page.tsx` |
| Assessor preparation | `/training/P/assessor/chapter-1/briefing`, `/orientation`, `/simulation`; briefing, six orientation lessons/case checks, Maria rehearsal | corresponding `page.tsx` files; `assessor-preparation-checklist.tsx` |
| Assessor assessment hub | `/assessments`; area, chapter/subchapter selection, pending/assigned work | `src/app/assessments/page.tsx`, `bhw-assessment-hub.tsx` |
| Learner roster | `/training/P/assessor/workspace`; search, area, learning-status filters, paginated roster, component readiness/request selection | corresponding `page.tsx`, `rpc_assessor_chapter1_workspace` |
| Practical work | `/training/P/assessor/observe`, `/formal`, `/followups`, `/review`; practice observation, formal attempt, follow-up and chapter review | corresponding `page.tsx` files and `src/lib/assessor/` |
| BHW requests/feedback | `/training/P/assessment-requests`, `/practice-feedback` | corresponding `page.tsx` files |
| Qualifications/certificates | `/training/P/assessor/qualifications`; `/assessor-certificates/[certificateId]`, `/certificates/assessor/[certificateId]`; separate overall certificate routes | corresponding `page.tsx` files, `src/lib/assessor/certifications.ts` |

Simulation checkpoints (all eleven in `src/lib/assessor/simulation-storyboard.ts`):
find-maria, prepare, brief, observe, feedback, missing, readiness, arrange,
formal, chapter-gap, final-review. Runner fields include observed-fact checkboxes,
private fictional note, guide/learner/return steps, scene choices, hints,
Save evidence / pause, Check saved status, debrief and completion receipt.
It explicitly uses fictional information; it does not certify a real learner.
The existing orientation/simulation already provides guided practice, but this
does not establish that November participants could use the real workflow unaided.

## Current assessment and award policy

Evidence: current live definitions of `rpc_learner_assessment_start` and
`rpc_learner_assessment_review`, matching the definitions in
`supabase/migrations/20261012152647_assessor_chapter1_shared_assessment.sql`;
the [approved owner decision](../../chapter-1-assessor-c1af-27-owner-decision.md)
and [pilot activation record](../../chapter-1-assessor-c1af-28-release-handoff.md).

| Behavior | BHW learning | Assessor qualification |
| --- | --- | --- |
| Forms | Shared versioned pre/post forms, currently active v8 for new enrollment; old enrollment stays pinned | Same form infrastructure, separate assessor exam evidence |
| Pre-test | Before started content; one submitted baseline | One submitted baseline; study/exam context enforced |
| Post-test | Completion and baseline required; submitted attempt reused, no ordinary learning retake | All required lessons and baseline; retries before a qualifying pass; further start rejected after qualifying pass |
| Disclosure | Review RPC requires own submitted post-test; returns saved form snapshot, answers and rationale | Same own submitted post-test rule; no draft key through this RPC |
| Pre-test detailed review | Not supplied by this review RPC, even after post-test | Same; do not infer approval to release it |
| Practical competency | Valid submitted pre/post tests, no new score threshold; fresh sufficient formal `kaya_na` evidence for all 42 criteria across nine components | 80% qualifying post-test plus current study, six orientation lessons, 7/8 cases including safety, eleven simulation checkpoints |
| Awards | Test completion alone does not constitute practical competence/certification | Simulation receipt alone does not grant certification or current authority; version/current permission gates remain |
| History | Immutable attempt snapshots; legacy review explicitly labels missing original form/explanations | Separate historical qualification/exam records; recovery requires current prerequisites |

The current active release is `chapter1-feedback-needlestick-context-v8`; both
forms have 30 items. The four queried Chapter 1/assessor flags are enabled with
no disabled roles. This is not a fresh verification of every cohort/award gate.

Specific decisions still needed **before C1-PE-3 changes policy**:

1. Permit BHW practice retakes after post-test submission? If yes, define the
   first attempt versus practice treatment and keep formal evidence/history intact.
2. Release BHW pre-test detail after the first post-test, or retain score-only
   pre-test review? Current code implements the latter.
3. Retain current assessor own-post-test disclosure and retries-before-pass, or
   explicitly approve a different qualification policy? Do not automatically
   copy any newly approved BHW learning rule to assessors.

Existing owner decisions already answer the threshold and practical-award
questions; do not ask those again. The decisions above do not block reference
mapping, wording or navigation work. No decision is inferred from this audit.

## Finite feedback/gap register

“Already satisfied” below describes a code capability, not closure of November
usability feedback. No November concern is closed solely by a historical fix.

| ID / phase | Classification and finding | Acceptance evidence still needed |
| --- | --- | --- |
| G01 / 1 | Reproducible gap: full attributed manual passages are not a dedicated section in the inventoried published lessons; historical transcription misses figures/tables | All 42 reference mappings, complete relevant quotations/figures and mobile review; explicitly label partial support in 1.9 |
| G02 / 1 | Resolved evidence: eight intentional raw-source differences are approved overlays; effective loader matches 42/42 live hashes | Retain the approved overlay chain and hash parity test; no publication repair |
| G03 / 1 | Unresolved evidence: difficult Filipino terms; no frequency or participant examples established here | Review authored instructions with representative users; preserve quotation wording; record exact old/new wording |
| G04 / 2 | Already satisfied in code: saved lesson completion, next lesson and last-lesson return; remaining discoverability is a content visibility concern | Phone walkthrough for first, middle, last, prerequisite-blocked and completed/revisited lesson; no lost access |
| G05 / 2 | Already satisfied in code: two assessor home cards, stage checklist and assessment hub; remaining unclear steps are unresolved usability evidence | Assessor identifies current stage and next action unaided, including incomplete state |
| G06 / 3 | Already satisfied in code/live RPC: snapshot post-test rationale, persistent history and needs-review filter; historical rationale unavailable is an explicit limitation | Reopen eligible new and historical attempts, reject another user's/draft requests, preserve original scores; manual references still need adding |
| G07 / 3 | Reproducible payload gap: UI supports `distractor_rationale`, but current review RPC projects only option ID/label | Decide whether selected wrong-choice explanations are required; if so, expose approved snapshot explanations only under submitted-owner gate |
| G08 / 3 | Current BHW retake restriction conflicts with proposed new behavior, but is not an implementation defect until policy approved | Resolve decisions above; preserve initial and practice attempts separately |
| G09 / 4 | Existing roster/readiness/status views do not establish a reconciled Chapter 1 topic-gap dashboard | Define authorized learner cohort, denominators, first/practice attempts and topic mapping; reconcile to records in disposable fixtures |
| G10 / 2,5 | Simulation already has guided scenes, saved-status recovery, fictional notes and debrief; confusing wording/field order remains unresolved usability evidence | Assessor completes representative real-flow practice, including missing evidence, without changing rubrics |
| G11 / 5 | Connectivity failures not reproduced in this session; code has recovery mechanisms but no offline guarantee | Execute the fault matrix below in a disposable environment and record outcomes |

## Interrupted-connectivity baseline matrix

The source-observed matrix below now has executed local evidence: 82 focused
Vitest tests passed across assessment resume/pacing/finish, lesson saves and
completion, simulation recovery and in-memory assessment database behavior.
The existing isolated Chromium assessment journey also passed. These use local
fixtures/in-memory Postgres, not the pilot. They are not full browser-to-PostgREST
network fault injection; cold offline loads and arbitrary tab-close data loss
remain unverified. The new reference-only browser check separately covers
already-loaded reference text while offline, not offline cold loads.

| Journey / condition to reproduce | Observed implementation baseline | Required check / existing target |
| --- | --- | --- |
| Fresh lesson/reference access offline; slow media download | Server-rendered content requires connectivity; no full-offline guarantee; new reference section absent | Fail visibly, reconnect and reopen same lesson; test cold load and cached revisit independently |
| Lesson resume save fails, then reconnect | Debounced resume save, error/retry; saved position restored | `manual-lesson.test.tsx` reload/retry case; do not mark unsaved position durable |
| Completion request fails or response disappears | Completion error/retry and milestone UI; completed lesson remains replayable | `reference-completion.test.tsx`; separately verify response-loss idempotence in local DB |
| Assessment answer or position save fails | Blocks leave while busy/pending; same mutation receipt reused for lost position response | `chapter1-assessment-pacing.test.tsx`, `chapter1-assessment-resume.test.tsx` |
| Assessment submit commits but response is lost | Client rereads attempt; otherwise says submission not confirmed and retains saved answers | `chapter1-assessment.tsx` submit/recovery; local server count must remain one final attempt after retry |
| Simulation evidence save fails/status recovery | Keeps unsaved note/facts in memory, offers Check saved status | `assessor-simulation-runner.test.tsx`; separately check reload/closing tab while unsaved and document limits |

Use explicit conditions: reject one request before server receipt; commit then
drop the response; delay response while navigating; disconnect then reload;
reconnect and retry. Record request, durable state, visible state and duplicate
count. Never inject faults or run E2E against the pilot.

## Checks and delivery

- Passed: `npm run doctor -- --brief` inspection; dependency-free
  `node scripts/chapter1-assessment-check.mjs` content contract; existing
  `loadReferenceModule` validation for nine modules / 42 lessons; canonical hash
  and reading-section comparison to the bounded live inventory.
- Original PDF identity/page boundaries and four rendered table pages checked.
- Attempted `node --test` for two assessment/audit test files could not run:
  they import Vitest, which is not installed. No test assertions executed; this
  command is not the correct project runner. Use the project's Vitest runner
  when dependencies are available. No dependency installation/full app suite
  was performed for this documentation increment.
- Passed: CSV/JSON integrity checks (42 unique lessons, nine modules, 60 unique
  active questions, eight hash mismatches), required source-map fields, all
  lesson-source paths and Markdown links, and `git diff --check`.
  No application behavior change requires lint/typecheck here.
- Delivery: bundled with the C1-PE-1 implementation in PR #515; see its handoff
  for actual push/release state. The earlier docs-only push restriction no longer
  requires keeping this baseline separate from remote work.
- Rollback: baseline documentation needs no data recovery. The reference UI has
  its own code-only rollback described in C1-PE-1.
- Next: signed-in usability observation remains outstanding; reference work can
  proceed using verified effective source/publication parity. Do not claim full
  connectivity or representative-user validation from local fixtures.
