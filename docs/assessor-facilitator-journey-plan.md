# Assessor and facilitator journey — implementation plan

Status: proposal for review, 28 September 2026. This PR plans the work; it does not change roles, live assessment rules, or pilot data.

## Goal

An assessor becomes **qualified for a particular chapter** only after completing the BHW learning path for that chapter and its assessor training. The facilitator then has one guided place to find BHWs in their catchment, understand each learner's progress and eligible assessment components, observe competence against chapter rubrics, and reach an evidence-backed decision. A person can hold the `assessor` account role without being qualified for every chapter.

This applies first to the published BHW Reference Manual chapters and extends chapter by chapter. Qualification to assess Chapter I does not imply qualification for Chapter II. "Certified assessor" here is an internal, chapter-scoped qualification; it is distinct from the BHW's existing QR-verifiable course certificate. Do not present it as a TESDA/DOH credential unless the issuing authority and wording are separately approved.

## Existing system and the gaps this plan addresses

- `training_programs → training_program_chapters → courses → course_modules → course_lessons` is the learner hierarchy. Chapter progress is derived from required published lessons; the pretest, post-test and certificate are separate steps (`docs/bhw-progress-plan.md`).
- The `assessor` role already runs `/training-sessions` and `/assessments`. Sessions are an optional cohort wrapper; solo BHW learning remains valid. The facilitator guide is already available on manual chapter/subchapter/lesson pages.
- The subchapter guide already lists BHWs in scope and records append-only `competency_observations`, including a three-level rating and optional activity evidence (`docs/facilitator-guide.md`). Its first-500 roster and the separate session page are poor starting points for a catchment-wide workflow.
- `/admin/training-progress` has a paged, searchable manual/chapter/subchapter progress summary, but its route is admin-only. The facilitator's session roster covers enrolled BHWs rather than all BHWs in the catchment.
- Completing a course currently creates a pending `assessments` row. `rpc_assessment_claim` and `rpc_assessment_decide` check the assessor role and assignment, but no chapter qualification. The final decision is a boolean plus free-text note; recorded observations do not yet determine or substantiate it. `src/components/elearning/assessments-console.tsx` exposes that as a flat queue.
- The assessor catchment is an org subtree, with placement at regional, provincial or city/municipal level (`20261002000100_assessor_catchment_bhw_barangay.sql`). Scope, account role and chapter qualification are three different checks. Existing training plans lock in reuse of the `assessor` role and no BHW self-enrollment.

## Proposed journey

| Stage | Assessor/facilitator sees or does | System rule |
|---|---|---|
| 1. Start | An "Become an assessor" page lists chapters, qualification status and next action. | Account is provisioned with `assessor` role as today; this alone grants no new certification authority. |
| 2. Learn the BHW course | Complete the chapter's required learning path and all applicable tests as a learner. | Use a distinct assessor-as-learner progress/attempt context so existing BHW-only RPCs, progress, certificates and BHW population counts are not silently reused or inflated. A BHW-facing assessment by another assessor is **not** required for this prerequisite. |
| 3. Optional full module | Opt into the expanded BHW module experience, including every applicable pretest, module quiz and post-test, practice activities and lesson content. | It remains optional and self-directed; no other assessor grades the candidate as a BHW. Clarify the boundary between required chapter learning and expanded practice before authoring. Do not turn optional completion into a hidden certification gate. |
| 4. Assessor training | Work through chapter-specific "how to assess" lessons: competency evidence, when an assessment component is ready, direct observation, three-level rating, feedback, retry, records, bias and difficult cases. Practice on sample BHW cases and calibrate ratings against approved examples. | Training and calibration/test completion are recorded per chapter and version. The pass rule, retry policy, issuing authority and validity period are explicit configuration/content decisions, not assumed from the BHW quiz threshold. |
| 5. Qualification | See "Certified to assess Chapter N" with date, scope and training version; other chapters show what is still owed. | Activate chapter qualification only when both required prerequisites pass. Retain an audit record of who/what conferred it; support suspension/expiry if policy later requires it. |
| 6. Guided facilitation | Open a short first-use tour, a persistent "How to facilitate" guide and a contextual help link at each step. | Guidance is available again after dismissal, in Filipino and English, on mobile and with keyboard/screen-reader support. |
| 7. Find a BHW | Dashboard lists active BHWs in the assessor's catchment, with search, area filters, chapter progress, readiness and follow-up needs. | Server-side pagination and bounded queries; never treat session enrollment as the only source of eligible BHWs. No cross-catchment reads. |
| 8. Assess | Open a BHW workspace, inspect chapter and subchapter progress, then select an eligible assessment component. Record evidence, rating and feedback, or schedule/retry the component. | Display the reason a component is ready or blocked. Enforce the same state and qualification checks in write RPCs; a disabled button alone is insufficient. |
| 9. Decide and follow up | Review a summary of required evidence, missing indicators and previous attempts; confirm a decision and show the next BHW action. | Certificate issuance only after the approved chapter-level pass rule is satisfied; failed/needs-practice outcomes retain feedback and a repeat path. |

