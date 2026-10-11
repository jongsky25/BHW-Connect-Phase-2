# C1AF-01 — Chapter 1 assessor/facilitator contract

Implemented contract increment: 10 October 2026, baseline `a1a54d75`.
Parent: [incremental plan](chapter-1-assessor-facilitator-flow-plan.md).
Status: ready for implementation of draft state contracts and isolated preparation UI. Production rubric approval and award activation remain separate, explicit gates.

## 1. Decisions carried forward

The user has authorized starting the incremental plan, including chapter-specific certification, an overall three-chapter award, and a situational platform simulation. Use the plan's engineering defaults below; do not repeatedly ask for permission to implement reversible local work. Do not interpret that authorization as approval of contradictory scoring criteria, a new clinical standard, or production activation.

| ID | Decision | Implementation consequence |
| --- | --- | --- |
| D01 | One existing `assessor` account serves both responsibilities. | No new role, account migration or mandatory second assessor. Display the current mode. |
| D02 | Each chapter has a combined assessor/facilitator certification. | Separate scope/evidence/validity for Chapters 1, 2 and 3. A Chapter 1 award is sufficient for authorized Chapter 1 work. |
| D03 | The overall award recognizes three valid, compatible chapter awards. | No overall exam or hidden fourth assessment. Exactly three distinct chapter keys; no reduced denominator when Chapter 3 is unavailable. |
| D04 | Preparation ends with a coached platform simulation. | New Chapter 1 issuance checks study, exams, orientation and a versioned simulation receipt. Hints and retries do not lower the result. |
| D05 | An opening tour and the final simulation have different purposes. | Replayable early navigation tour; situational checkpoint exercise after scoring calibration. No BHW writes from either. |
| D06 | Candidates may study, review guides and practise with fictional data. | Official delivery, observations and assessment require current chapter authority in the revised flow. Private planning is not recorded delivery. |
| D07 | Supported practice and formal assessment are explicit modes. | Practice evidence never becomes a formal pass automatically. Announce a formal task before beginning it. |
| D08 | Evidence sufficiency and performance are different facts. | A missing/interrupted observation carries no performance grade. Rated attempts require factual evidence. |
| D09 | A formal component is a reviewed subchapter evidence unit. | One lesson can support part of it; do not make a lesson completion or one rating satisfy all component criteria. |
| D10 | Feedback includes a concrete next action. | Separate private notes from released learner feedback. Link retries rather than overwriting history. |
| D11 | Current authorization is not historical achievement. | Suspension, revocation, account status and scope affect permission. Preserve award/attempt history. |
| D12 | Versions change according to material requirements, not cosmetic edits. | Default to exact version compatibility unless an explicit reviewed equivalence exists. No arbitrary expiry or annual renewal is introduced. |
| D13 | Existing staff are not certified from their role or session history. | Reconcile real evidence. Preserve historical qualifications; unresolved conversion records stay in a visible transition state. |
| D14 | The platform's certificate is program-scoped. | Proposed title: “BHW Reference Manual — Assessor/Facilitator, Chapter 1”; overall title names Chapters 1–3. Real issuer identity/signatory must come from authorized program configuration. |
| D15 | Existing BHW prerequisites remain separate from staff prerequisites. | The staff 80% post-test rule is not imposed on BHWs. No mandatory new component quiz is inferred from a retrieval check. |
| D16 | Rollout state is checked at the server. | Default-off UI, new writes and new award issuance. A persisted cutover cannot be reversed by hiding UI to reopen a legacy bypass. |

These decisions define the target revised flow. They do not describe current live authorization, which is still based on the existing RPCs until the staged cutover.

## 2. Identity and evidence boundaries

All trusted records identify the actual authenticated actor, program instance, canonical program key, chapter key/ID and relevant requirements version. A preview persona is never the authenticated actor. Matching names or array positions is not identity.

