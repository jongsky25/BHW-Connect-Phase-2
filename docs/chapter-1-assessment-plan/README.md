# Chapter 1 assessment redesign plan

Refined plan, 11 October 2026. The agreed purpose is to show understanding and learning gaps; practical performance is assessed separately. The test structure and item counts below are build defaults to evaluate in a pilot, not new passing or certification rules. Start implementation with the [Sol handoff](SOL-HANDOFF.md), which resolves technical choices and defines acceptance checks. The [research and gap review](research-and-gap-review.md) documents online sources, repository findings and the limits of the evidence.

The revised chapter teaches decisions, explanations, evidence handling and practical actions. The current pre/post bank samples some of these, but gives disproportionate attention to role recognition and sometimes misses the revised lesson's central distinction. A guided interface should be accompanied by an outcome-based rewrite.

The expanded proposal also includes persistent post-test answer review, free-text learning reflections and lesson feedback shared with an authorized assessor, and brief reinforcement checkpoints between lesson groups. Passing, completion or certification must never remove access to the learner's submitted post-test review. These additions support the agreed diagnostic purpose; they do not turn reflections or practice scores into certification evidence.

Add expectation setting and a high-level Chapter 1 overview before the pre-test, nine major lesson introductions before 1.1–1.9, and **What we have learned in Chapter 1** before the post-test. The nine introductions each cover one whole major lesson; the existing 42 short lessons and 12 checkpoint groups remain distinct. The draft copy and placement rules are in [Orientation and recap](orientation-and-recap.md).

## Planning package

- [Sol implementation handoff](SOL-HANDOFF.md): fixed scope, complete content inventory, isolated learner forms, data/API contracts, permissions, routes, implementation order, 18 acceptance scenarios and rollout/rollback requirements.
- [Research and gap review](research-and-gap-review.md): practices from Moodle, Canvas and Open edX; learning/accessibility guidance; and concrete gaps found in this application.
- [Lesson assessment map](lesson-assessment-map.csv): all 42 lessons, exact current objectives and observation indicators, proposed test coverage, practical evidence, checkpoint groups and bilingual reflection prompts.
- [Current question audit](current-question-audit.csv): all 38 questions, original bilingual prompts and keyed English answers, disposition, rationale and proposed action.
- [Sample paired questions](sample-paired-questions.md): four bilingual pre/post pairs with reviewer keys, explanations and limits on what can be inferred.
- [Feedback and reinforcement design](feedback-and-reinforcement.md): post-test review requirements, reflection prompts and assessor workflow, 12 checkpoint groups, example questions, workload analysis and acceptance criteria.
- [Orientation and recap](orientation-and-recap.md): expectation setting, chapter objectives, nine complete bilingual major lesson introductions, and a bilingual chapter recap before the post-test.

The audit recommends **9 keep, 20 revise, 9 replace**. Keep means retain the core item as a candidate, with a fresh counterpart and editorial checks; it does not guarantee inclusion in the shorter form. Revise retains the useful construct but changes the task, wording or alternatives. Replace removes the present item from the proposed scored form, sometimes moving its narrow recall task into lesson practice. These are editorial judgments, not measured item difficulty or discrimination.

## Evidence and version boundary

Source snapshot: repository commit `0e925326b1f9b2ab138f2a3d5b3267fff0a04621`. Sources are the Chapter 1 [bank](../../content/training/day1-basic-competencies/test-questions.json), lesson manifests, English Read content and private competency rubrics under [modules](../../content/training/day1-basic-competencies/modules), and the [test component](../../src/components/elearning/pre-post-test.tsx). The CSV records preserve source paths, stable lesson keys and question content hashes. Q01–Q38 are one-based audit labels for this snapshot, not production question IDs.

This map concerns the current repository curriculum, including revised content whose publication status may differ. It does not establish which revisions are live. Before activating a new assessment, reconcile its scope with the approved, published lessons learners actually receive. No independent legal, clinical or psychometric validation is claimed by this planning package.

