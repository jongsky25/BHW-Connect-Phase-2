# Sol implementation handoff: Chapter 1 understanding and feedback

Status: implementation-ready specification, 11 October 2026. This package changes documentation only. It does not contain a finished question bank, working feature, completed pilot or deployment authorization.

Start here, then read the [blueprint](README.md), [research and gap review](research-and-gap-review.md), [orientation copy](orientation-and-recap.md), [feedback specification](feedback-and-reinforcement.md), [lesson map](lesson-assessment-map.csv) and [question audit](current-question-audit.csv). This handoff resolves earlier open implementation choices. Preserve the agreed purpose: understanding and learning gaps; observed practical performance remains separate.

New-chat starting point: the GitHub handoff branch is `codex/chapter-1-assessment-sol-handoff`. If this documentation PR is not merged, fetch that branch and create the implementation branch from it so the complete package is present. If it is merged, start from current `main`. The audit remains pinned to `0e925326b1f9b2ab138f2a3d5b3267fff0a04621`; the handoff branch was prepared on the later `5bb7c096` main commit, which publishes lesson 1.9.3 in PR #282. Reconcile that lesson's revised examples and feedback, plus any subsequent curriculum changes, before final question authoring. Do not mistake the pinned audit for a claim that later releases were fully re-audited.

## 1. Fixed scope and defaults

| Decision | Build default |
|---|---|
| Target | BHW learner Chapter 1, identified by program `content_key=bhw-reference-manual` and `chapter_key=chapter-1`; never hard-code environment UUIDs. |
| Opening | Expectation setting, then a high-level chapter overview/objectives, then baseline pre-test. Do not teach answers before baseline. |
| Introductions | Exactly **nine complete bilingual introductions**, one for each major lesson 1.1–1.9. All nine delivered together; no 42 smaller-lesson introductions, checkpoint introductions or incremental introduction fragments. |
| Test delivery | One question per screen; 30 pre and 30 distinct post questions; three sections of ten; no countdown. Back, skip temporarily, mark, review, save and resume. |
| Test content | T01–T30 in blueprint order; three options per question plus a separate explicit unknown action. Same semantic option IDs across languages; no randomization in this release. |
| Scoring | Correct=1; incorrect/explicit unknown=0, stored distinctly. Blank is incomplete. No new BHW pass threshold, score gate or certification rule. |
| Feedback | Pre: total and broad study areas, no keys. Post: all answers, correctness and explanations after confirmed submission, available permanently under normal record retention even after passing/certification. |
| Reinforcement | Twelve optional two-question checkpoints at mapped boundaries. One optional fresh alternate per checkpoint question. Further repeats are labeled practice of an already-seen item. |
| Reflections | Optional learning insight and question/lesson feedback, 1,000 characters per field, no minimum. Private saved drafts; explicit sharing with the assigned reviewer; ungraded. |
| Closing | Bilingual “What we have learned in Chapter 1” immediately before post-test entry, without reproducing test questions. |
| Reporting | Counts and review topics, no per-major-lesson mastery labels. Separate form scores; comparable-change display disabled initially. |
| Existing behavior | Preserve 42 smaller lessons, 46 Read checks, completion rules, practical rubrics and assessor qualification. Existing certified learners are not sent through a new baseline. |
| Excluded | Adaptive testing, AI grading, generated questions, audio recording, mandatory essays, independent reassessment/retake policy, delayed retention testing, new external messages and offline synchronization. |

Internal dependency steps below organize engineering work. They are not separate user-facing releases or permission to deliver only a few of the nine introductions.

## 2. Content deliverables and validation

Create a dedicated source directory, proposed `content/training/day1-basic-competencies/learner-assessment-v2/`. Do not overwrite `test-questions.json`: it also supplies assessor qualification exams.

Required deliverables:

