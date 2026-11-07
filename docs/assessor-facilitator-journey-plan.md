# Assessor and facilitator process — executable increment plan

Updated: 28 September 2026.
Status: planning PR #166; all increments below are **not started**.
This revision supersedes the earlier optional-full-module proposal.

## 1. Confirmed user requirements

**Course scope confirmed by the owner:** the **BHW Reference Manual** is the foundation and initial course. All chapter learning, exams, assessor orientation and qualification in this plan belong to that course. Its program identity is `bhw-reference-manual`; the existing program/chapter/delivery-course mappings must be preserved. The repository path `content/training/day1-basic-competencies/` is a legacy storage location for some Chapter I source material, not a separate Day 1 course to build or expose. Inventory the Reference Manual's current Chapter I and Chapter II delivery sources and explicitly mark unavailable chapters. Chapter I may serve as the first end-to-end fixture, but the foundation must support the Reference Manual's chapters.

1. The assessor candidate must complete the **full chapter** for which they want to qualify, including its learning content, and pass its required exams.
2. The candidate does **not** need a practical assessment by another assessor. Completion of the chapter and passed exams unlock the next step directly.
3. **After** that, the candidate completes the chapter's assessor orientation/course on how to assess BHW competence and how to score.
4. Qualification is per chapter. Qualification for Chapter I does not qualify someone for Chapter II.
5. Provide a guide, tour or navigator explaining how to facilitate.
6. Show all BHWs in the assessor's assigned area, with their learning progress. Selecting a BHW shows the assessment components they are eligible for and lets the qualified assessor conduct them.
7. Redesign both the assessment interface and the assessment process.
8. Deliver these as changes to existing BHW Connect features and content infrastructure.

The full chapter is mandatory. There is no abbreviated prerequisite or optional full-chapter branch. The candidate's exemption from practical assessment applies to their own qualification pathway; BHW learners still follow their practical competency assessment pathway.

## 2. Approved decisions and remaining proposed defaults

On 28 September 2026, the owner confirmed the three clarification answers: **1. 80%; 2. scoring exercise recommended; 3. progressive component readiness recommended.** Record these as the implementation requirements below. The orientation exercise's numeric pass threshold was not included in the resent question; it remains proposed, alongside D4–D5.

| ID | Decision | Rule and status | Applied in |
|---|---|---|---|
| D1 | Candidate chapter exams | **Approved:** complete the full chapter and achieve at least 80% on its post-test and each required quiz. The pretest is a diagnostic baseline, with no passing mark. Store the approved thresholds per qualification curriculum. Full chapter content is compulsory regardless of exam score. | AF-01 manifest, AF-03 exams |
| D2 | Assessor orientation | **Approved:** complete the orientation and pass an exercise scoring sample BHW cases. Use the recommended automatically scored exercise; no practical assessment of the candidate by another assessor. The exercise's numeric threshold remains **proposed at 80%**, to be settled in AF-01. Automatic issuance from verified records remains the proposed implementation, without an additional per-candidate approval step. | AF-04 content, AF-05 issuance |
| D3 | BHW practical component readiness | **Approved:** unlock each component after its related subchapter lessons and required tests. Do not require completion of the entire chapter to start a component. Full chapter requirements still apply to final chapter certification; a chapter-wide post-test must not accidentally block every subchapter component. | AF-01 component map, AF-07 readiness |
| D4 | BHW final practical pass rule | **Proposed:** every required indicator has valid summative evidence rated Kaya na. Kailangan pa ng practice, Hindi pa and Not observed require follow-up. Do not average away a missing or failed required indicator. Final decision also checks chapter learning and approved BHW test requirements. | Resolve in AF-01 before AF-08 production activation |
| D5 | Retakes, validity and existing assessors | **Proposed:** allow candidate exam/orientation retakes with feedback and retained history; configurable limits, initially no fixed cap. No automatic credential expiry initially; explicit suspension/revocation is supported. Existing assessor roles do not receive automatic chapter qualifications. | AF-03, AF-05, AF-10 rollout |