| Record | Required identity and evidence | Never infer from |
| --- | --- | --- |
| Candidate study | Actor, chapter, lesson and published revision | BHW course progress or merely opening a lesson |
| Exam pass | Actor, chapter, curriculum/exam rule and server-scored attempt | Browser score or a BHW test |
| Scoring orientation | Actor, chapter, approved rubric/orientation version and passing attempt | Attendance or generic professional credentials |
| Simulation completion | Actor, program, chapter, scenario version and validated checkpoints | A browser `completed` boolean, tour views or a SAMPLE certificate |
| Chapter certification | Underlying trusted qualification evidence, award rule and issuer snapshots | Assessor role, existing sessions or a BHW certificate |
| Overall certification | Three specific distinct chapter awards, recognized program identity and compatibility rule | Three rows for one chapter or unrelated program instances |
| Practice observation | Actual learner/observer, criterion identity/version, evidence state, context and feedback | Activity participation or a test score |
| Formal component attempt | Assigned assessor, declared component scope, readiness, criterion snapshots and sufficient evidence | Latest practice rating alone |

New canonical IDs for lesson criteria are provisional until C1AF-03. The existing module indicator IDs remain legacy source identities. Do not join a lesson's `objective_index: 0` to module indicator 0 without the reviewed crosswalk; most lessons each have their own local objective 0.

## 3. Candidate preparation states

Resolve state from trusted records, not mutable browser progress. Compute availability, award validity and actor permission separately. Keep lists of every blocker even when showing one recommended next action.

| State | Trigger | Screen/action | Successful transition |
| --- | --- | --- | --- |
| `signed_out` | No authenticated actor | Sign in | Re-resolve all states |
| `account_inactive` | Actual account inactive | Explain account restriction; contact administrator | Only account restoration permits writes |
| `preview_read_only` | Admin View-as | Clearly labelled fictional/read-only preview | Leave preview to use real authorized actions |
| `unavailable` | Chapter publication, requirements or criteria unavailable | List exact missing prerequisite; preview available material if visible | Availability is reviewed/published, not bypassed |
| `briefing` | New rule's briefing not acknowledged | Welcome and tour | Versioned acknowledgement |
| `pretest` | No required diagnostic attempt | Diagnostic pretest; no pass mark | Server-recorded diagnostic submitted |
| `study` | Required current lessons incomplete | Grouped lesson list and resume | All 42 required Chapter 1 lesson revisions completed |
| `posttest` | Required staff post-test not passed | Server-scored test; 80% threshold | Retained passing attempt |
| `orientation_lessons` | Required orientation lessons incomplete | Six existing lessons with exact applicable anchors | All current orientation lessons complete |
| `scoring_exercise` | No qualifying calibration pass | Existing eight-case exercise | Existing 7/8 plus safety pass, subject to current review |
| `platform_simulation` | No accepted scenario completion receipt | Fictional facilitation/assessment task, hints and retries | All essential workflow checkpoints server-validated |
| `issuance_pending` | All accepted evidence present, no new-rule award | Explicit issue/recovery action or final-prerequisite mutation | One idempotent award |
| `certified` | Accepted active chapter award | Chapter workspace, certificate and replayable guidance | Remains usable while validity and authority hold |
| `update_required` | Award exists but material version transition requires update | Explain focused update path | Complete the reviewed update; preserve old award |
| `suspended` | Award explicitly suspended | Show award history and restriction | Authorized restoration with reason, not new exam submission |
| `revoked` | Award explicitly revoked | Show historical status and administrator contact | Explicit approved lifecycle process only |
| `legacy_transition_pending` | Historical evidence not yet reconciled into new rule | Existing achievement plus precise missing conversion step | Reviewed, idempotent conversion or new-rule completion |

A replay of completed guidance does not change `certified` to `study`. An active historical certificate does not excuse current account/catchment/assignment checks. Staff certification is not awarded while material criteria remain unapproved.

Missing publication can coexist with partial completed study. Show both facts; never turn 40 published lessons into a 40/40 fully completed Chapter 1.

## 4. Permission matrix for the activated revised Chapter 1 flow

“Read” below always retains publication, privacy and geographic access rules. Administrators' existing administrative permissions remain separate. This matrix does not add administrative clinical-assessment authority.

