# Chapter 1 feedback reflections and reinforcement

This extension makes feedback a continuing part of Chapter 1: learners can inspect their submitted post-test answers, share learning insights and questions with an authorized assessor, and revisit ideas in short quizzes between lesson groups. Practical performance continues to require observation. The chapter welcome, exactly nine whole major lesson introductions, and recap before the post-test are specified in [Orientation and recap](orientation-and-recap.md). Checkpoint groups do not add introductions of their own.

Implementation defaults, explicit reviewer assignments, recovery rules and release checks are finalized in the [Sol handoff](SOL-HANDOFF.md). The [research review](research-and-gap-review.md) explains the platform and learning guidance behind the design.

## Findings and recommendations

The current [pre/post component](../../src/components/elearning/pre-post-test.tsx) renders scores and their difference but has no submitted-answer review. The separate `quizReview` path in the [course page](../../src/app/courses/[id]/page.tsx) is for `gabay_roleplay` course quizzes; it does not supply Chapter 1 pre/post answer review. Course completion or certification is therefore not an adequate feedback experience by itself.

The chapter's 42 lesson manifests contain 46 Read-section checks. Those already provide within-lesson retrieval practice. The proposed group quizzes should connect concepts across lessons, including a small amount of earlier material, rather than repeat the same checks. Short practice with prompt explanations can support retrieval and correction, but its benefit here must be checked against the extra workload.

The [facilitator roster](../../src/components/elearning/facilitator-roster.tsx) already displays learner progress/test scores and records practical observations. The inspected roster and assessment queue do not provide the proposed learner-authored reflection and reply flow. Add that as learner context with an explicit access relationship, keeping it separate from competency ratings.

## Post test answer review

Make a persistent **Review my post-test / Balikan ang aking post-test** action available immediately after confirmed submission and on the learner's chapter results/history. It remains available after a passed result, content completion or certification, and after leaving and reopening the chapter. Opening review does not start a retake or alter completion status. The proposed diagnostic test has no new pass threshold; “already passed” includes learners with existing passing or certification status.

For each question show:

| Field | Purpose |
|---|---|
| Exact submitted question and options | Let learners see what they actually answered |
| Your answer | Preserve the selected response, including explicit unknown |
| Correct, incorrect or not yet known | Make the result clear in words, not color alone |
| Correct answer | Reveal it for correct and incorrect responses alike |
| Explanation | Say why it fits this situation and why the selected alternative does not |
| Review lesson | Link to the relevant lesson or section, when available |
| Try a related practice question | Optional fresh application; never overwrite the original answer |

Use one review item per screen with Previous/Next and an overview list. Default to a brief summary with **Needs review** and **All questions** choices; show correct answers as well as errors, since a correct guess is possible. Keep language switching and accessible text/read-aloud available. For an unknown response, explain the correct reasoning without attributing a misconception the learner did not express.

Example: “Your answer: use the master list. Needs review. Correct answer: consult the service registry and verify the uncertain entry. Being on a group list does not prove that a service was received. Review lesson 1.1.5.”

Reveal only submitted-attempt review. Learner test payloads and unfinished attempts must not expose answer keys or feedback. A review read checks learner ownership or the authorized assessor relationship on the server. A passing score is not an access condition; submitting the attempt is.

### Historical attempts and later practice

Resolve review from the original attempt's saved answers and original question versions, including retired questions. Never attach a current bank answer to an old prompt by position. The existing immutable question history is a useful starting point; verify which historical response fields can actually be reconstructed before promising review for every old attempt.

The repository check found that legacy attempts store raw answers but not an exact served form or scoring membership. Some duplicate or retired responses could be saved without contributing to the score. Show recoverable original choices and keys with a historical-provenance label; do not claim every saved response was scored or reconstruct the denominator from the current bank. Preserve the recorded final score.

If a historical answer or rationale is unavailable, label that particular gap. Do not invent a selected answer, silently substitute today's question or present a newly written rationale as historical learner feedback. A newly authored explanation may be attached after content review, with its version recorded. If the old key conflicts with corrected guidance, display a clearly labeled correction and current lesson link; preserve the historical score and route any formal rescoring policy separately.