1. One release manifest with stable release/blueprint IDs, source commit, program/chapter keys, exact approved lesson revisions/hashes, publication status, paired form IDs and `comparability_status: unvalidated`.
2. Expectation setting, chapter overview, all nine introductions and the chapter recap, in English and Filipino, adapted from the existing draft. Keep the existing introduction IDs from the lesson map. No additional introduction records for the 42 smaller lessons.
3. Two immutable forms, each with exactly 30 items. Every slot T01–T30 appears once per form. Per-major allocation is 4/3/3/3/3/4/4/3/3. Slots T01–T10, T11–T20, T21–T30 form the three sections.
4. Twelve checkpoint definitions, G01–G12, with mapped lesson boundaries, two first-pass items and two corresponding alternate items each: **48 formative items total**. They must be distinct from the 60 test items and existing Read checks.
5. Reflection prompts from the lesson map and reviewed EN/FIL interface copy, including saved/error/conflict states and historical-review limitations.

Total authoring budget: **108 unique questions**, each with bilingual text, not 108 first-pass interactions. Eight test items in the four sample pairs and two formative examples are drafts, not approved content; author the remaining 52 test items, 22 initial practice items and 24 alternates, and review all 108. The first-pass workload remains 60 tests + 46 existing checks + 24 optional checkpoint responses = 130 opportunities.

Each item needs `item_id` (UUID), stable editorial key, version, primary slot/target, supporting lesson keys, safety/privacy review flag where relevant, bilingual stem, three stable option IDs with bilingual labels, one correct option ID, bilingual general rationale and rationale for each distractor, approved lesson links, and source/reviewer metadata. Unknown uses the general explanation; do not invent a misconception for it. Test pre/post counterparts use distinct IDs. A related-practice link is optional: only show it when a reviewed formative item genuinely matches that target. Every test target must have a valid lesson-review link.

Build a schema validator and a separate dry-run/import script for this directory. Reject missing translations, duplicate IDs, missing slots, invalid keys, wrong counts, unapproved references and broken target mappings. Check a full form's hash, not only its individual items. Import transactionally, re-running an identical release is a no-op, and any content change requires a new version. Keep answer-bearing files out of public assets, browser bundles, static page props and client imports. No existing `training:load --mode assessments` call may load these forms into the shared bank.

Content review checks whether the item actually requires its intended decision, whether another option could also be right, whether language or option length gives clues, and whether its reasoning and policy assumptions match approved teaching. This review is essential evidence of alignment, not a promise of psychometric validity.

## 3. Data architecture and compatibility

Use additive migrations and a private schema, proposed `learner_assessment_private`, with no direct `anon` or `authenticated` table access. Public RPCs expose only authorized projections. Follow existing actor-resolution patterns, fully qualified SQL names, a safe explicit `search_path`, restricted EXECUTE grants and server-side course/role/organization checks. User-supplied learner IDs are never authority.

| Proposed entity | Required data and invariants |
|---|---|
| `releases` / `forms` | Immutable content and review metadata, paired form IDs, curriculum scope/hash, active/withdrawn status and comparability decision. Keys and rationales remain private. |
| `enrollments` | One learner/course assessment assignment; records the release pair pinned when baseline starts. This is assessment-version assignment, not a replacement for existing training-session enrollment. Legacy-baseline learners receive an explicit legacy-to-v2 designation. |
| `attempts` | UUID, actor/course/session, phase, state, form snapshot/hash, exact 30-item order/options/keys/rationales/lesson references, start/submission timestamps, navigation, language, revision number and final legacy-attempt ID. One active draft per learner/course/phase; first submitted attempt cannot be replaced. |
| `responses` | Attempt/item, tagged choice or unknown, stable option ID, marked-for-review state and server revision. Unique attempt/item. Blanks are absent/unset, not zero-scored answers. |
| `mutation_receipts` | Actor/resource/mutation ID, committed revision and result reference. Unique operation identity; replay returns its committed result, while reuse with a different payload is rejected. |
| `reviewer_assignments` | Learner/course, one active reviewer, assigning admin, timestamps and previous assignment history. Validate reviewer role/status and authorized organization relationship. |
| `reflection_drafts` / `reflection_versions` | Scope (entry expectation, lesson, group or chapter), learner, fields, draft revision, immutable shared versions, language and whether written after checkpoint feedback. Sharing freezes a version; subsequent draft edits remain private. |
| `reflection_reviews` / `replies` | Shared version, assigned reviewer, status, timestamp and learner-visible reply. Existing private competency observation notes are never reused as replies. |
| `practice_attempts` / `practice_responses` | Group, frozen item/variant identities, first committed response, later practice events and feedback exposure. Record skipped/in-progress/completed distinctly. Never write these into diagnostic attempts. |