D1 changes the candidate qualification rule. It does not silently turn the existing BHW learning-gain post-test into a new BHW pass/fail gate. AF-01 must explicitly document the BHW test requirements used for component and final readiness.

## 3. Existing features to extend

Repository inspection includes the current main course route, versioned bank migration, facilitator guide, assessment console and progress features. Recheck the latest main and applicable working rules at the start of each increment.

| Existing area | Current behavior | Planned change |
|---|---|---|
| Reference Manual: `training_programs → training_program_chapters → courses → course_modules → course_lessons` | BHW learning; assessor/admin usually preview or view the guide. | Add an assessor candidate learning mode using the same full chapter lessons and renderers, with personal completion/resume records. |
| `src/app/training/[programId]/[[...path]]/page.tsx`, `manual-lesson.tsx` | Learner and facilitator views already share a hierarchy. | Explicit modes: My chapter learning, Facilitator guide, and BHW preview. Learning actions use the real account and candidate context. |
| `src/app/courses/[id]/page.tsx`, `course-detail.tsx`, `pre-post-test.tsx` | Manual-mapped assessor access redirects to the manual; BHW assessment view loads chapter tests. Some headings still say Chapter I. | Candidate exam entry with dynamic chapter labels, qualifying score, attempts, feedback and retry. Preserve the BHW pathway. |
| `course_test_questions_current`, `rpc_course_test_submit` | Versioned questions; the inspected RPC records a score, permits one submission per phase and has no qualifying post-test threshold. | Add a candidate exam contract with explicit pass rules and repeat attempts, reusing reviewed chapter content. Do not relax the legacy BHW contract as a shortcut. |
| `/admin/training-progress`, `src/lib/progress/load-supervisor-progress.ts`, `src/components/progress/` | Admin-only paginated manual/chapter/subchapter overview. | Reuse summarizers/cards in an assessor entry point with catchment reads, next actions and BHW drill-down. |
| `facilitator-guide.ts`, `facilitator-roster.tsx`, `competency_observations` | Guides, three rating levels, append-only observations, activity snapshots, and a roster capped at 500. | Reuse guide content and evidence history; add component readiness, assessment linkage and proper pagination. |
| `/training-sessions` | Assessor-created optional cohorts, attendance and delivery logs. | Link every roster BHW into the common assessment workspace; add chapter qualification checks when activating the new facilitator process. |
| `/assessments`, `assessments-console.tsx`, `rpc_assessment_claim`, `rpc_assessment_decide` | Course queue, claim and binary decision with free text. | Structured component assessment, evidence review, retakes and chapter-qualified authorization. |
| Current feature access / View as / hidden and archived content | Recent changes affect navigation and visibility. | Respect actual feature access and content visibility. Previewing a role never grants real learning completions, qualification or assessment authority. |

Keep the existing assessor role and account provisioning. A chapter credential is an additional capability. Assessors learn under their own accounts; no fake BHW account, role switching or enrollment into the BHW population is needed.

## 4. End-to-end states

### Candidate qualification

| State | What the user sees | Transition |
|---|---|---|
| Not started | Full chapter and its qualification requirements | Start chapter |
| Chapter learning | Required subchapters, lessons and tests with progress | All required chapter content complete |
| Exams outstanding | Missing/failed exams and retry action | Required qualifying exams pass |
| Orientation available | Chapter complete; start assessor orientation | Start orientation |
| Orientation in progress | How to assess and score, sample cases, feedback | Orientation completion rule satisfied |
| Qualified | Certified to assess this chapter, issue date and version | Explicit suspension/revocation if necessary |
| Suspended/revoked | Reason and next step; retained training history | Authorized restoration or requalification |

The orientation cannot be completed before chapter learning and qualifying exams pass. A candidate never enters the BHW practical-assessment queue, never waits for another assessor and never obtains a BHW practical competency certificate through this pathway.

