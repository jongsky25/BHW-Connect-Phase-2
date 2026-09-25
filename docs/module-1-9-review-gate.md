# Module 1.9 review and release gate

Status: **review-ready draft; human review and learner timing pending** (25 September 2026). This record supplements [the first-pass review](chapter-1-6-1-9-draft-review.md). It does not record a facilitator, Filipino-language, clinical-policy, visual, or learner-pilot approval.

## Source reconciliation

| Claim used in the draft | Checked source | Decision for review |
|---|---|---|
| Unit 400311217 covers measuring, recording and comparing resource use; listing and validating causes; and reporting, discussing and clarifying feedback. | [TESDA Barangay Health Services NC II, unit 400311217, PDF pp. 33-35](https://tesda.gov.ph/Downloadables/Barangay%20Health%20Services%20NC%20II.pdf) | The three lessons follow these elements. Local workplace procedures and observed performance are still required. |
| Three facilitated hours are proposed for this subchapter. | DOH Facilitator Guide, repository transcription, PDF p. 19 | 180 minutes is a planning budget, not a measured duration or an online completion rule. |
| Efficient resource use and 7S are suitable teaching context. | DOH Facilitator Guide, PDF pp. 22 and 34; BHW Reference Manual, PDF p. 30 | Keep 7S tied to order, safety and service quality. The manual's 7S is under high-standard client service; 1.9 is an instructional grouping, not a claim of a separately printed chapter. |
| Resource savings must protect essential service. | [WHO climate-resilient and environmentally sustainable health-care facilities](https://www.who.int/teams/environment-climate-change-and-health/climate-change-and-health/country-support/climate-resilient-and-environmentally-sustainable-health-care-facilities) | WHO supports optimizing water and energy and sound waste management while protecting health facilities and communities. Specific local clinical rules need local approval. |
| Hand hygiene and clinical single-use rules are protected. | [WHO hand-hygiene guidelines](https://www.who.int/publications-detail-redirect/9789241597906); [CDC injection safety guidance](https://www.cdc.gov/injection-safety/hcp/clinical-safety/index.html); [CDC lancet guidance](https://www.cdc.gov/injection-safety/hcp/infection-control/) | Do not frame reduced hand hygiene or reuse of single-use needles/lancets as conservation. A local clinical trainer must confirm the exact facility procedure. |
| Vaccine cold-chain power must not be treated as discretionary use. | [CDC vaccine storage and handling guidance](https://www.cdc.gov/pinkbook/hcp/table-of-contents/chapter-5-vaccine-storage-and-handling.html) | Keep vaccine storage equipment powered and monitored under the local program protocol. |

The draft's Elena scenario, 20/100-to-5/100 figures, trial checklist, and three optional practice cards are authored examples. They are **not** observed BHS data, verbatim DOH activities, or TESDA assessment instruments. The legacy 1.9 source has no activity cards. The cards' source-page field points to the background competency and time pages, not to an original card.

The review candidate adds formative checks at inventory, utility safety, normalized comparison and colleague communication. The three lessons now have 2, 2 and 3 checks respectively in both Read and Slides. Each three-option check explains the rejected choices; facilitator answer keys include the additions. The existing `loadReferenceModule` parser/validator passes locally for all three 1.9 lessons. The three optional cards pass `validateActivities`; the three candidate SVGs pass `validateSvgMarkup`. A full repository build and authenticated preview remain pending.

## Protected boundaries

- Do not reduce water or supplies needed for hand hygiene. Repair leaks and follow local procedures.
- Never make needles, lancets or other clinical single-use items reusable. Confirm product instructions and local infection-control policy.
- Do not switch off cold-chain equipment, required ventilation or other critical systems for a saving target.
- Do not delay an urgent referral or accept incorrect or late teaching materials to lower a cost or workload measure.
- Do not use expired stock or an unapproved handout version. Do not include patient names in a resource trial.
- If a proposed saving conflicts with a service or safety requirement, stop the trial and take it to the supervisor.

## Proposed facilitated run sheet - to test, not yet validated

| Lesson | Segment | Minutes |
|---|---|---:|
| resources-audit | Elena case and evidence demonstration | 15 |
| | Individual audit card, pair comparison, feedback and retry | 25 + 10 + 10 |
| resources-safe-change | Safe/unsafe options and local policy check | 15 |
| | Individual decision card, role-play, feedback and retry | 25 + 10 + 10 |
| resources-monitor | Normalized measures and quality check | 10 |
| | Individual trial card, colleague feedback, review and retry | 30 + 10 + 10 |
| **Total** | | **180** |

The three proposed card durations (25, 25, 30 minutes) sit inside these lesson budgets. A card is optional practice. Attendance or participation never creates a competency rating. A facilitator records each learner's observed action, feedback and retry separately using the approved indicator and local procedure.

### Learner timing log to complete at the pilot

Record the date, location, facilitator, language used, number of learners, prior experience, and any accessibility adaptations. For each lesson, write actual start/end times for the explanation, individual card, discussion, feedback and retry; note interruptions separately rather than hiding them in the lesson duration. Count how many learners completed an individual attempt and how many needed a retry. Record any skipped safeguard or rushed observation as a quality failure, even if the clock target was met.

| Lesson | Planned | Actual active minutes | Individual attempts / learners | Retries | Safety or service concern | Revision decision |
|---|---:|---:|---|---|---|---|
| resources-audit | 60 | Pending | Pending | Pending | Pending | Pending |
| resources-safe-change | 60 | Pending | Pending | Pending | Pending | Pending |
| resources-monitor | 60 | Pending | Pending | Pending | Pending | Pending |

The facilitator and Filipino-language reviewer should discuss where instructions or terms caused delay. Keep the 180-minute plan only if a real group can complete the tasks, feedback and individual observations without omitting safety or service-quality checks. Otherwise revise the sequence or propose a documented time change before release.

## Human review fields

| Gate | Reviewer, role and date | Evidence and required decision |
|---|---|---|
| Facilitator | Pending | Read, Slides, guides, questions, cards, printed worksheets, 60-minute lesson plans and individual observation cues; approve or request changes. |
| Filipino-language | Pending | Natural Filipino, clear BHS terms, parity with English, pronunciation for later narration; approve or request changes. |
| Clinical/local policy | Pending | Hand hygiene, single-use, cold chain, waste segregation, urgent referral and document control against local protocol; approve or request changes. |
| Visuals | Pending | Approve final bilingual resource-audit, safe-change and normalized-tracker diagrams and their alt text; check mobile and print legibility. Candidate art is not yet approved or attached to lessons. |
| Learner timing | Pending | Run all three lessons with a real learner group. Log per-segment start/end, group size, completion, questions, retries, quality failures and deviations. Revise until each lesson can be facilitated within its tested allocation without rushing observation. |

## Release check after signoff

1. Record names, dates, findings and approved final revisions above. Resolve every safety and language issue; replace proposed minutes with measured results.
2. Move the **complete** reviewed 1.9 module (all three bilingual lessons, facilitator guides, competency definitions, visuals, approved cards and source metadata) into `content/training/day1-basic-competencies/modules/09-sustainable-practices`. Keep the draft as review history until the team decides its retention.
3. Run the established content parser/validator and `training:load` dry run. Compare the complete generated module and lesson revisions with the review decisions.
4. Create 1.9 through the existing course and lesson loader only after the authored module passes. Record the returned module ID in `locks/ltzicxyefizxoqhfuuzc.json`; do not invent an ID or insert a placeholder row.
5. Review immutable lesson revisions, then use the established reviewed publish flow. Verify signed-in learner Read/Slides/practice and facilitator guide, activities, observation and print views; verify a historical certified learner remains unaffected.

No database load, publish action, course-lock change, or authenticated learner/facilitator view test is claimed by this review-ready draft.