PR preparation note: this handoff branch starts from the later main commit `5bb7c096`, which publishes lesson 1.9.3 in PR #282. The audit snapshot above is preserved. Check the updated lesson examples/feedback and any later releases during implementation; see the handoff's new-chat starting instructions.

## What the results will mean

| Evidence | Intended interpretation | Limit |
|---|---|---|
| Pre-test | Starting understanding and misconceptions before Chapter 1 study | No pass requirement; a low score is useful diagnostic information |
| Lesson checks | Retrieval practice, feedback and correction | Not independent proof of performance or a second summative score |
| Group checkpoints | Revisit and connect ideas from two to five lessons | Immediate feedback and retries make these practice, not an independent test of mastery |
| Learner reflections and feedback | What the learner says was learned, how they would apply it, and what remains unclear | Self-report for assessor discussion; writing fluency and positive feedback are not competence |
| Post-test | Application of sampled chapter concepts to fresh situations | Does not establish mastery of every lesson or practical competence |
| Observed task | What the learner actually says, writes or does against the existing rubric | Record the task and degree of prompting; lack of observation is not failure |

Keep understanding results and practical observations separate. A strong overall score must not conceal a missed safety or privacy concept; flag it for review and practice, without creating an automatic certification failure. The pre-test can remain a completion prerequisite for study, but never a passing prerequisite. The post-test stays after the chapter. Do not introduce nine pre-tests taken after parts of the chapter have already been taught: that would change the baseline.

The opening overview previews the destination and learning process without supplying definitions, worked examples or test answers. Teaching starts after the baseline. The chapter recap is deliberately before the post-test as requested: interpret the post-test as understanding after study and review, not as unaided long-term retention. Record recap exposure as learning context rather than awarding points for opening it.

## Complete chapter journey

**Expectation setting → Chapter 1 overview and objectives → Pre-test → Major lesson introduction → Short lessons and practice → Group checkpoints and reflection invitations → Remaining major lessons → What we have learned in Chapter 1 → Post-test → Answer review and next steps.**

There is one complete introduction for each of the nine major lessons, shown once at its start. No incremental introductions are added for smaller lessons or checkpoint groups. Checkpoint placement follows the existing 12-group map: some main areas contain two checkpoints. At the recap, learners can revisit a section or continue to the post-test; a saved draft resumes its existing form rather than starting again. After submission, they can always return to answer review.

## Coverage and proposed length

Pilot **30 scored questions per form**, delivered in three sections of ten, one question per screen. A question is one scored response opportunity; extra scored reason prompts would count as additional questions and require revising this budget. Prefer an answer that includes a decision and its reason where both are needed. Do not silently turn 30 questions into 60 interactions.

The number is a starting constraint to test, not a validated optimum. The pilot should establish actual completion time before we publish a time estimate. Short breaks and resume are available without adding lessons or corrective feedback between baseline sections.

| Subchapter | Lessons | Current items | Proposed items | Principal assessment emphasis |
|---|---:|---:|---:|---|
| 1.1 BHW roles | 6 | 9 | 4 | Complementary roles, audience, scope and records |
| 1.2 UHC | 4 | 3 | 3 | Inclusion versus covered service, referral, feasible improvement |
| 1.3 BHS policies | 5 | 2 | 3 | Product-specific decisions, support, authorized proposals |
| 1.4 RA 7883 | 5 | 3 | 3 | Accreditation evidence, benefit conditions, BHWE verification |
| 1.5 Working with others | 6 | 3 | 3 | Appropriate contact, private task handoff, self-management |
| 1.6 Communication | 5 | 6 | 4 | Permission, clarification, teach-back repair, relevant handoff |
| 1.7 Problem solving | 4 | 4 | 4 | Problem evidence, causes, priorities, review of action |
| 1.8 Occupational safety | 4 | 4 | 3 | Hazard control, readiness, prompt exposure response |
| 1.9 Sustainable practices | 3 | 4 | 3 | Verified stock, safeguarded change, comparable results |
| Total | 42 | 38 | 30 | All nine subchapters represented |