For each final v2 test, atomically write one compatible `public.course_test_attempts` row and link its ID. That preserves existing existence-based gates, score consumers and one-attempt-per-phase uniqueness. Drafts never enter that table. Preserve its required `score_percent`, `answers`, phase and actor/course/session fields. In the compatibility JSON, use the frozen item UUID as `question_id`, the frozen option index for a choice, and `selected_option_index: null` plus `response_kind: unknown` for unknown. The private snapshot is authoritative; update legacy parsers to branch on linked v2 metadata, never interpret null as option zero or join v2 IDs to the old bank.

Expose an authorized attempt-summary RPC including generation (`legacy`/`v2`), form/curriculum IDs, counts and comparison eligibility. Use it where reports need metadata, without changing existing score history or unnecessarily expanding row visibility. Keep the legacy one-pre/one-post uniqueness constraint. No new independent retakes are introduced.

The existing assessor exam's private snapshot pattern is a useful reference, but do not reuse its qualification rules or tables. Preserve its existing shared bank, **minimum 38 questions and 80% passing rule**.

## 4. RPC contract and state transitions

Proposed RPC names below are part of the implementation plan, not existing APIs. Validate payload schemas at the boundary and authorize every call, including direct RPC requests.

| API | Contract |
|---|---|
| `rpc_learner_assessment_start(course, phase, session?)` | Resolve actor and eligibility; serialize starts on learner/course; return existing submitted result or active draft idempotently. Otherwise pin the release and snapshot its form. Return safe questions without keys/rationales. Validate session enrollment when supplied. |
| `rpc_learner_assessment_get(attempt)` | Owner's state, safe frozen form, saved responses and current revision. A submitted pre-test still does not expose keys. |
| `rpc_learner_assessment_save(attempt, expected_revision, mutation_id, changes, navigation, language)` | Tagged answer is `{kind: choice, option_id}` or `{kind: unknown}`; allow explicit unset before submission. Reject foreign item/option IDs and duplicate entries for an item in one payload. Deduplicate mutation IDs; conflict if stale revision. Return acknowledged state/revision. |
| `rpc_learner_assessment_submit(attempt, expected_revision, mutation_id)` | In one locked transaction, verify eligibility and exactly one valid answer/unknown for all 30 snapshot items, compute server score, persist immutable responses and compatibility row. Repeated submission returns the same result. No client score or key is accepted. |
| `rpc_learner_assessment_review(final_attempt_id)` | Post-test only; owner or authorized assessment reviewer. v2: exact snapshot and explanations; legacy: provenance-aware reconstruction below. Availability does not depend on a pending queue, score or certification status. |
| `rpc_learning_notes_*` | Separate save draft, share version, read own history, reviewer queue/status and reply operations. Reviewer actions require an active assignment at request time. Sharing empty fields is a no-op; one nonempty field is sufficient. Enforce the 1,000-character limit on server and client. |
| `rpc_learning_reviewer_assign(learner, course, reviewer?)` | Existing scoped admin authority; validate both parties, maintain history and revoke previous review access. No learner self-assignment and no assessor self-claim. |
| `rpc_chapter_practice_*` | Start/resume mapped group, commit response then release that item's feedback, get summary, optional alternate/repeat. Own state only for mutations; idempotent response commit protects the first response. |

Attempt states: `not_started → draft → submitted`. No draft score. Submitted is terminal. A withdrawn unsafe form can be marked `invalidated` by an authorized administrative operation with an audit reason; it is retained, and a replacement draft is explicitly identified. Routine publication of a new bank must not invalidate or rewrite drafts. Do not add a learner “restart baseline” control.