A learner may practise after reading the explanation. Label that as supported practice. Any future independent reassessment needs a different approved form and a record of prior exposure. Do not deny useful feedback to protect reuse of an exposed question bank.

## Free text learning insights and lesson feedback

Offer **My learning notes / Mga tala ko sa pagkatuto** at each lesson, available without interrupting reading. At the end of each lesson group, invite one short reflection. Let the learner reuse or select an existing lesson note rather than write it twice. Do not require an essay after all 42 lessons.

Keep two fields distinct:

| Field | English prompt | Filipino prompt |
|---|---|---|
| Learning insight | What is one thing you learned or corrected? How would you use it in a situation? | Ano ang isang natutuhan o itinama mo? Paano mo ito gagamitin sa isang sitwasyon? |
| Question or lesson feedback | What is still unclear, or what in this lesson could be clearer or more useful? | Ano ang hindi pa malinaw, o ano sa araling ito ang maaaring linawin o gawing mas kapaki-pakinabang? |

The group-specific learning cue is in the lesson map and group table below. One or two sentences are enough; use a 1,000-character initial limit per field and no minimum length. Accept Filipino, English or mixed language. Do not score spelling, grammar, length, positive sentiment or resemblance to a model response. Prefer ordinary text entry initially; device dictation may help, but recording and retaining audio is not part of this proposal.

Both fields are optional and independent. A learner can send a question without a polished insight, or submit an insight without feedback. **Skip for now** has no effect on progression, assessment eligibility or score. If a learner prefers an oral discussion, the assessor may record an attributed summary after confirming it with the learner; label it assessor-recorded rather than learner-written. Missing reflections are not evidence of poor understanding.

### Saving and sharing

- Autosave a draft visible only to the learner. Show saved/pending/error state; acknowledged saves survive language changes and navigation. Warn about unsaved input after a network failure; do not promise refresh recovery for changes the server never acknowledged.
- Use an explicit **Share with my assessor** action. Before sharing, state that the authorized assessor or facilitator responsible for this learner can read the submitted text. It is identifiable feedback, not an anonymous survey.
- Preserve the submitted version when the learner adds a correction; save a new revision and mark it updated for the reviewer. Assessor replies remain attached to the version they addressed. Draft edits do not silently change the text an assessor has already reviewed.
- Use a short in-context prompt to discuss fictional/general examples without resident names, contact details or other private case information. Do not ask for a real patient story to prove application.
- For a solo learner with no responsible assessor yet, clearly show “Saved for your assessor; no reviewer assigned yet” after sharing. Keep the submission for a later authorized assignment; do not promise a reply or silently route it to every assessor in the system.

The sharing action is part of the planned learner interface, not a request for another owner approval step. Reviewers must not see private drafts, and unrelated learners/assessors must not gain access through guessable links or lesson membership alone.

### Assessor view and follow through

Add a **Learning insights and questions** area to the authorized learner detail view, reachable from the relevant roster/assigned assessment. It must be accessible during learning and after completion; do not restrict it to the current pending-assessment queue. Define the reviewer relationship for both facilitated and solo study and recheck access when assignments change.

Each entry shows learner, lesson/group, submitted language, date, source revision, original text and status: **New**, **Reviewed**, **Follow-up needed**, **Responded**. Keep a separate No reviewer assigned state where applicable. An update after review returns to New/updated. Show the actual text, not just a count or an automatically generated summary.

The reviewer can acknowledge it, write a learner-visible reply, link a lesson/practice activity, or mark it for discussion. A learner can see replies and the linked next step in the same place. Do not promise a response time the program cannot support. Use an in-app queue; this proposal does not add automatic email or external messaging.

Show learning evidence in separate sections: **pre/post understanding**, **checkpoint practice**, **learner reflections**, **observed performance**. A thoughtful reflection can guide the next question or observation, but does not automatically raise a competency rating. Avoid grading writing quality or letting a strong quiz score predetermine the practical assessment. Lesson feedback that criticizes the course does not lower a learner's result.

Content problems can be tagged for the normal content-review workflow with only the necessary excerpt and appropriate access. Identifiable raw reflections are not automatically published in cohort summaries or made visible to all course authors.

## Group reinforcement checkpoints