### Eligibility language in the BHW workspace

The page should make a distinction between **learning**, **practice observation**, and **final assessment**:

- Pretest: taken by the BHW before learning under the existing course rules; visible as a status, never administered or answered by the assessor.
- Lessons and post-test: show completed/remaining counts and attempts. Use the existing chapter rules; do not invent a post-test pass mark where the current test measures learning gain.
- Practice observation: can be recorded during facilitation with date, observer, activity and indicator. It is evidence, not an automatic pass or certificate.
- Summative component: show "Ready to assess" only after its approved prerequisites are met. For each indicator, show required evidence, latest rating, history and "Needs practice" / "Not yet" next steps.
- Final chapter decision: show the consolidated checklist and only enable submission after all required components have valid evidence under the approved rating rule. On a retry, preserve the earlier evidence and decision, and make the reassessment target clear.
- If a chapter is unpublished or its assessment rubric/training is not approved, label it "Not yet available" rather than 0% or ready.

### Assessment interface redesign

Replace the flat pass/fail list with a mobile-first flow: **catchment dashboard → BHW detail → chapter → eligible component → observe/rate → review and confirm**. In the BHW detail, use the existing progress bars and status chips; add a compact "Next action" panel and component cards with explicit eligibility reasons. In the rating step, show one observable behavior at a time, the authored `Kaya na / Kailangan pa ng practice / Hindi pa` anchors, linked activity and an evidence note. Require an intentional review/confirmation before a final decision. Show a clear saved state, validation and recovery from a failed submission. Validate the flow with real assessor/BHW scenarios at 360px and desktop, Filipino and English, light and dark themes. Keep the queue as an entry point to the same BHW workspace, so an assessment cannot take a different decision path.

## Data and authorization design

1. Add chapter qualification and training-attempt records keyed by assessor user, chapter identity and published training version. Store prerequisite completions, outcome, issue/expiry/revocation metadata and audit events. Preserve immutable historical attempts when training or a rubric changes. Decide whether an existing qualification stays valid after a content revision through an explicit policy; never silently revoke or grandfather it.
2. Give assessors a supported learner path through chapter lessons/tests without changing their account role or creating a fake BHW. Either extend the existing RPCs with a strictly scoped learner context or add parallel assessor-training progress. Keep BHW `course_progress`, BHW certificates, BHW dashboards and population denominators semantically clean. Reuse authored lessons and questions where feasible.
3. Author assessor training as chapter-versioned content with case exercises, answer/rating rationales and calibration assessment. Keep the source and review status alongside the chapter rubric; require a subject-matter reviewer before publication.
4. Define an eligibility/read model for a BHW + chapter: published content, chapter learning/test states, component prerequisites, latest observations, outstanding indicators, assessment status and assessor qualification. Compute it once for both the dashboard/detail presentation and the write path's authoritative checks.
5. Extend observation evidence to distinguish formative practice from summative assessment, record the rubric/activity version used, and attach the rating and evidence to the assessment/component. The newest observation alone must not silently overwrite a past certification decision.
6. Replace or extend `rpc_assessment_claim` and `rpc_assessment_decide` transactionally. Recheck active account, catchment, chapter qualification, assignment, current eligibility and required evidence at the moment of claim/decision. Reject direct RPC calls that bypass the UI; prohibit self-assessment. Preserve the existing BHW QR certificate flow only for a valid BHW decision. Assessors' chapter credentials use separate records.
7. Extend assessor-scoped read policies/queries for the paginated dashboard and BHW detail, using the catchment rules already established. Bound list reads and avoid per-row security-definer checks and extra middleware queries, consistent with `CLAUDE.md`.