A complete chapter means the approved full curriculum manifest is satisfied. Existing progress percentages exclude unpublished content, so **100% of currently visible lessons alone cannot prove full chapter completion**. Unpublished required subchapters/exams or hidden required material make the chapter qualification unavailable until resolved. Do not certify against a partial chapter or an empty question bank.

### BHW assessment

Learning → component ready → claimed/in progress → evidence recorded → component complete or needs practice → chapter review → certified or follow-up. Formative practice remains distinguishable from summative assessment. Lesson percentage, exam result, observed competence and certificate status remain separate facts.

## 5. Data and service contracts

Use shared content and UI with separate candidate records. This is the proposed implementation choice, avoiding a broad rewrite of BHW tables that are keyed by `bhw_user_id`.

- **Qualification curriculum:** versioned chapter manifest mapping the full set of required lessons/exams, pass rules, orientation and approved rubric version. Resolve curriculum identity through the program/chapter and mapped delivery course; do not use a chapter number alone or silently transfer qualifications across unrelated copies.
- **Candidate progress:** assessor-owned chapter enrollment, lesson completion/resume and exam attempts. Include learner, curriculum version, question IDs/version snapshot, answers, score, pass result and timestamps. Successful retries retain earlier attempts.
- **Orientation progress:** versioned lessons and scoring cases associated with a chapter rubric, plus candidate completions and final exercise attempts.
- **Chapter qualification:** actor, chapter/curriculum, evidence record IDs, issued status/date and revocation history. Only a server operation evaluating prerequisites can issue it, idempotently.
- **Assessment components:** stable IDs, chapter/subchapter mapping, prerequisites, required indicators and rubric versions. Use stable indicator IDs; old `objective_index` alone is not a safe identity after content edits.
- **Assessment evidence:** reuse append-only observations, adding a summative/formative distinction, component/attempt linkage and rubric snapshots. Final decisions reference the exact evidence accepted; a later practice observation cannot rewrite a signed decision.
- **Readiness:** server evaluation returns both `learner_ready` and `actor_can_assess`, with reason codes and next actions. A BHW may be ready while the viewing assessor lacks qualification.
- **Authorization:** active real actor + current catchment + chapter qualification + assignment + current component readiness. Apply at claim, evidence submission and final decision, including all older callable mutation paths.
- **Exam integrity:** score on the server and do not expose qualifying answer keys before submission. Existing assessor guide/key access must be reviewed; role-based access to a facilitator answer key must not also reveal a qualification exam key. Use separately protected qualifying items if the existing bank cannot support this.
- **Version changes:** preserve issued credentials and assessment snapshots. Mark a new curriculum as requiring requalification only through an explicit policy; do not retroactively alter scores or silently invalidate completions.

## 6. Phases and executable increments

Every increment has one PR based on the then-current main. Update this document's status/evidence in that increment's final implementation commit. Names below are proposed contracts; inspect existing schema before choosing exact new table/RPC names.

### Phase 1 — Define chapter requirements and enable candidate learning

#### AF-01 — Chapter curriculum, rubric and acceptance fixtures

**Depends on:** none.

**Change existing features/content**
- Inventory the BHW Reference Manual's current program, chapters, subchapters, full learning content and chapter exams using the actual delivery mappings and loaders. Include existing Chapter II sources; do not infer course identity or availability from the legacy Chapter I folder name. Build chapter-specific manifests under the Reference Manual identity.
- Create a versioned qualification manifest with the full required coverage, exam rules, orientation mapping and chapter identity.
- Map practical components to subchapters, approved indicators and evidence requirements. Document the BHW test prerequisites separately from candidate exam rules.
- Inventory latest definitions of learning, test, observation, session, claim and decision RPCs across all migrations, including account/catchment and View as behavior.
- Prepare Chapter I fixtures: new candidate, failed exam, qualified candidate, learner partway through a chapter, ready BHW, reassessment, sibling catchment, incomplete chapter.
- Produce bilingual screen mockups for qualification, area dashboard, BHW detail, rating and decision; review the scoring anchors and screen flow with the owner.

