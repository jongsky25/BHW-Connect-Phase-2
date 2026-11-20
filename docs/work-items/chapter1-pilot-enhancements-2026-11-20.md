# Chapter 1 first — November pilot enhancement plan

Status: planning complete; C1-PE-0 baseline reconciled; C1-PE-1 reference reading implemented;
release verification and signed-in usability evidence tracked in phase handoffs.
Updated: 20 November 2026 (UTC).
Task prefix: C1-PE. Branch: `plan/chapter1-pilot-enhancements-2026-11-20`.
Planning base: `44ba7477057c1495256b729d5f5d4fd13beb2c01` (origin/main).

## Owner decisions and scope

- Apply **all enhancement work to Chapter 1 first**, including the BHW journey,
  assessor workflow, simulation, monitoring and familiarization. Complete and
  review Chapter 1 before extending the changes to Chapters 2 or 3.
- The **2022 BHW Reference Manual** is the content basis. The owner believes
  existing content is aligned. Reports of misalignment are concerns to investigate,
  not established defects or authority to rewrite the curriculum.
- Preserve scenario-based learning. Add a clearly labeled reference section per
  lesson containing the complete relevant manual passage, with source citations.
  This means the full relevant section, not the whole manual repeated per lesson.
- Simplify authored Filipino explanations and instructions. Preserve quoted
  source wording; place simpler explanations outside the quotation.
- Waray is deferred from this enhancement round. TESDA alignment is excluded
  from both the scope and the basis for this plan.
- Preserve self-paced learning, repeat access to completed lessons, existing
  learner progress, historical attempts, scores and certification records.
- This PR began as a durable plan; its continuation includes the C1-PE-1
  reference-reading increment. Actual delivery state is in the phase handoff.

These explicit owner decisions govern this enhancement over older planning
assumptions. In particular, the source-material README's historical prohibition
on verbatim learner content does not apply to the newly requested, clearly
attributed reference section. Continue scenario-based authoring elsewhere.
Older TESDA mapping remains historical context, not a work requirement here.

## Evidence and baseline

The Tacloban pilot feedback reports accessible, generally understandable learning,
less pressured self-paced study, and increasing navigation familiarity by November
10. It also reports unclear next actions, difficult Filipino terms, insufficient
answer explanations/review, connectivity difficulties, confusing assessor steps
and simulation fields, and a need for monitoring and guided assessor practice.
The November 11 practice observation reinforces the assessor training requirement.
These are qualitative observations, without measured frequency or technical cause.

Start from current implementation rather than treating older plans as current
product gaps. Existing remediation records already describe navigation, save/resume
and immutable assessment improvements. Recent main also includes assessor-home and
assessment-save changes. Reproduce each remaining gap before implementing it.

Relevant starting points:

- [Pilot remediation record](../feedback-remediation/README.md)
- [Existing assessment plan](../chapter-1-assessment-plan/README.md) and
  [feedback/reinforcement design](../chapter-1-assessment-plan/feedback-and-reinforcement.md)
- [2022 manual transcription](../source-material/day1-basic-competencies/bhw-reference-manual.md)
  and [source provenance / original PDF link](../source-material/day1-basic-competencies/README.md)
- [Chapter 1 lesson mapping](../chapter-1-assessment-plan/lesson-assessment-map.csv)
- [Assessment component](../../src/components/elearning/chapter1-assessment.tsx),
  [lesson flow](../../src/components/elearning/chapter1-lesson-flow.tsx), and
  [simulation runner](../../src/components/elearning/assessor-simulation-runner.tsx)

These are discovery pointers, not a claim that their historical specifications
are fully implemented or that the checked-out version is live.

## Phased delivery

Implement one cohesive increment per PR. Each phase records actual changed paths,
checks, commit/PR, release state and next action in its own handoff. The ordering
below expresses dependencies; it does not promise dates or staffing.

### C1-PE-0 — Establish the current Chapter 1 baseline

Continuation evidence: [C1-PE-0 baseline](c1-pe-0/README.md),
[42-lesson source map](c1-pe-0/lesson-source-map.csv) and
[publication receipt](c1-pe-0/publication-baseline.json). The read-only pilot
inventory confirms 42 lessons across nine modules and the active v8 assessment
forms. Eight raw-source differences are intentional approved overlays; the effective
loader matches all 42 published hashes. Focused local recovery tests and the
isolated browser assessment journey passed. Signed-in usability and full network
fault testing remain distinct outstanding evidence.

Deliverables:

1. Inventory every published Chapter 1 lesson and major section, BHW and assessor
   routes, simulation screens, assessment forms, review paths and dashboard views.
2. Map feedback to current behavior: already satisfied, reproducible gap, content
   visibility concern, or unresolved evidence. Do not reopen resolved historical
   reports or close November feedback solely because an earlier fix exists.
3. Record existing disclosure, retake, qualification and certification behavior.
   Determine whether BHW learning tests and assessor qualification tests differ.
4. Establish a lesson-to-manual map: lesson ID, exact source section, printed page
   and PDF page, current scenario, related questions, and any discrepancy.