## Increment sequence and review gates

| Increment | Deliverable | Acceptance evidence |
|---|---|---|
| A. Rules and UX | Approved chapter prerequisite map, rating/decision rubric, bilingual screen flow and mobile mockups; map current vs proposed assessment states. | Walk through a new assessor, a partially qualified assessor, a solo BHW, a session BHW, a failed/retake case and an out-of-area case. Explicitly approve what "full module" includes and the competency pass rule. |
| B. Qualification foundation | Migrations, chapter training content/attempts, assessor-as-learner path and issuance/audit RPCs. | An assessor cannot qualify on role alone, skip either prerequisite, self-issue a qualification, or gain a BHW certificate merely by taking the prerequisite. Chapter I qualification does not open Chapter II. |
| C. Guide and dashboard | "Become an assessor" journey and persistent tour/help; paginated catchment dashboard and BHW detail using the existing manual progress summarizer. | In-scope BHWs appear whether solo or enrolled; sibling catchments are excluded; states and next actions match actual records. Test Filipino/English and accessible mobile UI. |
| D. Structured assessment | Component eligibility, evidence capture, rubric-based rating/review, retry and the final decision guard in the RPC. Retire the old direct binary decision path for chapter-based assessments. | Forced RPC calls fail without qualification, readiness or evidence. A pass issues exactly one BHW certificate; failures preserve evidence, feedback and retry history. Concurrent claims/decisions cannot duplicate certificates. |
| E. Pilot release | End-to-end assessor and BHW walkthrough, migration replay on the local Supabase stack, content review and controlled pilot rollout. | Confirm rendered screens with real fixtures; verify cross-catchment RLS, course/session/solo flows, chapter version changes, audit and certificate verification. Apply migrations to the pilot together only at merge time, per `CLAUDE.md`. |

## Decisions to settle in Increment A

1. Does "full module" mean the expanded BHW learning/practice track beyond the mandatory chapter lessons, or the whole chapter course including every assessment? Proposed interpretation above: required core chapter course and tests; optional expanded practice and tests, with no external assessment.
2. Which assessor-training calibration score, number of attempts, reviewer/issuer and validity period confer the chapter qualification? Proposed default is a versioned training test plus administrator approval of the training content, with no self-awarded credential or unapproved numeric threshold.
3. Which indicators/components are mandatory for each chapter, and how do three-level ratings aggregate into a pass? The authored module indicators are a starting point, but the current notes vary in specificity; approve a chapter rubric before allowing a final certificate.
4. Should previously provisioned assessors receive a time-limited transition status? The safe default is no automatic qualification; existing accounts retain access to training, while new claim/decision authority follows the chapter gate at rollout.
5. What happens to a claimed assessment when an assessor's qualification expires or is revoked? Proposed rule: it returns to an eligible qualified assessor, with history preserved.

## Out of scope for this planning PR

No production migration, feature flag change, qualification grant, assessor training publication, or replacement of the current assessment UI is included. Those belong to the reviewed increments above.