Use the learner label **Quick practice / Maikling pagsasanay**. A checkpoint is an opportunity to retrieve and connect ideas, not another pass/fail examination.

The initial design has **12 checkpoints with two questions each**, released after the mapped lessons. Most groups contain two to five lessons; the six-lesson subchapters are split into two natural groups. The first question retrieves an important idea from the current group. The second applies ideas together in a fresh situation; from G02 onward it can revisit an earlier relevant concept. Earlier-concept links are examples, not a claim that every checkpoint needs a separate cumulative score.

| Group | After these lessons | Question 1 emphasis | Question 2 application | Reflection cue |
|---|---|---|---|---|
| G01 | 1.1.1–1.1.3 | Complementary roles and audience | Invite participation without claiming an unverified cause | How would you change an invitation for a different group? |
| G02 | 1.1.4–1.1.6 | Scope and the appropriate record | Give a factual handoff using roles from G01 | What belongs in a handoff, and what still needs checking? |
| G03 | 1.2.1–1.2.4 | Inclusion versus a covered service | Verify a local route and propose an agreed improvement, using G02 scope limits | What would you check before promising that a service is free? |
| G04 | 1.3.1–1.3.3 | Identify the product and requested promotion | Respectfully decline a specific offer and protect resident choice | How would you explain a refusal without blaming a parent? |
| G05 | 1.3.4–1.3.5 | Resource policy and responsibility | Turn a factual concern into an authorized proposal, revisiting G03 planning | What must be confirmed before your proposal can proceed? |
| G06 | 1.4.1–1.4.5 | Accreditation, registration and benefit conditions | Interpret a service record and form a specific verification question, revisiting G02 uncertainty | Which fact would you verify before advising someone about eligibility? |
| G07 | 1.5.1–1.5.3 | Roles of barangay and city/municipal partners | Match a specific request to a verified contact, using G03 local-route checks | Who could help with your example, and what is outside that person's role? |
| G08 | 1.5.4–1.5.6 | Private reasons and clear task responsibility | Adapt to changed workload and confirm a handoff/contact, revisiting G02 | What would you do differently when an assigned task cannot be finished? |
| G09 | 1.6.1–1.6.5 | Permission, clarification and teach-back | Repair a misunderstanding or select a relevant secure handoff, revisiting G02/G08 | What would you say if the resident repeats a different next step? |
| G10 | 1.7.1–1.7.4 | Evidence versus assumed cause | Interpret a plan's result and revise it with partners, revisiting G05 proposals | What evidence would make you change your first explanation? |
| G11 | 1.8.1–1.8.4 | Match a hazard to a control | Recognize an unconfirmed readiness condition or urgent exposure response, revisiting G02 scope | What would make you pause work, and whom would you contact? |
| G12 | 1.9.1–1.9.3 | Verify usable stock and approved versions | Compare resource use with quality while preserving G11 safety | How would you check that less waste did not mean worse service? |

This samples two important decisions per group. The full range of benefit categories, hazard groups, communication skills and practical steps remains in the lesson checks and activities. Do not report group mastery from two answers.

### Interaction and feedback timing

Offer a checkpoint card at the group boundary and in the chapter outline. Learners may start it, save and leave, or skip and return; this pilot adds no new score or attempt gate. For a returning learner who already completed the lessons, show an optional checkpoint without resetting lesson completion or requiring the old chapter to be redone. A completed group is not blocked while its checkpoint content is unavailable.

Show one question at a time. Commit the first answer before showing feedback; retain that first response. Immediately show the correct answer and an explanation of the selected choice. Then offer a fresh related retry, a lesson link, or Continue. An explicit unknown gets an explanation and the same choices, without a failure label. Never require repeated guessing until the screen shows 100%.

Question 2 must be independently answerable and must not merely ask for the answer just revealed in Question 1. Feedback may support subsequent reasoning because this is practice; it is precisely why checkpoint totals must not be treated as independent assessment evidence. Each question is distinct from the pre/post items and existing lesson checks, with an authored rationale and a recorded objective.

After two questions, show a compact summary such as “One idea to revisit: verify the source before treating a report as fact.” Offer the reflection invitation, carrying across any saved lesson note. Record whether the reflection was written after checkpoint feedback so reviewers understand its context. The learner may continue with no reflection and no retry.