5. Identify representative interrupted-connectivity journeys and baseline outcomes.

Exit: a verified inventory, finite gap list, source map, acceptance checks and
specific policy decisions needed for C1-PE-3. Do not block unrelated phases on
assessment-policy clarification. Check current repository and deployment evidence
separately; use authorized read-only access for pilot inspection.

### C1-PE-1 — Manual reference sections and simpler language

Implementation: [reference-reading increment and release record](c1-pe-1.md).
All 42 lessons map to 11 shared complete passages, with original table images
and reflowed text. The [language-support continuation](c1-pe-1-language/README.md)
records a 42-lesson terminology screening and separate plain-language explanations.
Representative signed-in usability remains outstanding.

Depends on C1-PE-0's source map.

- Retain each scenario lesson. Add a consistently named “Read the Reference
  Manual” section reachable from the lesson and during later review.
- Include the complete relevant passage, preserving headings, lists, tables,
  examples and necessary figures. Shared sections may be reused, but must be
  readable from every mapped lesson with enough context to stand alone.
- Cite the manual title, 2022 edition, section, printed page and PDF page where
  they differ. Verify transcription against the original PDF; the repository
  transcription notes missing images and must not be treated as a complete
  visual reproduction. Record source identity and reviewed excerpt version.
- Do not silently correct, simplify or translate text labeled verbatim. Keep
  scenario explanations and any clearly labeled editorial clarification separate.
- Review difficult authored Filipino terms and verify scenarios, questions and
  rationales against the mapped source. Record actual contradictions separately
  from requests for more direct/manual-style presentation.
- Keep references readable on mobile without forcing a large PDF download or
  making rereading the manual a new completion requirement.

Exit: every inventoried Chapter 1 lesson has a reviewed source mapping and complete
relevant reference content; source fidelity and mobile rendering are checked;
scenario learning and existing completion remain intact. If a lesson has no direct
manual passage, document the gap rather than inventing a quotation or citation.

### C1-PE-2 — BHW navigation, assessor steps and simulation

Depends on the baseline; coordinate reference entry points with C1-PE-1.

- After lesson completion, clearly show completion state, the next valid action,
  and the option to review. Handle the last lesson and unmet prerequisites without
  inventing a next destination or bypassing existing rules.
- Show assessors the current stage, outstanding tasks and next available action.
  Reuse the recently improved assessor home instead of adding a competing hub.
- Simplify simulation sentences and instructions; group fields by task and arrange
  them in execution order. Distinguish required inputs, saved work and submission.
- Preserve existing assessment meaning, evidence and scoring. Wording/layout
  improvements do not authorize changing rubrics or competency requirements.

Exit: representative BHWs and assessors can identify and complete the next step;
completed lessons remain reviewable; simulation inputs are understandable; mobile,
keyboard, incomplete-state and return/resume checks pass.

### C1-PE-3 — Assessment explanations, mistake review and retakes

Depends on C1-PE-0 policy discovery and C1-PE-1 reviewed source/rationale mapping.

Recommended policy, **not yet approved as a change to formal assessment rules**:

| Area | Proposed learning-assessment behavior |
| --- | --- |
| Pre-test | Show score and topics needing attention after submission; release detailed answers/rationales after the first post-test submission. |
| Post-test | After confirmed submission, show selected and correct answers, brief reviewed rationales, and lesson/manual references. |
| Mistake review | Persistent “Review my mistakes” access from results/history, including after completion; allow all-question review as well. |
| Retakes | Allow learning retakes after review; preserve first and later attempts separately and distinguish practice from initial performance. |

Before changing policy, confirm whether the relevant post-test determines formal
competency/certification or is a learning check. Inspect existing approved policy
first; ask the owner only for the unresolved decision. Do not apply BHW learning
rules automatically to assessor qualification exams. Preserve current rules until
resolved; the rest of the enhancement work can continue.

Implementation requirements:

- Extend existing review/history paths where available; do not build a duplicate
  assessment system. Review is not a retake and does not change completion.
- Resolve review against the submitted attempt's original question, choices and
  responses. Label unavailable historical details; never fabricate them or silently
  pair an old answer with today's question or overwrite a historical score.
- Author explanations with the 2022 manual reference. Distinguish an approved
  later explanation from content that was present when the learner took the test.
- Enforce disclosure timing and learner/assessor access on the server, including
  direct requests; unfinished attempts must not expose answer keys.

Exit: approved timing/retake rules are documented; review works immediately when
eligible and after reopening; historical, unauthorized and unsubmitted-attempt
cases behave correctly; results and certification remain preserved.

### C1-PE-4 — Chapter 1 training monitoring

Depends on baseline data definitions and C1-PE-3's agreed attempt interpretation.

- Extend the existing assessor view with Chapter 1 learner training status,
  completion progress, assessment results and topics needing follow-up.
- Show denominators/sample counts and distinguish not started, incomplete and
  submitted results. Separate first attempts from retries/practice; do not combine
  incompatible forms into an unsupported learning-gain claim.