Three extra slots beyond three per subchapter go to roles/records, communication and problem solving: 1.1, 1.6 and 1.7 each have one extra slot. The allocation is based on the proposed distinct decisions, not on lesson length. Adjust it if the content review finds an essential decision undersampled; do not add questions just to preserve old items.

## Thirty question blueprint

Each slot gets a pre and post version with the same primary construct, response format, number of alternatives and intended reasoning load. A supporting lesson association does not earn a separate score or establish mastery of that lesson. In particular, one partner-contact question cannot test every local office, and one safety question cannot test every hazard group. The lesson map assigns the remaining evidence to practice and observation.

| Slot | Primary target | Response evidence | Misconception to distinguish |
|---|---|---|---|
| T01 | 1.1.1 Combined roles | Select the roles contributing to a fresh situation and their purpose | Roles are mutually exclusive or grant clinical authority |
| T02 | 1.1.2 Audience adaptation | Choose an adjustment supported by audience needs | One message and schedule suit every group |
| T03 | 1.1.4 Scope and next step | Choose a helpful response within training | Either give unsupported advice or merely dismiss the request |
| T04 | 1.1.5 Records | Interpret a record request and an uncertain entry | Group membership proves receipt of a service |
| T05 | 1.2.1 UHC coverage | Choose a careful explanation and verification | Automatic inclusion means every service is free everywhere |
| T06 | 1.2.2 Primary care | Select the appropriate clinic/process verification | The BHW independently decides referral or promises coverage |
| T07 | 1.2.4 Improvement | Choose a feasible, agreed action with a review measure | A broad suggestion or unapproved announcement is a plan |
| T08 | 1.3.1 Offers | Match a named product and activity to an appropriate response | Free or educational branding establishes permission |
| T09 | 1.3.2 Support | Choose a private, respectful connection to confirmed support | Promise a space/service before checking or impose a choice |
| T10 | 1.3.5 Proposal | Identify the checks needed before a specific change | A good intention authorizes implementation |
| T11 | 1.4.4 Accreditation | Distinguish recommendation, missing evidence and decision | Recommendation or invitation establishes accreditation |
| T12 | 1.4.2 Benefits | Apply a named benefit's conditions and verification | Every accredited BHW automatically receives an identical payment |
| T13 | 1.4.3 BHWE | Interpret service evidence and identify the next CSC question | Total service equals qualifying accredited service or guarantees appointment |
| T14 | 1.5.6 Contact | Choose a contact for a stated need and verify the local route | A logistical contact can make a clinical decision |
| T15 | 1.5.4 Teamwork | Choose a respectful, accepted task handoff | Colleagues must disclose private reasons to receive help |
| T16 | 1.5.5 Self-management | Choose realistic priorities and honest communication after a change | Promise everything or silently abandon unfinished work |
| T17 | 1.6.1 Listening | Respect permission, setting and the resident's choice | A neighbor can answer on the resident's behalf without checking |
| T18 | 1.6.2 Clarification | Select a neutral question about a concrete ambiguity | A guessed cause can be embedded in the question |
| T19 | 1.6.3 Teach-back | Recognize a misunderstanding and select repair/recheck | A yes or nod is enough, or misunderstanding is the resident's fault |
| T20 | 1.6.5 Handoff | Select relevant information for an authorized recipient and route | Full disclosure or merely sending a message ensures a good handoff |
| T21 | 1.7.1 Problem statement | Interpret an event, source, scope and information gap | Blame or a preferred solution is an evidence-based problem statement |
| T22 | 1.7.2 Causes | Identify a verification needed for competing branches | Five questions or matching observations prove a cause |
| T23 | 1.7.3 Priorities | Interpret a ranking/tie with evidence and role limits | Highest total alone settles action or delays urgent referral |
| T24 | 1.7.4 Action review | Interpret a plan against a verified cause and intended outcome | Holding a meeting proves the problem improved |
| T25 | 1.8.2 Controls | Match a concrete hazard to an effective control | PPE alone removes every hazard or a workaround permits unsafe work |
| T26 | 1.8.3 Readiness | Identify the unconfirmed condition before proceeding | Agreeing an alternative proves the route or equipment is safe |
| T27 | 1.8.4 Exposure | Select a prompt reporting/evaluation response | No symptoms or pending paperwork justifies waiting |
| T28 | 1.9.1 Stock audit | Interpret version and usable stock evidence before ordering | Unfindable stock must be absent or old copies are usable |
| T29 | 1.9.2 Safe change | Select a proposal with authorization and safeguards | Cost saving authorizes repairs, unsafe reuse or reduced essential services |
| T30 | 1.9.3 Results | Interpret rates with comparable workloads and service quality | Lower total consumption alone proves improvement or savings |