Author one fresh alternate for each of the 24 initial checkpoint questions: 48 formative items in total. After that alternate has been seen, subsequent learner-initiated repeats are explicitly labeled exposed-item practice; do not imply an unlimited supply of fresh questions. Do not average retries into a diagnostic gain score or repeatedly push learners through the same exposed choices. Show **Not started**, **In progress**, **Completed**, **Skipped for now** and review suggestions separately from actual scores; a completed practice can still contain an idea needing review.

### Short example for G09

These are formative authoring drafts, separate from the four pre/post pairs. They illustrate feedback timing; bilingual and content review remains necessary before release.

**Question 1 in English:** A resident nods after you explain an agreed next step. Which question best checks whether your explanation was clear?

A. “Is everything clear now?”

B. “To check that I explained it clearly, what will you do next?”

C. “You will follow the plan we agreed, correct?”

**Tanong 1 sa Filipino:** Tumango ang residente matapos mong ipaliwanag ang napagkasunduang susunod na hakbang. Aling tanong ang pinakamahusay na sumusuri kung malinaw ang paliwanag mo?

A. “Malinaw na ba ang lahat?”

B. “Para matiyak kong malinaw ang paliwanag ko, ano ang susunod mong gagawin?”

C. “Susundin mo ang napagkasunduan natin, tama?”

**Immediate feedback, key B:** Asking for the next step in the resident's own words lets you check the explanation. A nod, yes/no question or leading confirmation does not establish what the person understood. / Kapag ipinasabi ang susunod na hakbang sa sariling salita ng residente, masusuri mo ang paliwanag. Hindi pa ipinapakita ng tango, oo/hindi o tanong na may nakahandang sagot kung ano ang naunawaan niya.

**Question 2 in English:** A BHW is preparing an activity update. A colleague says the room is available, but the venue office has not confirmed the booking. Which wording should go to the authorized health-team coordinator through the approved channel?

A. “The room is confirmed; the office message will be added later.”

B. “The room is unavailable because the venue office has not replied.”

C. “A colleague reports that the room is available; the office has not confirmed the booking. Please advise who will verify it.”

**Tanong 2 sa Filipino:** Naghahanda ng update ang BHW tungkol sa isang gawain. Sinabi ng kasama na available ang silid, ngunit hindi pa nakumpirma ng tanggapan ng lugar ang booking. Aling pahayag ang dapat ipadala sa awtorisadong health-team coordinator sa aprubadong paraan?

A. “Kumpirmado na ang silid; idaragdag na lang ang mensahe ng tanggapan.”

B. “Hindi available ang silid dahil hindi pa sumasagot ang tanggapan ng lugar.”

C. “Ayon sa kasama, available ang silid; hindi pa nakumpirma ng tanggapan ang booking. Pakigabay kung sino ang magbeberipika nito.”

**Immediate feedback, key C:** Attribute the report and mark what remains unknown. A missing office reply establishes neither a confirmed booking nor that the room is unavailable. Request a verification step; do not invent certainty. / Tukuyin kung kanino galing ang ulat at kung ano ang hindi pa tiyak. Hindi pinatutunayan ng kawalan ng sagot ng tanggapan na kumpirmado ang booking o hindi available ang silid. Humingi ng hakbang sa beripikasyon; huwag mag-imbento ng katiyakan.

**Reflection invitation:** “What distinction would you preserve in your next conversation or handoff?” / “Anong pagkakaiba ang iingatan mong malinaw sa susunod mong usapan o handoff?”

Question 1 feedback does not reveal Question 2's answer. The two questions connect communication with earlier records/scope learning, while remaining a small sample of G09.

## Workload and pilot tradeoffs

| Element | Current authored response opportunities | Proposed response opportunities |
|---|---:|---:|
| Pre-test and post-test | 76 | 60 |
| Existing Read-section checks | 46 | 46 |
| New group checkpoints | 0 | 24 |
| Total before retries | 122 | 130 |