**Done when**
- Every required chapter section and exam maps to a stable identity; unavailable material is explicitly identified.
- D1 and D3, and the D2 completion method, are implemented in the manifest as approved. The orientation exercise threshold and D4 rubric rule are recorded before production activation.
- Fixtures demonstrate full versus partial chapter completion and formative versus summative evidence.
- The next increments have a checked manifest and rubric contract to implement.

#### AF-02 — Full chapter learning under an assessor account

**Depends on:** AF-01.

**Change existing features**
- Add candidate progress/resume records and narrowly authorized completion operations.
- Extend the current manual route and lesson renderer with an explicit My chapter learning mode, preserving read/slides/audio options.
- Show a chapter checklist and continue action using existing progress components.
- Keep facilitator guide and preview separate from learning completion. A preview does not save progress.
- Prevent candidate completion from calling the BHW course-finish helper that creates a practical assessment.

**Done when**
- A real assessor can start, resume and finish every required chapter lesson; records survive reload and language/mode switching.
- Another account cannot change their progress.
- No BHW assessment row or BHW competency certificate is created for the candidate; BHW population/progress reports exclude these records.
- An incomplete published chapter cannot be marked fully complete.

**Verify:** local migration replay, role/scope scenarios, targeted renderer tests, browser journey at 360px and desktop.

#### AF-03 — Qualifying chapter exams, scoring and retakes

**Depends on:** AF-02. D1 is approved: 80% for qualifying exams, diagnostic pretest.

**Change existing features**
- Reuse the chapter exam renderer with a candidate context and dynamic chapter headings.
- Add server-scored candidate attempts, pass/fail result, feedback and configured retakes.
- Snapshot the question set and rule used for each attempt; handle bank edits during an open attempt consistently.
- Take the diagnostic pretest before learning without a passing mark, then require at least 80% on the chapter post-test and every required quiz.
- Unlock orientation only from server-verified full chapter completion and passed exams. Reject skipped lessons, fabricated scores, duplicate question payloads and empty exams.

**Done when**
- A failed exam keeps orientation locked and offers a valid retry.
- A later passing attempt unlocks orientation without erasing the failed attempt.
- Full chapter completion plus exams proceeds directly to orientation, with no practical assessor sign-off.
- Existing BHW tests and scores retain their current meaning.

**Verify:** score/threshold boundary cases, missing/retired questions, repeated submissions, direct unauthorized API calls and a complete candidate exam journey.

### Phase 2 — Teach scoring and issue chapter qualification

#### AF-04 — Chapter assessor orientation/course

**Depends on:** AF-01 rubric and AF-03 unlock contract.

**Change existing features/content**
- Author orientation content using the existing bilingual content/lesson infrastructure and reviewable source files.
- Cover: component eligibility, evidence collection, exact rating anchors, insufficient evidence, case comparisons, feedback, reassessment and final decision.
- Include worked BHW cases at each rating level with reasons, then scoring exercises.
- Add orientation navigation and progress after the chapter-pass screen; enforce the prerequisite on reads/actions that record orientation completion.
- Approve cases and answers against the same rubric that will drive real assessments.

**Done when**
- A candidate understands why the sample BHW receives a particular rating and can practise applying the same rubric.
- All required orientation lessons are recorded; skipping through the URL cannot bypass the chapter prerequisite.
- The orientation and real assessment use the same versioned indicator definitions.

**Verify:** content coverage/Filipino-English parity, scoring-case review and browser walkthrough.

#### AF-05 — Chapter qualification and My qualifications

**Depends on:** AF-04 and approved D2/D5.

**Change existing features**
- Add server issuance from verified chapter and orientation evidence, and a chapter qualification card.
- Show statuses and next steps for each chapter; display issue date and applicable curriculum/rubric.
- Add authorized suspension/revocation and an audit trail.
- Prevent arbitrary direct qualification inserts, self-awarded credentials, duplicate issuance and cross-chapter reuse.
- Make qualification available to subsequent authorization checks; activation of stricter live assessment gates occurs in AF-10 after the complete path exists.