Save a selected response promptly; flush before changing question or leaving. Only display Saved after server acknowledgement. During failure preserve pending input in memory, label it unsaved and offer Retry; do not promise refresh/crash recovery for unacknowledged changes. Use a navigation warning for unsaved input. Do not cache responses or free text in shared-device local storage. Reconnection refetches revision state; a stale second tab offers reload/reapply after displaying the conflict, never a silent last-write-wins overwrite. Language changes preserve IDs and answers.

After a submit timeout, fetch the attempt state before allowing another action. If submitted, show its result; if draft, retry the same operation safely. Authentication expiry must not claim data was saved. Use the existing sign-in recovery route and recover the last acknowledged draft. Log operation IDs and error classes, not reflection text or keys.

Server eligibility must preserve existing learner/course/session and content-completion rules. Completed legacy baseline satisfies the baseline prerequisite; do not require another. V2 post-test selection for such a learner uses an approved current release with an explicit non-comparable legacy baseline label. A v2 baseline normally pins its paired post form; if its curriculum has materially changed, flag the scope mismatch and disable comparison rather than silently substitute a form.

## 5. Answer protection and historical review

Protecting v2 keys alone does not close the current learner payload gap. Inventory every `course_test_questions` and `course_test_questions_current` reader. Replace the learner raw-bank query with a safe delivery RPC, preserve safe bank-existence checks for progress, and give facilitator analysis an authorized server projection. Then restrict raw table/view key access for learners. Test direct REST/RPC reads as a BHW, not only the rendered UI. Maintain assessor exam's privileged snapshot path and authorized content administration. Coordinate adapters and grants; do not break legacy chapters with a blanket revoke before replacing their reads.

Legacy review uses the original saved question IDs, including retired rows, and selected indices. Show the stored final score unchanged. The old RPC kept raw payloads and ignored some duplicate/retired responses while scoring against the then-current bank; it did **not** persist a complete served form and scoring membership. Therefore:

- Show recoverable question text, selected response and original key. Where valid, say “Your saved choice matches/does not match the stored key.” Do not assert that every raw response contributed to the old score.
- Label unavailable denominator/scoring membership, missing selections or missing original questions explicitly. Do not synthesize a complete historical form or mark all missing answers wrong.
- Distinguish “No recorded response available” from the new explicit unknown response. Show duplicate/conflicting records as incomplete provenance rather than choosing one silently.
- Add newly reviewed explanations as versioned supplemental feedback, labeled as added later. If current guidance corrects an old key, display the correction separately; do not silently rescore history.
- Keep Review my post-test visible for certified and historical learners even when some review detail is unavailable. A limitation message is better than hiding the result.

## 6. Reflections, assignment and visibility

This is identified learning feedback. At Share, display the current responsible reviewer or “No reviewer assigned yet; your shared note will be available when one is assigned.” Keep the learner's original language. No private case details are required.

| Actor | Draft text | Shared versions/replies | Assignment management |
|---|---|---|---|
| Learner | Own only | Own only | See responsible reviewer; cannot assign |
| Active assigned assessor/facilitator | Never | Assigned learner/course only, within current authorized organizational scope | Cannot self-claim |
| Other assessor, including same organization | Never | No reflection access from organization membership alone | None |
| Scoped administrator | No ordinary product access | No default raw-text access; assignment metadata only | Assign/reassign eligible reviewer |
| Anonymous/other learner | Never | Never | None |

For a facilitated learner, an existing unique designated session facilitator may seed an explicit assignment after checking active role and scope. If there are multiple candidates or none, leave unassigned; never guess. For solo learners, a scoped admin assigns the reviewer in a minimal learner/course assignment control. Sharing before assignment persists the shared version without distributing it broadly. Existing test/observation permissions remain their own policy; this matrix specifically narrows reflection access.

Recheck assignment and scope on every read/reply. Reassignment removes the former reviewer's access and lets the new reviewer see the shared history; the learner sees who is currently responsible. Replies already shared remain in the learner's history. Updated shared versions return to New/updated; replies and review statuses reference the version actually reviewed. Statuses are New, Reviewed, Follow-up needed and Responded. An assessor-recorded oral summary requires the learner's explicit confirmation before being stored as a shared version and is labeled with its author.