These counts describe first-pass response opportunities, not all authored variants, verified actual clicks or minutes; learners can revisit checks and the proposed checkpoints are skippable. Group reflection invitations add up to 12 optional pauses, with an optional entry/chapter-end reflection described in the orientation plan; they are not 42 mandatory writing tasks. The proposed experience distributes retrieval, but could still increase fatigue. Do not claim it reduces total workload merely because the final forms are shorter.

During usability evaluation, give particular attention to contrasting groups G02 for records/scope, G09 for communication, and G11 for safety, within the complete chapter prototype. Check whether the extra questions surface useful misconceptions, whether explanations help a fresh retry, whether learners skip from overload, and whether assessors can respond to the reflections they receive. A corrected answer immediately after feedback is not proof of durable retention.

Measure completion time including feedback, actual retries, reflection uptake, assessor review time and unresolved questions. Ask learners which checks felt repetitive. If the cost outweighs the benefit, reduce checkpoint frequency or remove redundant practice only after reviewing lesson completion dependencies. Revisit the provisional 30-question pre/post budget together with this added workload; the three assessments serve different purposes and need not grow together.

## Persistence and access needed in a later implementation

| Record | Minimum meaning to preserve |
|---|---|
| Submitted post-test review | Learner and attempt identity, exact question/option versions, selected response or unknown, original score, rationale version and lesson target |
| Reflection draft | Learner owner, lesson/group and source revision, text/language, private visibility and saved state |
| Shared reflection | Submitted text version, insight versus course-feedback field, learner/source context, before/after-feedback context, submission time and responsible reviewer relationship |
| Reviewer action | Shared revision addressed, reviewer identity, review status, learner-visible response and lesson/activity link |
| Checkpoint attempt | Group and item versions, first response, feedback exposure, later response type, progress state and lesson scope |

These are planning requirements, not a database migration or implemented feature. Extend existing authorized views and observation workflows where suitable, but do not overload practical-assessment decision notes with private learner drafts. Save and resume must handle interrupted connectivity without exposing someone else's draft on a shared device. Check read and write permissions server-side; changing a URL, reviewer assignment or browser session must not bypass them.

## Acceptance criteria

1. A learner submits a post-test, sees both correct and incorrect answers with explanations, and can reopen the same review after completion/certification without starting a new attempt.
2. A learner who submits unknown sees that response and the explanation. Correct answers also have explanations. Color is never the only correctness signal.
3. An unsubmitted attempt cannot fetch its answer key through the review path. Another learner or unrelated assessor cannot read the submitted answers or reflections.
4. Updating or retiring a question does not change an old attempt's displayed prompt, selected answer or original score. Missing historical material is labeled; corrected guidance is distinguishable from the original key.
5. Lesson notes save as private drafts. Explicit sharing makes the submitted text visible to the responsible reviewer, with learner, lesson/group and version context; navigating away or switching language preserves it.
6. An assessor can read the actual submitted insight and feedback, acknowledge or reply, and suggest practice. The learner can see the reply. Completion does not hide the conversation.
7. No-assessor, reassigned-assessor and updated-reflection cases have clear state and appropriate access. No reply or review is falsely claimed.
8. Each of the 42 lessons belongs to exactly one checkpoint group; all 12 groups have two distinct formative items. Opening old completed lessons does not reset progress or force a new checkpoint.
9. Checkpoint feedback appears after each committed answer. First response and supported retry remain distinguishable; neither changes pre/post results or practical ratings. Skipping or leaving never becomes a fabricated wrong response.
10. A learner may skip a reflection/checkpoint and continue. A low practice result or critical comment does not block the post-test, reduce certification status or produce a failing practical rating.
11. A mobile/keyboard/read-aloud user can complete and revisit each flow. Save failure, refresh and duplicate submission do not lose content or create misleading completion states.
12. Pilot reporting includes the full workload and assessor response burden, with language and accessibility review before release. No automatic scoring or sentiment analysis is applied to free text.

## Proposed delivery order

Follow the handoff's dependency order to build one complete reviewable Chapter 1 journey: persistent post-test review, private drafts and shared insights, assessor replies, all 12 checkpoints, all nine introductions, and the opening/recap. Evaluate the complete prototype, with extra attention to the three contrasting groups above, before activation. This remains a planning package; production tests and records have not been changed.