| Action | Candidate, active actual assessor | Certified actual assessor | Suspended/revoked/outdated chapter award | Admin View-as | BHW |
| --- | --- | --- | --- | --- | --- |
| Own study, diagnostic, calibration | Yes, chapter available | Review/allowed existing study behavior | Can prepare for permitted update; cannot self-restore | Preview only; no candidate progress writes | Existing learner path only |
| Fictional platform simulation | Yes | Replay | Replay as guidance; no restoration | Read-only storyboard | No assessor simulation |
| Inspect visible facilitator guide | Yes | Yes | Read guidance where still visible | Read-only | No private guide/keys |
| Private session draft/activity selection | Yes | Yes | Private planning only | Read-only | No facilitator plan |
| Read BHW roster/history | Existing scoped authorized reads only; no simulated identity substitution | Scoped reads | Existing scoped reads only; restriction clearly shown | Existing authorized admin preview reads | Own released information only |
| Publish/schedule official chapter delivery | No | Chapter valid, course visible, scope valid | No new official write | No | No |
| Mark attendance/log delivery/save official activity | No | Own eligible session; verify affected learners and current status | No new official write; administrator handles interrupted work | No | No |
| Record practice observation/release feedback | No | Correct active BHW in scope, reviewed criterion and chapter authority | No new official write | No | Read own released feedback |
| Request component assessment | No official candidate request | Own/supported eligible BHW within scope | No assessor request | No | Own request only if program contract enables it |
| Claim/arrange/start formal assessment | No | Learner ready, current chapter authority, atomic assignment and in scope | No | No | See own arrangement |
| Submit formal attempt/chapter decision | No | Own assignment, current authority, complete required evidence | No; cannot finish a form opened before suspension | No | See released outcome |
| Issue own staff certificate | Only when all new-rule prerequisites satisfied; authenticated explicit mutation | Idempotent recovery only | Cannot self-reactivate | No | No |
| Download/verify earned certificate | Own accepted award; public verifier exposes only allowed fields | Own award | Show historical document plus current status | Existing authorized preview, no issuance | Existing BHW award path |
| Change staff award status | No | No | No | No | No |

Every affected official write independently rechecks role/status, chapter validity, current scope, criterion/requirements version, ownership/assignment and persisted cutover. Starting an eligible session or opening a form does not preserve permission indefinitely. Stale cached UI state is not an authorization decision.

## 5. Practice, formal assessment and follow-up states

| State | Evidence/performance | Assessor next action | BHW result |
| --- | --- | --- | --- |
| `practice_planned` | None; fictional/group/individual task prepared | Explain goal and practice purpose | Knows what to practise |
| `practice_in_progress` | Directly witnessed actions being captured | Observe without premature judgment | Supported attempt |
| `not_observed` | No observed performance; rating null | Record reason and arrange observation | “An observation is still needed,” not failure |
| `insufficient_evidence` | Partial/interrupted evidence; rating null | Identify precisely what remains unseen | Clear missing-evidence next step |
| `practice_recorded` | Sufficient observed attempt; one of three anchor-based levels | Release strength, gap and practice step | Useful feedback; no formal pass |
| `follow_up_open` | Specific next action, owner and optional agreed date | Conduct support/observation; link new attempt | Sees next opportunity |
| `request_pending` | Formal prerequisite state stored/revalidated | Eligible assessor claims atomically | Assessment requested |
| `assigned` / `arranged` | One assessor, scope and communicated arrangement | Brief learner and start explicit formal task | Knows purpose, criteria and arrangement |
| `formal_in_progress` | Criterion evidence; recoverable draft | Complete/review actual evidence | No final outcome yet |
| `formal_incomplete` | Missing required evidence; no component pass | Arrange missing evidence or release/reassign | Assessment pending, not failed |
| `formal_needs_practice` | Observed gap against approved criteria | Explain gap, link further practice and new attempt | Knows what must improve |
| `component_satisfied` | Approved criteria met under sufficient evidence rule | Review remaining components/chapter prerequisites | Component achievement; not automatic chapter award |
| `chapter_review_pending` | Evidence across all required components | Check complete coverage, versions and prerequisites | Shows what remains |
| `chapter_certified` | Final valid decision and one BHW chapter award | Release outcome/verification | Own BHW certificate, distinct from staff certification |
| `cancelled` / `released` | Reason retained, no fabricated performance | Requeue/rearrange appropriately | Clear cancellation/next step |

`kaya_na`, `kailangan_practice` and `hindi_pa` remain performance ratings. Evidence sufficiency is a separate field. “Ready for formal assessment” is a computed conjunction of learner readiness and actor authority, not a fourth performance level.