**Done when**
- Completion of every orientation lesson and a passed sample-case scoring exercise issues one qualification for the selected chapter under the configured issuance rule.
- A qualified Chapter I assessor remains unqualified for Chapter II.
- The candidate's full sequence works without any practical assessment by another assessor.
- Qualification cannot be created by changing a browser value or using View as.

**Verify:** complete candidate flow, idempotence, revoked/inactive actor cases and chapter isolation.

### Phase 3 — Guide facilitation and show the area dashboard

#### AF-06 — Facilitator home, navigator and catchment dashboard

**Depends on:** AF-05.

**Change existing features**
- Add one assessor home entry: Facilitate and assess, with My qualifications, BHWs in my area, Sessions and Assigned assessments.
- Reuse the admin progress summarizer/cards in an assessor route with appropriate RLS; do not grant access to the whole admin console.
- List all active BHWs in the actor's current catchment, including solo learners and BHWs never enrolled in a session.
- Add server pagination, name/area/chapter filters, progress and follow-up states; replace the assumption that the first 500 rows represent the whole area.
- Add a four-step tour: find BHW, read readiness, observe/rate, review/follow up. Include Skip, Back, Next and a permanent reopen/help entry.
- Connect existing session rosters and queues to a common BHW detail destination.

**Done when**
- The list is complete through pagination, scoped correctly and retains filters after returning from BHW detail.
- Progress separates lessons, exams, practical competence and certification.
- The guide works in Filipino/English with keyboard navigation and on a 360px screen.
- Unqualified candidates can see their own qualification path and permitted catchment progress; assessment actions explain the missing qualification.

**Verify:** regional/provincial/city catchments, sibling exclusion, zero-result states, solo learners and bounded query behavior.

### Phase 4 — Rebuild the assessment process and interface

#### AF-07 — BHW detail and component eligibility

**Depends on:** AF-01 component map and AF-06. D3 is approved: progressive readiness per component.

**Change existing features**
- Add a BHW detail view with chapter/subchapter progress, tests, observations, pending assessments and history.
- Implement one authoritative eligibility service returning learner readiness, actor authority, missing prerequisites and allowed next actions.
- Present each component as Waiting for learning, Ready, In progress, Needs practice, Completed or Unavailable.
- Configure each component to unlock after its related subchapter lessons and required tests. A chapter-wide post-test is a final chapter requirement, not a prerequisite for every subchapter component.
- Use existing pending assessments as chapter containers where appropriate. Their mere presence does not prove readiness.
- Link into the specific component from the dashboard, manual guide, session roster and assessment queue.

**Done when**
- Two BHWs in the same chapter can correctly have different eligible components.
- A ready BHW is distinguished from an assessor who lacks authority.
- Hidden/unavailable prerequisites are shown as blocked, not silently omitted.
- Displayed reasons match the backend decision for the same records.

**Verify:** partial learning, required tests, no content, stale page, out-of-scope BHW and competing assignment cases.

#### AF-08 — Evidence, ratings, review, final decision and retry

**Depends on:** AF-07 and approved D4.

**Change existing features**
- Replace the flat notes/pass/fail action with component selection → observe and rate → review → confirm.
- Reuse observation/activity records while adding stable component IDs, assessment attempt linkage and rubric snapshots.
- Show one indicator with its observable behavior and three rating anchors; capture evidence and constructive next practice.
- Save server drafts and resume them; keep Not observed distinct from a failed rating.
- Add atomic claim/reassignment and final decision operations. On every write recheck active account, catchment, chapter qualification, readiness and assignment.
- Require the approved evidence rule for final chapter certification. Retire or guard every legacy binary decision endpoint so it cannot bypass this rule.
- Issue the existing BHW certificate idempotently after a valid final pass. Preserve failed attempts and enable targeted reassessment.