Use the in-app queue; no automatic email, external message, grading, sentiment score or automatic competency promotion. New storage participates in existing retention/account-deletion procedures; course progress reset must not silently orphan drafts or erase history. Inspect reset and purge functions, document their existing intended semantics, and test consistent cleanup in disposable fixtures. Do not invent a new retention period.

## 7. Routes and learner journey

Use these proposed routes to avoid overloading the current `[...path]` module/lesson parser:

| Location | Planned behavior |
|---|---|
| Existing chapter landing, `?chapterView=expectations` / `overview` / `recap` | Explicit validated panels in the chapter branch. No fake module IDs. Direct links resolve to the same state-aware chapter journey. |
| Existing major lesson landing | Show its one complete introduction above the smaller-lesson list after the baseline prerequisite is met. A first smaller-lesson deep link offers that full major introduction once; do not duplicate introductions per lesson. Store optional seen state separately from completion. |
| `/courses/[id]/assessment` | Canonical state-aware entry: opening/baseline, resume draft, chapter study, recap/post, or results. Adapt current `?assessment=1` links to this entry for enabled Chapter 1. |
| `/courses/[id]/assessment/review/[attemptId]` | Persistent submitted post-test review, independent of certification/pending status. |
| `/courses/[id]/practice/[groupKey]` | Optional checkpoint and later practice, with chapter-outline links. |
| `/courses/[id]/learning-notes` | Own drafts, sharing history and replies; lesson/group links set the selected context. |
| `/courses/[id]/learners/[learnerId]/learning-notes` | Authorized assigned-reviewer view and reply queue; scoped admin sees assignment controls, not raw text. |

At test start, section boundaries and question screens, show position and saved state; do not label sections with hints to the answers. Use a question navigator/review list in addition to one-question display. Before final submit, list unanswered items and require choice or explicit unknown. Prevent accidental auto-advance on choice selection.

Offer checkpoints after the mapped final lesson has actually been completed, including when that lesson is the last child of a major lesson. Use canonical lesson keys resolved to IDs rather than array positions. Missing checkpoint content must not block progress. A return visit can reopen practice from the outline; do not repeatedly force a completed/declined invitation. Reflection and practice skips affect neither eligibility nor score.

The recap sits before a new post-test start; resuming a draft should not force the recap again. Record recap version/exposure timestamp as context without a completion gate. Certified/content-complete returning learners retain existing study access and can revisit all introductions and recap. Preview roles never create learner drafts, attempts, notes, seen state or progress mutations.

Accessibility acceptance: keyboard-only complete journey; radio groups with visible labels; focus moved predictably to the question heading; question/section progress in heading/title; saved/error status announced without stealing focus; correctness conveyed in words; visible focus and comfortably sized controls; reflow at narrow phone widths and text zoom; tables retain headers and usable horizontal access where necessary. No required audio, timed reading or forced video. Existing read-aloud, if offered, must read only visible safe content. Verify manually in addition to automated accessibility checks.

## 8. Repository touchpoints

Inspect these existing files before editing. Proposed new files/routes above do not yet exist.