The four sample pairs illustrate T04, T15, T23 and T30. They are original assessment drafts, not copies of the in-lesson checks. Complete and review the full 60-item set during implementation. Separately author 24 initial checkpoint items and 24 alternates for fresh practice: 108 unique bilingual items overall. The alternates add optional retries, not additional required first-pass questions.

## Learner flow

1. **Test introduction.** Expectation setting and the chapter overview appear before the pre-test; the chapter recap appears before the post-test. At the test entry, briefly explain its purpose, three sections, saved progress and absence of a passing requirement without repeating the full orientation. Suggested Filipino copy: “Alamin natin kung ano na ang alam mo at ano ang kailangan pang balikan. Hindi ito pagsusulit na kailangang ipasa.” Post-test copy should explain that practical skills have a separate assessment.
2. **Question screen.** Show “Section 1 of 3 · Question 4 of 30,” a concise scenario, three plausible choices by default, and Previous, Next and Mark for review. Keep the scenario visible when needed to interpret a table. Do not automatically advance on selecting an answer.
3. **Response options.** Provide “Hindi ko pa alam / I don't know yet” in both forms as an explicit response. It counts as zero evidence of a correct answer, but remains distinguishable from a misconception and from an unanswered item. Do not force a guess. Permit an unanswered item to be skipped temporarily.
4. **Section break.** Show answered and marked counts, Continue and Save and leave. Avoid instructional headings that give away a question's answer. Sections 1–3 cover subchapters 1.1–1.3, 1.4–1.6 and 1.7–1.9 respectively. Pause does not submit the attempt.
5. **Review screen.** List answered, unanswered, unknown and marked questions, each with an accessible jump link. Before submission, require every item to have an answer or an explicit unknown; a blank must never silently become an incorrect answer. Allow edits until final submission.
6. **Submission.** Confirm only that this submits the completed form; prevent duplicate attempts on retries or lost responses. A network error preserves the draft and explains whether submission is confirmed or still pending.
7. **Results.** After pre-test, show baseline and broad areas to study without item answer keys. After post-test, show each question, the learner's answer, correct/incorrect/unknown status, the correct answer, why it is correct, why the selected alternative is insufficient, relevant lesson links and suggested practice. Offer All questions and Needs review views. Keep a persistent Review my post-test entry on chapter results, including for completed, previously passed or certified learners. Pre/post feedback waits until the whole form is submitted; the separate formative checkpoints give immediate feedback after each committed answer.

Use untimed delivery with no countdown. Preserve answers and position across language switches, refresh and resume. Text is sufficient for every task; any neutral read-aloud must read stems and options without hints or revealing keys. Support keyboard navigation, visible focus, screen-reader announcements on question change, clear labels and large touch targets. Narrow screens must keep tables readable. None of these accommodations changes scoring. During study, insert the separate group-checkpoint and reflection flow at the mapped boundaries; these are not additional pages inside the baseline or post-test.

## Scoring and results