**Done when**
- Missing evidence cannot produce a certificate; a below-standard component has clear feedback and a repeat path.
- A later observation never rewrites the evidence used in a previous signed decision.
- Concurrent claims have one winner; repeated final submission produces one certificate.
- Direct RPC calls cannot bypass the same checks shown in the interface.
- Assessors do not assess themselves.

**Verify:** local RLS/RPC scenarios, concurrency and duplicate-submit tests, draft recovery, retake flow and existing QR verification.

### Phase 5 — Integrate existing facilitation and release

#### AF-09 — Session, guide, learner feedback and navigation integration

**Depends on:** AF-08.

**Change existing features**
- Update existing session rosters, subchapter facilitator rosters and assessment queue to use the shared component/readiness workflow.
- Connect chapter qualification to learner-facing facilitation actions for that chapter under the selected rollout policy.
- Preserve optional sessions: solo BHWs remain eligible without enrollment.
- Show BHW-safe results, actionable feedback and retry guidance in the learner journey; keep private guide keys/internal assessor notes out of the learner payload.
- Integrate current feature access, hidden/archive behavior and View as. UI flags control presentation, while database rules independently control qualification/assessment writes.

**Done when**
- Every entry point leads to the same assessment record and rules.
- No old form or callable RPC provides an ungated route to a decision.
- A BHW receives the same outcome/next action whether learning solo or in a session.

**Verify:** full journeys from each entry point, learner visibility, feature access and role-preview isolation.

#### AF-10 — Local verification, migration and pilot cutover

**Depends on:** AF-01 through AF-09 and recorded decisions D1–D5.

**Release tasks**
- Replay migrations on the local Supabase stack and run required lint/typecheck, targeted tests and complete candidate/facilitator/BHW browser journeys.
- Reconcile existing assessor accounts, qualifications, pending/assigned assessments, observations and certificates using an idempotent dry-run report.
- Never fabricate historical exam passes or automatically qualify existing assessors from their role. Preserve historical BHW certificates and label legacy evidence honestly.
- Publish the full chapter manifest and orientation for each enabled chapter before enforcing qualification for its live assessment flow.
- Keep existing assignments and evidence; if an actor is unqualified or revoked, block further decisions and provide authorized reassignment with audit. Avoid silently deleting or resetting work.
- Apply each PR's reviewed migrations together at merge time, following the latest `CLAUDE.md` and deploy runbook. Develop/test against local Supabase, not the pilot.
- Switch the chapter to the new assessment policy only when the complete path is ready and pending-work reconciliation is reviewed.
- Confirm a pilot assessor can complete chapter/exams/orientation, qualify and assess an in-scope BHW through certificate verification.
- Rollback may disable new UI/mutations while preserving data; it must not restore an unguarded pass/fail endpoint.

**Done when**
- Candidate: full chapter → exams passed → orientation complete → chapter qualification.
- Facilitator: guide → all in-area BHWs → individual progress → eligible components.
- BHW: practical evidence → feedback/retry when needed → valid final certificate.
- Out-of-area, unqualified, inactive and self-assessing writes fail.
- Release evidence and any remaining limitations are recorded in the increment PR.

## 7. Execution checklist

| Phase | Increments | Status |
|---|---|---|
| Full chapter learning and exams | AF-01, AF-02, AF-03 | Not started |
| Assessor orientation and qualification | AF-04, AF-05 | Not started |
| Guided facilitation and area dashboard | AF-06 | Not started |
| Eligibility and assessment redesign | AF-07, AF-08 | Not started |
| Integration and release | AF-09, AF-10 | Not started |

For every increment: inspect current main → implement the named changes → verify its acceptance cases → include evidence and status update in the same PR → merge according to the repository workflow before starting the dependent increment. Additive schema/UI can ship before cutover, but chapter qualification claims and new live authority must wait for their complete, verified prerequisites.

This planning revision updates the implementation contract in PR #166. It does not mark any increment implemented.