| Existing area | Required work |
|---|---|
| [Pre/post component](../../src/components/elearning/pre-post-test.tsx), [course detail](../../src/components/elearning/course-detail.tsx), [course page](../../src/app/courses/[id]/page.tsx) | Add guided BHW flow/results/review and safe data reads; preserve shared assessor question controls and legacy adapters. |
| [Training page](../../src/app/training/[programId]/[[...path]]/page.tsx), [manual progress](../../src/lib/progress/load-manual-progress.ts), [supervisor progress](../../src/lib/progress/load-supervisor-progress.ts) | Chapter panels, all nine intros, boundary navigation and safe bank availability. Preserve baseline gates, achieved-state exceptions and preview behavior. |
| [Facilitator loader](../../src/lib/elearning/load-facilitator-guide.ts), [guide model](../../src/lib/elearning/facilitator-guide.ts), [roster](../../src/components/elearning/facilitator-roster.tsx) | Separate understanding/practice/reflection/observed evidence, authorized review links and frozen-version item analysis. |
| [Cohort summary](../../src/lib/elearning/session-summary.ts), [dashboard RPC migration](../../supabase/migrations/20261011000000_training_dashboard_timestamps_scores.sql) | Keep final score visibility; separate legacy/v2 and form/curriculum groups, expose counts, suppress unsupported delta. Add a new migration rather than rewriting applied SQL. |
| [Flag types](../../src/lib/flags/types.ts), [DB flag scopes](../../supabase/migrations/20261005000100_rft_a1_flag_roles.sql) | Add `chapter1_assessment_v2`, default off, BHW/assessor role scope; update defaults, parsing, admin descriptions and parity tests. Server checks stable chapter/program keys too. |
| [Training loader](../../scripts/training-load.mjs), [bank synchronizer](../../scripts/lib/test-bank.mjs), [content conventions](../../content/training/README.md) | New isolated importer; preserve existing shared-bank behavior. Make dry-run and validation usable without production credentials. |
| [Legacy bank migration](../../supabase/migrations/20260928000000_versioned_test_bank.sql), [assessor exams](../../supabase/migrations/20260928093110_assessor_candidate_exams.sql), [progress reset](../../supabase/migrations/20260920000000_inc29_course_progress_reset.sql) | New additive schema/RPC/grant migration; compatibility, history, retention and reset/purge integration tests. |

Update all consumers found by searching for `course_test_attempts`, `course_test_questions_current`, `computeCohortSummary` and `score_percent`; the table is a starting inventory, not a substitute for call-site inspection. In particular, neither a cohort aggregate nor an export may continue showing an unsupported v2 gain just because the learner page stopped doing so.

## 9. Build order and evidence of completion

1. **Content contract:** establish validated release/form formats, all nine introductions and complete question drafts; preserve the old bank. Content-owner review can proceed while engineering uses clearly labeled fixtures.
2. **Database/API:** implement private snapshots, draft concurrency, atomic final compatibility writes, safe legacy readers, historical review, explicit reviewer assignments and practice/reflection state. Exercise access denial and recovery before wiring screens.
3. **Complete journey:** integrate opening, both tests, all nine introductions, twelve optional checkpoints, reflection sharing/replies, recap and permanent review. Add version-aware reporting and the disabled-by-default switch.
4. **Verification:** run meaningful focused tests, repository checks and disposable-environment end-to-end scenarios below. Review the resulting content and UI together, including workload and bilingual behavior.
5. **Release preparation:** produce dry-run import output, migration/rollback notes, curriculum reconciliation, content review record and usability findings. Deliver one coherent reviewable feature; activation depends on actual content and release approval, not merely passing tests.

Acceptance scenarios (write behavioral tests around these; do not just mirror component internals):