- One point per correct response, zero for incorrect or explicit unknown; no penalty for guessing and no confidence-based score. Store the reason for zero separately. An incomplete draft has no score.
- Report total correct out of 30 and the percentage; a subchapter has only three or four items, so use counts and specific review topics rather than mastery labels or precise proficiency bands.
- Example feedback: “Records: review how a master list differs from a service registry. Revisit 1.1.5 and practise checking an uncertain entry.” Keep a direct observation status separate: “Not yet observed” where applicable.
- When forms are comparable, describe 12/30 to 21/30 as 40% to 70%, a change of **30 percentage points**. Do not label this “30% learning gained.” Form difficulty, practice and guessing can affect the difference; it does not prove causation or retention.
- Before form comparability is established, show the two results with the form versions and a clear limitation. The first release disables the headline numeric change in learner and cohort reporting; a later documented comparability review is required to enable it. If scope changed between attempts, do not compute a comparable chapter gain.
- Preserve the first submitted baseline and first post-test. Later practice or reassessment results are separately labeled; they never replace the baseline or inflate the first-attempt comparison. Define alternate forms and a retry policy before implementing reassessment. This plan does not change existing attempt rules.
- Once answers have been revealed, repeating those questions measures supported practice or recall. Use a different approved form for any later independent reassessment, label prior exposure and preserve the original attempt. Answer review is available after submission regardless of score, rather than withheld until someone passes.
- Store checkpoint first responses and later corrections separately from pre/post results. Reflections, course feedback and assessor replies carry no points; they are not included in score change or automatically converted into practical ratings.
- Confidence ratings, adaptive testing, free-text automated grading and a delayed retention test are outside this initial proposal. The first release can use transparent answer keys and targeted review without those features.

## Separate practical evidence

Use the existing lesson rubrics for observable actions. Examples are an original record and secure handoff, a respectful task handover, a cause map and action plan, a trainer-approved dummy safety demonstration, and a stock-audit/resource proposal. Each needs an actual learner attempt and feedback; selected answers do not substitute for it.

The map names evidence for each lesson, but does not impose 42 new final practical examinations. Facilitators can gather evidence during existing practice and combine appropriate tasks, while recording which indicators were actually observed. Self or peer practice is labeled as practice. Record independent performance, prompted performance and an unobserved indicator distinctly; this is proposed reporting guidance, not a change to certification policy or the current rubric schema.

## Authoring and pilot checks

First, review the audit and coverage with the chapter content owner. Prioritize Q01's unsupported new-role implication, Q19's private-issue wording and Q35's repair authorization, plus Q13–Q16's policy and eligibility distinctions. Check keys against the current approved lesson and its primary sources before release, with qualified policy/clinical review for the relevant items.

Write paired forms using the blueprint. Keep cognitive demand, reading burden, table complexity, option count and permitted assistance comparable. Balance the length and specificity of alternatives; use realistic misconceptions instead of obviously insulting or absurd distractors. Avoid negative stems unless essential. A bilingual reviewer should check meaning and clues in both languages. Do not reuse story wording, images that disclose the solution or exact lesson-check answers as the assessment task.

Conduct a small usability pilot spanning Filipino/English preferences, mobile use and differing reading confidence. Use think-aloud feedback in this pilot to find confusing wording, excessive reading and navigation problems; these prompted attempts are not scored efficacy evidence. Establish the expected time and whether three sections of ten feel manageable.

Pilot the complete learning journey, not just the final-test screen. The draft now contains 60 pre/post responses, 46 existing Read-section checks and 24 group-checkpoint responses: 130 planned response opportunities before optional retries and reflections, versus 122 from the current 38-question pre/post bank plus those 46 checks. Distribution may improve the experience, but the total is not automatically shorter. Measure duplication and fatigue; revise the checkpoint placement or assessment length before making additional interactions mandatory. Do not silently delete existing lesson checks or change their completion behavior to meet a count.

Orientation, the nine major lesson introductions and the chapter recap add reading or listening time, but no scored questions. Keep them brief and reusable from the chapter outline, without forced video, dwell timers or mandatory written responses. Include their actual time in the workload pilot. All nine major lesson introductions are authored as one complete set. The optional entry expectation reuses the reflection workflow and can be revisited in the chapter-end reflection instead of requiring another essay.

Then trial fixed forms with standardized instructions. If practical, counterbalance A-pre/B-post and B-pre/A-post to examine form effects, while recognizing this alone does not establish psychometric equivalence. Review item success rates, unknown responses, distractor selection, omissions, section drop-off and completion time. With a sufficiently sized sample, assess item discrimination and form differences; small-sample estimates are exploratory. Investigate language differences before attributing them to learner understanding. Adjust items or length when evidence warrants it.