## 6. Explicit remaining review gates and recommended resolutions

| Gate | Concrete proposal | Can proceed before resolution | Dependent activation blocked |
| --- | --- | --- | --- |
| R01: contradictory lesson/component anchors | Preserve precise current lesson guidance as draft evidence criteria; explicitly reconcile module anchors through C1AF-02/03. A role-play should not reward an unsafe workaround to satisfy an older “alternative cooperation” anchor. Do not claim equivalence automatically. | Audit, registry with unreviewed status, disabled UI and simulation storyboard | Affected formal criteria, 06 scored-case changes, 07 activation, 13/18/19 writes |
| R02: evidence sufficiency and reassessment | Require direct evidence for every approved criterion. Proposed reuse: retain unaffected accepted criteria only under the same applicable version and an explicitly permitted reuse rule; otherwise collect fresh evidence. No invented expiry period. | State models, drafts, missing-evidence handling | Formal final sufficiency/reuse and BHW chapter issuance |
| R03: existing orientation review | Retain 80% and current six lessons/eight cases/7 plus safety as existing baseline. Resolve the already-recorded orientation/rubric review; do not add a new threshold because the simulation exists. | Navigation, replay and fixture scoring | New live award activation |
| R04: issuer/signatory | Use explicit program title above, with issuer/signature supplied by the authorized program owner. No government seal or external-accreditation claim. | Certificate layout with SAMPLE issuer | Real signed/verified staff award output |
| R05: simulation checklist | Use the twelve scenes in plan §5.4 with mandatory essential checkpoints, deterministic feedback, hints and unlimited retry. The short early tour does not satisfy it. | Authored scenario, isolated runner, local test receipts | New-rule certificate issuance until scenario/checkpoints are accepted |
| R06: historical qualification conversion | Retain old IDs/status/evidence. Dry-run compare against new rule. Default: old award does not automatically become a new combined award; require the new simulation and any genuinely missing prerequisite. Do not force already-valid unchanged study/exam evidence to repeat. | Reconciliation report and transition UI | Mass conversion or closure of existing in-flight work without a concrete disposition |
| R07: versions and overall compatibility | Exact accepted versions within one recognized program instance by default; reviewed equivalence may permit old versions. No automatic cross-instance portability. | Three-chapter logic with synthetic fixtures | Cross-version/instance conversion and renewal shortcuts |

These are bounded review gates; they do not require permission for local draft code or immutable audit reports. Enable production writes only after the named concrete rules are accepted. Do not use “pending review” as a reason to stop all independent engineering work.

## 7. Example records and expected outcomes

All examples are fictional and describe the revised contract. They are not production inserts or evidence that a real person is certified.