| ID | Given / when | Required result |
|---|---|---|
| A01 | New BHW opens Chapter 1 and follows a smaller-lesson deep link | Expectations → high-level overview → baseline before teaching; exactly nine full major intros across the chapter. |
| A02 | Learner answers, marks, changes language, goes back, leaves and resumes | Last acknowledged responses/position survive; choices keep meaning; no keys in unfinished payloads. |
| A03 | Two tabs save conflicting changes; connection drops during save/submit | Visible conflict/unsaved state; no silent lost update; retry creates exactly one final result. |
| A04 | Blank, explicit unknown, invalid/foreign option, duplicate payload or client-supplied score | Blank blocks submit; unknown counts zero distinctly; invalid requests rejected; server alone computes 30-item score. |
| A05 | A release changes after draft creation | Saved draft retains exact form/denominator; baseline pins its pair; withdrawn content is handled explicitly. |
| A06 | New post-test is submitted, then learner becomes certified and signs in again | Review remains reachable; all choices, correct answers, explanations and lesson links match the snapshot. |
| A07 | Historical certified learner has retired/duplicate/missing saved response data | Stored score unchanged; recoverable review shown with precise limits; no fabricated denominator or forced new baseline. |
| A08 | Learner skips every new checkpoint/reflection and revisits intros/recap | Existing eligibility, lesson completion and certification behavior unchanged. |
| A09 | Learner commits a checkpoint answer, views feedback and tries alternate/repeat | First answer retained; feedback timing correct; practice never changes diagnostic score; exposed repeats labeled. |
| A10 | Learner saves a reflection, shares it, edits privately, then shares a revision | Draft invisible to reviewer; original shared version and reply preserved; new shared revision marked updated. |
| A11 | Other learner, same-org unassigned assessor, old reviewer, admin or anonymous actor requests text directly | Denial per visibility matrix. New assigned reviewer sees shared history only; no-reviewer state works. |
| A12 | Assessor replies or records a learner-confirmed oral summary | Learner sees the attributed reply/summary; no private observation note leakage or competency score change. |
| A13 | Reports combine old/new versions or nonmatching baseline/post scope | Separate scores/groups/counts; no unsupported gain. First-attempt and practice evidence remain distinct. |
| A14 | Assessor starts/completes their existing qualification exam; other chapters use legacy tests | Original bank/thresholds, shared controls and supported legacy behavior work. |
| A15 | BHW calls raw REST/RPC endpoints and inspects client/page payloads | No unfinished test keys/rationales or others' drafts; authorized post review works; no browser service key. |
| A16 | Keyboard/screen-reader user or narrow-phone user completes the journey | Usable order, labels, focus, progress, status/error announcements, readable content and review navigation. |
| A17 | Preview role opens every new screen or new-start flag is disabled | Preview makes no learner writes; disabling new starts preserves existing drafts and read-only submitted review. |
| A18 | Full curriculum import is rerun or has a bad translation/key/count/hash | Valid identical import is a no-op; invalid release rejected atomically; existing attempts and assessor bank unchanged. |

Use existing Vitest/PGlite database fixtures for true RPC/scoring/access tests, plus a local Supabase or disposable staging stack for real PostgREST grants and complete browser journeys. PGlite alone does not prove API exposure is safe. Existing relevant suites include `scripts/tests/assessor-exams-database.test.mjs`, `scripts/tests/assessor-qualification-database.test.mjs`, `scripts/tests/reference-content.test.mjs`, `src/lib/elearning/session-summary.test.ts`, `src/lib/elearning/facilitator-guide.test.ts`, `src/components/elearning/assessor-exam.test.tsx` and `src/app/training/manual-navigation.test.tsx`. Extend the legacy bank replay scenarios where reader contracts change. Add new tests for the new behaviors rather than only rerunning old suites.

Run `npm run lint`, `npm run typecheck`, relevant `npm test -- <files>` suites and `npm run build`; then the repository's appropriate full required checks. Add Playwright coverage alongside `e2e/elearning.spec.ts` using disposable users/data, including manual keyboard/screen-reader checks and axe where supported. Do not run destructive fixture/reset scripts against production. This documentation task has not run application tests because it changes no application behavior.

## 10. Activation, rollback and remaining reviews

Before enabling starts, reconcile manifest lesson hashes with the curriculum actually published in the destination. Record content/policy/clinical and bilingual review, usable navigation/save/review results, expected time based on the pilot and the accepted workload. Do not ship placeholder questions or claim an approved content review because JSON validation passed.

Use `chapter1_assessment_v2` to control **new starts and feature entry**, not the right to retrieve existing submitted work. Existing v2 drafts must still resume or receive a clear temporary-unavailable message; never fall through to the legacy submit API for a v2 attempt. Keep safe delivery adapters and review handlers deployed when rolling back new starts. Do not drop new tables, reset certification or rewrite final attempts as a rollback step. Test disabling the switch with both a draft and a certified submitted result.

Pilot reporting captures form/language version, starts/submissions, section drop-off, explicit unknowns, save failures, time, review usage and checkpoint participation. Use minimal events and authorized aggregates, without raw reflection text or answer keys in analytics. Small samples support usability improvements; they do not justify reliability claims. A content/measurement reviewer must explicitly approve any later comparability decision before numeric change becomes a headline result.

Sol can proceed with implementation using these defaults without reopening routine design choices. The remaining release evidence is the completed reviewed question set, published-curriculum match, pilot findings and authorization to activate. No implementation or activation has occurred as part of this plan refinement.
