# Gabay sa PhilHealth — phased development blueprint

- **Status:** Proposed implementation plan, following approval of the [course blueprint](./gabay-sa-philhealth-course-blueprint.md)
- **Prepared:** 29 September 2026
- **Repository:** [BHW Connect Phase 2](https://github.com/jongsky25/BHW-Connect-Phase-2)
- **Release intent:** One required course for BHWs, with an 80% knowledge pass and an assessor-observed role-play; matching patient flipcharts, KB answers, and Chat Guide routing. Completion grants no special permissions.

## 1. Implementation approach

Build **one standalone course in the existing Courses area**, under the title **BHW Connect: Gabay sa PhilHealth**. Do not fold it into the BHW Reference Manual hierarchy. Reuse the current course progress, quiz, assessor queue, and certificate path, which already has an end-to-end test from course creation through assessor certification. Extend the versioned training-content workflow so this course is reproducible from reviewed files rather than an untracked one-off admin form entry.

Use one claim register to produce the course, three flipcharts, KB entries, and Chat Guide tests. Keep every new learner-facing item in draft or otherwise hidden until the complete package is reviewed. The existing KB has no content-specific feature flag: once an entry is published, every eligible BHW in that project can receive it through Chat Guide. That makes coordinated publication a deliberate release action, not an incidental result of loading data.

The initial diagnostic can be an unscored check at the start of the course. Use the existing **quiz module** for the required 10-item, 80%, three-attempt knowledge gate, unless the P0 audit finds a reason the separate pre/post-test path is necessary. This preserves the current quiz → assessor queue → certificate flow. The observed assessment must store the six approved rubric indicators and feedback, rather than only a bare pass/fail.

## 2. Increment map

| Increment | Outcome | Reviewable result | Must be true before the next increment |
|---|---|---|---|
| **P0 — Contract and baseline** | Map the approved blueprint onto the current app and data model. | A small technical decision record: course identity/scope, quiz pathway, assessor record shape, source package format, release/rollback plan, and the verified current baseline. | No unresolved path that could issue a certificate without both assessments; no ambiguity about national course visibility. |
| **P1 — Reviewed content source** | Write the bilingual, source-traceable content package. | Claim register; five module scripts; 10 test items and rationales; four role-play cards; rubric; three flipchart scripts; initial KB intent list. Everything remains unpublished. | Admin can review every material claim against a named current PhilHealth source; Filipino and English actions match. |
| **P2 — Course and observed assessment** | Make the required orientation work end to end. | Standalone course in Courses; unscored diagnostic; lesson checks; required quiz; assessor queue with the six-indicator role-play form, feedback, retries, and certificate gate. | A BHW cannot obtain course completion/certificate before quiz **and** observed role-play pass; a pass changes no permissions. |
| **P3 — Flipcharts and field use** | Deliver the three paired-view education aids. | Patient and BHW views; correct Filipino/English rendering; source/review metadata; links from the relevant course lessons; deliberate offline preparation of text and images. | A BHW can present every page in either language without showing BHW notes to the patient, including after an offline preparation step. |
| **P4 — KB and Chat Guide** | Make the same reviewed guidance retrievable in chat. | Published-ready bilingual KB entries and articles as needed; distinct keywords/synonyms; registration clarifier; out-of-scope handling; retrieval fixtures and collision checks against existing UHC content. Entries remain draft until P5. | Typical Filipino, English, and Taglish questions return the intended answer or clarifier; no stale or unsupported claim is surfaced. |
| **P5 — Integrated pilot release** | Approve and publish the coordinated package. | Admin review record; checked flags and scope; loaded course and flipcharts; published KB; Chat Guide rules deployed; signed-in field smoke test; rollback instructions; PhilHealth review copy. | The complete BHW journey passes in a disposable environment and the pilot, including offline visit and assessor certification; production publication is recorded. |

P1 can start without application changes. P2–P4 are separately reviewable code/content increments and may be built sequentially. P5 is the only live publication gate. No partial KB publication is needed to demonstrate P2 or P3: use a disposable database and draft content.

## 3. Increment details

### P0 — Contract and baseline

1. Confirm the exact branch and deployed state, active feature flags, migration level, and test environment. Use a disposable Supabase stack for development and end-to-end tests; the repository's pilot handoff reserves its pilot database for deliberate content loads and post-deploy checks.
2. Confirm how a nationwide course is represented in the org hierarchy, who can publish it, and what an assessor can see and claim across catchments. Document the course's stable content ID.
3. Trace the current course quiz pass through the assessor queue to the certificate. Confirm that failed role-plays can be retried and that certification is never issued from a quiz pass alone.
4. Decide whether an additive rubric-detail record is needed for six indicators, evidence notes, attempts, and version of the scenario. Preserve existing assessment history and certificates.
5. Check the current lesson renderer and versioned loader. The stand-alone course should have reviewable source files and stable IDs, with no dependency on Reference Manual chapter mapping.
6. Verify current publication behavior. The admin flipchart form currently creates a published chart, so P3 needs a safe draft/staging route for this package. Confirm KB draft loading, course draft publishing, and hide/unpublish behavior.

**Exit evidence:** A short architecture note and one working end-to-end baseline in a disposable environment, with any product gaps named before schema changes.

### P1 — Reviewed content source

1. Create the claim register with source URL, issue/date, verification date, Filipino and English wording, owner, and affected surfaces. Flag volatile items such as provider lists, medicine lists, fees, benefit limits, and selection channels for explicit recheck before publishing.
2. Author the five modules around the four approved household cases. Each objective maps to a practice, one quiz item or role-play indicator, and the appropriate job aid.
3. Write ten bilingual scenario questions, answer rationales, and an unscored diagnostic. Review tempting wrong answers for unintended ambiguity.
4. Write the four role-play cards and anchored six-indicator assessor guide. A second assessor should be able to score the same trial performance consistently.
5. Storyboard the three patient flipcharts with separate BHW notes and image descriptions.
6. Define the initial KB question inventory and independent user phrasings for retrieval tests; reconcile overlap with existing UHC entries rather than duplicating conflicting answers.

**Exit evidence:** A review packet the admin can read without running the app. No database publication.

### P2 — Course and observed assessment

1. Add the versioned PhilHealth course package and loader path with dry-run and apply behavior, stable IDs, source validation, and draft publication. Do not make hand-entered database text the master copy.
2. Show five bilingual modules in Courses, with a short lesson practice and an unscored diagnostic. The required final quiz uses the approved 10 items, 80% threshold, and three attempts.
3. Add the six-indicator observed role-play form to the assessor workflow. Store scenario ID, indicator decisions, concise evidence/feedback, assessor, timestamp, and attempt number. Preserve earlier attempts.
4. Keep the existing certificate flow but enforce the two-part pass rule on the server. A failed role-play returns the BHW to practice and a new assessment attempt; it does not consume a quiz attempt.
5. Show BHW and assessor states clearly: studying, quiz passed/awaiting observation, practice required, certified. Do not add a permission or eligibility flag downstream of certification.

**Exit evidence:** End-to-end test of fail, feedback, retry, pass, and certificate; authorization checks for a different BHW or assessor; Filipino and English learner/assessor journeys.

### P3 — Flipcharts and field use

1. Create the three approved charts from versioned bilingual content. Admin can stage and preview them before publication; the package does not auto-publish when entered.
2. Fix the current viewer and chart list, which select English title/caption/script even when Filipino content exists. Add image descriptions and confirm visual text is readable on a phone.
3. Add course links to the matching flipchart and a route back to the course, without making the flipchart inaccessible before certification.
4. Add claim/source/review metadata in the BHW view, while keeping the patient view brief. Use new original illustrations unless permission to reuse an official image is established.
5. Add an explicit **Prepare for visit** action or equivalent that caches the complete selected chart, including images, and shows the BHW what is available offline. The current service worker caches visited navigations and app static assets, but not a guaranteed complete flipchart image set.

**Exit evidence:** Filipino/English display, patient/BHW separation, shared-device sign-out cache clearing, offline open/reopen after preparation, and online update behavior.

### P4 — KB and Chat Guide

1. Add a PhilHealth content root with stable KB IDs, categories, bilingual entries, source registry, and synonyms. Use the existing versioned KB loader; load as draft until the integrated release.
2. Cover the approved intent groups: YAKAP basics; PIN/record questions; clinic selection and dependents; GAMOT pathway; costs, complaints, and what must be verified. Each answer provides the next official action and avoids an individual eligibility or clinical ruling.
3. Add a clarifier for ambiguous “register” questions: **PhilHealth PIN/membership** or **YAKAP clinic selection**. If a user supplies enough context, return the specific entry directly.
4. Add explicit scope responses for dosing, medicine suitability, availability, and account credentials. Do not route these to a generic benefits answer.
5. Run independent Filipino, English, and Taglish query fixtures against the complete published candidate corpus, including the existing UHC entries. Resolve false matches and stale UHC statements before publication.
6. Confirm whether the conversational flag is enabled for the target BHW role. The basic Chat Guide reads published KB entries; the clarifier requires the conversational layer and a deployment of its bundled rules.

**Exit evidence:** Retrieval report with expected answer IDs, ambiguous-query behavior, out-of-scope cases, and no-answer gaps; an authenticated test in the actual chat UI against a disposable database.

### P5 — Integrated pilot release

1. Recheck official PhilHealth issuances and the accredited provider source list immediately before approval. Update affected claims and regenerate all dependent surfaces together.
2. Admin reviews the full package: lesson screens, assessment items, rubric, all flipchart pages, KB answers, and sample Chat Guide responses. Record approved content IDs/hashes, date, and reviewer.
3. Rehearse publication and rollback in a disposable environment. Then apply the reviewed content to the pilot deliberately: deploy code/rules, enable required role flags, publish course and flipcharts, publish KB, and verify the real app before communicating availability.
4. Smoke-test as a BHW and assessor: enroll, learn, pass quiz, fail and retry role-play, certify, show flipchart offline, and ask Chat Guide the four scenario questions. Confirm no special permission appears after certification.
5. Monitor unanswered and misrouted PhilHealth questions during the first pilot period. Correct reviewed content through the versioned package. For an urgent content problem, hide/unpublish affected course/flipchart/KB entries and disable the conversational layer if its routing rule is at fault.
6. Prepare a PhilHealth review copy and log their feedback as proposed revisions. Their review does not rewrite the admin-approved history silently.

**Exit evidence:** Release record, real-app smoke results, known limitations, and review packet.

## 4. Dependencies and boundaries

- **Course and KB are separate delivery paths.** Completing the course does not create KB answers. KB entries must be authored, loaded, published, and retrieval-tested explicitly.
- **Chat Guide access is independent of certification.** BHWs may consult approved guidance while studying and in the field. Passing affects only course status/certificate.
- **The two assessment gates are distinct.** The quiz tests decisions; the assessor observes a household conversation. The role-play result must be recorded with evidence, not inferred from a quiz score.
- **Official systems remain authoritative.** BHW Connect guides the next action; it does not apply for a PIN, choose a clinic on a resident's behalf, confirm an individual claim, or check pharmacy stock.
- **National core, local verification.** Do not hard-code one LGU's clinic, pharmacy, contact, or registration workaround into the national course. Local directories can be added later as verified scoped data.
- **No silent partial release.** Existing flipchart admin creation and KB publication behavior need staging controls or a documented safe sequence before this package reaches BHWs.

## 5. Verification matrix

| Journey | Required proof |
|---|---|
| BHW learning | Filipino and English lessons, formative feedback, accurate navigation and progress. |
| Knowledge gate | 10-item scoring, 80% threshold, three-attempt limit, actionable failed state. |
| Assessor observation | Correct queue scope, six recorded indicators, feedback and retry, audit trail. |
| Certification | Certificate only after both passes; no role/permission change. |
| Flipchart visit | Correct language and two views; full prepared chart including images opens offline. |
| Chat Guide | Correct KB answer/clarifier for four scenarios, Taglish variants, no inappropriate clinical or account answer. |
| Content update | One changed claim identifies every affected surface; old approved version remains traceable. |
| Release/rollback | Drafts cannot leak; publication is verified in the actual app; affected content can be hidden promptly. |

## 6. Approval for implementation

The approved educational blueprint fixes the **what**. This document proposes the **order and release gates**. The first development increment is P0; it may refine implementation details when the current code and deployment are inspected, but it should not silently change the approved learning outcomes, two-part pass requirement, BHW scope, or coordinated KB/Chat Guide delivery.