| Example | Facts | Expected result |
| --- | --- | --- |
| X01 Alex, new candidate | Active actual assessor, Chapter 1 visible, no personal evidence | `briefing`; may study and simulate; no official BHW writes |
| X02 Alex, partial publication | 40/42 requirements available, 40 completed | `unavailable` plus 40/42 study; show two missing lessons; no post-test/award shortcut |
| X03 Alex, orientation passed | Study/post-test/calibration pass, simulation incomplete | `platform_simulation`; no new combined award |
| X04 Alex, simulated workflow complete | All accepted current prerequisites and checkpoint receipt, no award | `issuance_pending`; final mutation/explicit recovery issues exactly one award |
| X05 Alex, certified Chapter 1 only | Active award and account; Chapters 2/3 incomplete | Chapter 1 work in scope allowed; overall 1/3; no authority for other chapters |
| X06 Maria, supported practice | Prompted clarification witnessed and recorded | `practice_recorded`, needs practice, released specific feedback; no formal pass |
| X07 Maria, interrupted observation | Resident dialogue interrupted before summary confirmation | `insufficient_evidence`, null rating, new observation action |
| X08 Maria, component readiness | Related lessons done, required approved tests fulfilled, criterion available | Learner ready independent of Alex's permission; no automatic assessment from reading screen |
| X09 Alex suspended mid-attempt | Form opened while certified, award suspended before submit | Reject write, preserve appropriate recoverable work, explain restriction; no certificate |
| X10 Alex outside Maria's catchment | Award active, Maria in sibling municipality | Current action denied; historical award unchanged |
| X11 Admin previews Alex | Effective role assessor, actual role admin, preview true | Read-only preview; no study/receipt/observation/award mutation as Alex |
| X12 Alex, duplicate chapter rows | Three Chapter 1 award rows, no Chapter 2/3 | Overall incomplete; duplicate rows never count as three chapters |
| X13 Alex, overall eligible | Three accepted distinct valid awards within compatible program | One idempotent overall award referencing those exact records |
| X14 Alex, Chapter 2 later revoked | Existing overall award, Chapter 1 remains valid | Overall current validity blocked; Chapter 1 authority remains independent |
| X15 Maria, one good lesson attempt | Correct 1.6.2 task only; other component/chapter criteria missing | Retain demonstrated evidence; component/chapter cannot be certified prematurely |
| X16 Maria, final review | All required accepted component evidence and BHW chapter prerequisites | One BHW Chapter 1 award; staff award ledger unchanged |
| X17 Alex, historical qualification | Earlier active qualification, no new-rule simulation, unchanged accepted study evidence | Preserve history; transition requires simulation/missing evidence, not blanket recertification or automatic conversion |
| X18 Unknown Chapter 3 eligibility | Learner Chapter 3 content exists, staff curriculum/orientation absent | Staff chapter unavailable; overall remains 1/3 or 2/3, never complete |
| X19 Forged receipt | Browser supplies `completed=true` without accepted checkpoints | Reject; fictional completed states cannot grant real BHW authority |
| X20 Two assessors claim | Both authorized; simultaneous request for Maria's component | One atomic owner; loser sees actionable assignment conflict |

## 8. Current implementation gaps requiring later increments

Read against the current source, not older milestone descriptions:

- AF-05's `issue_after_orientation_pass()` immediately calls the chapter qualification issuer. C1AF-07 must introduce the new-rule simulation prerequisite and final-prerequisite issuance while preserving old evidence.
- The existing qualifier matches the current chapter's curriculum/orientation version, but has no simulation/overall award contract. Do not re-label an unchanged old qualification as the new certificate.
- `rpc_assessment_claim` checks role/activity/pending/catchment but not chapter certification, and its shown implementation does not lock the row for competing claims. The new queue must be atomic.
- `rpc_assessment_decide` checks role/assigned ownership but not the new per-chapter certification or complete component criteria. Gate both old and new paths at the persisted Chapter 1 cutover.
- The roster form chooses module criteria by `objective_index`; lesson rubrics are separate. New criteria cannot be substituted by numeric coincidence.
- The roster requires a performance grade, makes evidence optional and places rating controls first. Practice purpose, explicit evidence gaps and learner-facing feedback need additive contracts.
- The current qualifications page hard-codes Chapters 1 and 2; future chapter availability and overall progress need a shared catalog.
- Existing rollout flags cover broader e-learning/session features. Revised Chapter 1 writes/awards need separate default-off control and persisted cutover semantics.

Sources: `src/lib/assessor/readiness.ts`, `src/lib/assessor/curriculum.ts`, `src/lib/auth/viewer.ts`, `src/components/elearning/facilitator-roster.tsx`, the assessor study/qualification routes, `20260929054250_assessor_chapter_qualification.sql`, `20261002000100_assessor_catchment_bhw_barangay.sql`, and `20260802000000_inc16_notifications.sql`.

## 9. Verification and next increment

C1AF-01 is a contract/documentation increment. Verify the state/action/result/next-action coverage using X01–X20, compare the identified gaps with the exact repository implementations, and keep all unaccepted policies named. There is no runtime migration, page, content revision or credential issuance in this increment.

**C1AF-02 handoff:** build a read-only deterministic audit of all 42 lesson objectives, local criteria, 36 legacy module indicators, activity mappings and orientation cases. Produce a versioned draft crosswalk and exact source fingerprints. Start with 1.6.2 and the refusal conflict; classify combined and ambiguous criteria separately. Check references and duplicate identities, and never infer a mapping from `objective_index` or approve semantic equivalence automatically. Keep authored content and pinned hashes unchanged. Its output supplies the unreviewed registry input for C1AF-03.