Pilot acceptance requires no unresolved ambiguous keys or content contradictions, usable mobile and accessible navigation, reliable save/resume without lost answers, and a review path for every assessed gap. There is no justified mastery cut score or promised reliability coefficient at this stage.

Acceptance also requires successful answer review by a certified learner, persistence of the exact submitted question/answer history, private reflection drafts, authorized assessor access to submitted insights, and a no-penalty route past a skipped checkpoint or reflection. The detailed scenarios are in [Feedback and reinforcement design](feedback-and-reinforcement.md).

Verify the opening order, exactly nine major lesson introductions, and the recap immediately before the post-test entry. Introductory content must not reveal answer keys; the recap must summarize approved teaching without reproducing the test. Reopening an introduction or recap must preserve lessons, attempts and certification. See [Orientation and recap](orientation-and-recap.md) for copy and additional acceptance criteria.

## Implementation boundary for the later build

The current form renders the whole bank, keeps answers in component state and submits a selected option index for every question. The new flow needs an explicit draft lifecycle, persisted position and responses, an unknown-response state, and a form version fixed at attempt start. Keep scoring authoritative on the server and send learner screens only the material needed to answer. The current course query and authenticated bank view expose `correct_option_index`; replace raw-key reads with safe delivery and authorized review APIs, then enforce database access. Removing a React prop alone is insufficient.

The question controls and current bank are shared with assessor exams. The assessor Chapter 1 exam requires at least 38 questions: replacing that bank with the proposed 30 would break exam start. Create isolated BHW paired forms and a dedicated importer, preserving the assessor bank, question minimum and qualification threshold. Keep new drafts separate from final `course_test_attempts`; write a compatible final row only after server submission. Exact contracts are in the handoff.

Post-test review needs an authorized read of the learner's submitted responses and historical question versions, with authored explanations. It must remain available beyond pending-assessment screens and must not reveal keys to an unsubmitted test. Reflection drafts/submissions, assessor replies and checkpoint attempts need distinct persisted records and explicit visibility rules; ordinary assessment decision notes are not a substitute for a learner-reflection workflow. The existing facilitator roster already records observed competency indicators. Extend its learner context and the relevant assessor view without reclassifying reflections or quiz clicks as observations.

Continue the existing immutable question-history approach, but also associate each attempt with its exact form, blueprint, lesson scope and scoring version. Do not replace questions halfway through an in-progress attempt, recompute old scores or overwrite historical answers. New counterpart items must have distinct identity. A language change must preserve the semantic choice even if display order changes. Do not randomly mix items across forms until equivalence and coverage can be controlled.

Plan for solo and facilitated learners, incomplete drafts, returning learners with old baselines, and later bank updates. Finish an existing pinned form; only an explicit administrative invalidation for a withdrawn form can start a replacement without rewriting the old record. Existing learners without a comparable new baseline can receive a new post-test diagnostic result without an asserted gain. Legacy stored responses do not establish the exact historical scoring denominator or membership; label those limitations in review and preserve the recorded score. The handoff defines reviewer assignments, conflict recovery, publication reconciliation and rollout behavior.

## Next work

Sol can implement the complete journey using the handoff's defaults, without reopening routine design choices. Author and review the remaining content, build the isolated storage and safe APIs, connect all nine introductions and the full learner/assessor flow, and verify the acceptance scenarios. Content accuracy, bilingual review, the published-curriculum match and a usability pilot remain release evidence to collect. This package changes documentation only; the question bank, application, learner records and live assessment remain unchanged.

Planning validation on 11 October 2026 checked all 63 local Markdown links, the 42 mapped lesson sources/objectives, 38 original question hashes, 30 primary blueprint slots and their allocation, 12 checkpoint boundaries, nine complete introduction headings/IDs, and 18 handoff acceptance scenarios. Application tests were not run for this documentation-only work; implementation verification remains specified in the handoff.