- Map topic summaries to reviewed lesson/question mappings. Treat low scores as
  potential learning gaps for follow-up, not proof of incompetence.
- Restrict learner detail to authorized assessor relationships and keep aggregate
  queries bounded. Avoid adding redundant requests on navigation.

Exit: summary counts reconcile to underlying records, attempt distinctions are
visible, access checks pass, and an assessor can identify a learner/topic requiring
support without manually opening every assessment.

### C1-PE-5 — Connectivity resilience and assessor practice

Connectivity investigation starts in C1-PE-0; final verification follows the revised
flows. Practice materials follow the C1-PE-2/3/4 interface.

- Reproduce slow/interrupted connections during lesson/reference access, progress
  saves, assessment resume/submission and simulation saves. Identify the actual
  failures before choosing fixes; full offline operation is not an assumed scope.
- Improve confirmed gaps with clear saving/saved/retry states and safe recovery.
  Check response-loss/retry cases for duplicate submission or lost progress.
- Provide short guided assessor exercises covering navigation, simulation,
  assessment review and monitoring, with expected outcomes and practice data.
- Run development and automated tests against disposable local data, never pilot
  learner records. Live usability review follows the existing project workflow.

Exit: documented connection conditions and results, no unresolved confirmed data
loss in the tested flows, and assessors can complete representative guided tasks.
Record unsupported offline behavior honestly rather than promising offline access.

### C1-PE-6 — Complete Chapter 1 review and expansion gate

Depends on all preceding Chapter 1 phases and resolved release-affecting decisions.

- Verify the complete BHW journey: pre-test, scenario lesson, manual reference,
  lesson completion/next step, post-test, explanations, mistake review and permitted
  retry. Include returning/completed learners and unstable connectivity.
- Verify the assessor journey: locate assigned learner, identify outstanding work,
  complete simulation/assessment steps, inspect results and choose follow-up.
- Review all Chapter 1 lessons against the inventory, not only a demonstration
  lesson. Exercise shared changes with regression coverage for Chapters 2 and 3
  without enabling this enhancement there.
- Record implementation, automated checks, deployment, content publication and
  signed-in live verification as separate states. Use the live-release skill when
  releasing; do not create a separate review site or run E2E on the pilot.
- Obtain the owner's Chapter 1 review outcome before planning extension to other
  chapters. Carry lessons learned into a separate expansion increment.

Exit: all scope rows below have evidence, remaining limitations are explicit, and
Chapter 1 review is recorded. No automatic rollout to other chapters.

## Scope coverage and implementation safeguards

| Feedback / decision | Owning phase |
| --- | --- |
| BHW next steps and continued lesson access | C1-PE-2, C1-PE-6 |
| Simpler Filipino and complete relevant manual content | C1-PE-1 |
| Answer rationales and incorrect-answer review | C1-PE-3 |
| Assessor workflow and simulation organization | C1-PE-2 |
| Progress, scores and topic gaps | C1-PE-4 |
| Unstable connectivity | C1-PE-0, C1-PE-5 |
| Guided assessor practice | C1-PE-5 |
| Self-paced learning and existing progress | Every phase |
| Chapter 1 first, no Waray or TESDA alignment | Every phase |

Shared components must remain compatible with other chapters; use explicit
Chapter 1 scope where behavior differs. Preserve immutable history and published
content identities. Use existing loaders and release procedures for later content
publication. Capture rollback/recovery for each implementation increment; rollback
must not erase learning completed after release.

Run focused content, component, access and save/retry checks appropriate to each
increment. Run repository-required lint/type checks for code changes. Document
checks actually run, not planned checks as if they passed. Do not change feature
flags, publish content or migrate the pilot as part of this planning PR.

## Resume in a new session

Suggested request:

> Continue C1-PE from docs/work-items/chapter1-pilot-enhancements-2026-11-20.md.
> Start with C1-PE-0, verify current implementation, and apply enhancements to
> Chapter 1 only. Use the 2022 BHW Reference Manual, preserve scenarios, and add
> complete relevant manual passages. Waray and TESDA alignment are out of scope.

1. Read repository instructions and this plan. Fetch remote state and check the
   planning PR/branch; if unmerged, read this file from the pushed planning branch.
2. Check existing PRs and task handoffs before assigning work. This plan does not
   claim ownership of other active branches or require parallel agents.
3. Start the earliest incomplete phase; create its handoff with actual owned paths,
   baseline, dependencies, acceptance checks and status. Reconcile existing code
   before deciding that a feature still needs implementation.
4. Update the work register at task/release boundaries. Link evidence here or in
   the phase handoff; do not mark planned capabilities implemented or live.

## Original planning delivery record

- Changed: this plan, the session-handoff entry point and work-register pointer.
- Validation: documentation whitespace and relative-link checks; application
  tests are not applicable to this documentation-only change.
- At planning time: no runtime/database/content mutations. Implementation was
  pending; the phase handoffs above now track subsequent work.
- Delivery identity: use this branch's Git history and GitHub PR for the exact
  commit and review status; do not infer merge/deployment from this document.
- Next action: C1-PE-0 baseline and source mapping.
