# BHW Reference Manual Training — implementation plan

Prepared 24 September 2026. Status: ready for implementation review; implementation is not authorized by this document. No repository, database, or live course changes were made.

## 1. Outcome and scope

Present **BHW Reference Manual Training** as one learner-facing course, organized as **Chapter → Subchapter → Lesson**. Convert the existing nine “modules” into the nine subchapters of Chapter I. Divide their material into 42 independently resumable lessons. Give Slides a deliberately authored visual presentation of the same learning objectives, rather than paginating the Read paragraphs. Add purposeful illustrations, diagrams, and annotated examples.

This release plans the full course container and Chapter I in detail. Chapters II and III receive their source-based titles and “Not yet available” states; they are not invented or treated as completed content. Their detailed authoring is a later increment.

The 42-lesson map is a design decision, not a claim that the manual contains 42 lessons. Lesson time estimates are initial pacing targets, not validated training durations or substitutes for supervised practice.

## 2. Evidence and source hierarchy

Repository baseline inspected: `main`, commit `870a5845897c390b0a114b513477cc85b1c0fddb` (21 September 2026). Rebase and compare with the other conversation’s work before implementation; this snapshot contains authored training folders 01–05, not 06–09.

Sources:

- [Reference Manual transcription](https://github.com/jongsky25/BHW-Connect-Phase-2/blob/main/docs/source-material/day1-basic-competencies/bhw-reference-manual.md): chapter hierarchy and substantive topics.
- [Facilitator Guide transcription](https://github.com/jongsky25/BHW-Connect-Phase-2/blob/main/docs/source-material/day1-basic-competencies/facilitator-guide.md): competencies, outcomes, activities, observation, and training allocations.
- [Day 1 presentation transcription](https://github.com/jongsky25/BHW-Connect-Phase-2/blob/main/docs/source-material/day1-basic-competencies/day1-part1-presentation.md): existing teaching sequence and coverage.
- [Source inventory](https://github.com/jongsky25/BHW-Connect-Phase-2/blob/main/docs/source-material/day1-basic-competencies/README.md): provenance, source crosswalk, limitations, and original PDF links.
- [Existing content](https://github.com/jongsky25/BHW-Connect-Phase-2/tree/main/content/training/day1-basic-competencies/modules): lessons 01–05 and their coverage records.
- [Content contract](https://github.com/jongsky25/BHW-Connect-Phase-2/blob/main/content/training/README.md), [style guide](https://github.com/jongsky25/BHW-Connect-Phase-2/blob/main/docs/training-content-style-guide.md), and [delivery plan](https://github.com/jongsky25/BHW-Connect-Phase-2/blob/main/docs/training-modules-plan.md): existing implementation and authoring rules.

Use the reference manual for the visible chapter hierarchy, the facilitator guide for competency mapping, and the presentation as a coverage cross-check. The original PDFs prevail over transcription when available. Existing approved content remains the starting material; source discrepancies must be recorded rather than silently carried forward.

All page references below mean **PDF page number**, matching `## Page N` in the transcriptions, not the printed footer. Some inventory page descriptions and deck slide references are inconsistent; resolve them against the originals instead of propagating guesses.

The original [Reference Manual PDF](https://drive.google.com/file/d/13auqmQNRLevwxTm3lkMRHX13U1_d0TYs/view) and [Facilitator Guide PDF](https://drive.google.com/file/d/1FJNtduA8gDDDvW3WtNR5f-ai4f0izD0W/view) could not be opened through the available web tool. The Reference Manual was subsequently supplied locally on 24 September 2026 (150 pages). Its contents page and complete PDF pages 19–23 were visually inspected, verifying the communication graphic, Five Why’s example, prioritization matrix and both pages of the hazard table. The 126-page Facilitator Guide was subsequently supplied locally; PDF pages 16–30 were visually inspected. The 78-page Day 1 presentation was also supplied locally and checked; all three original PDFs are now available. See section 15 for corrected deck page references and remaining authoring checks. Other source artwork has not yet been visually verified.

## 3. Course hierarchy and terminology

| Level | Learner presentation | Implementation decision |
|---|---|---|
| Course | BHW Reference Manual Training | New parent curriculum record; preserve existing delivery records underneath |
| Chapter I | Ang BHWs at ang Kanilang Barangay | Basic competencies; current nine parts |
| Chapter II | Ang BHWs bilang First Responder | Common competencies; unavailable until authored and approved |
| Chapter III | Ang BHW bilang Tagapagsulong ng Primary Care | Core competencies; unavailable until authored and approved |
| Subchapter | 1.1–1.9, titles below | Retain existing module identities, relabel learner UI |
| Lesson | 1.1.1, 1.1.2, etc. | New stable lesson identities and completion records |

Do not display “Day 1” as the overall course title or promise that Chapter I takes a single day. The facilitator table on PDF page 19 assigns 37 hours to the nine basic competencies. Its suggested three-day and five-day schedules on PDF pages 16–17 cover basic, common and core topics together; they are different planning representations and must not be presented as equivalent to the 37-hour basic-competency allocation. It also has a source discrepancy for Tungkulin: the table lists six hours, while the narrative says at least three. Preserve that discrepancy in facilitator notes.

The manual’s headings and the nine competency groupings differ. Keep nine subchapters for continuity: policies are split into 1.2–1.4; relationships, teamwork, and self-management form 1.5 with explicit lesson boundaries; sustainable practices become 1.9 as the ninth competency. Add a facilitator-only source crosswalk, not a claim that the manual prints these exact nine headings.

## 4. Chapter I lesson map

Every lesson receives one or two observable objectives, one short application/check with explanatory feedback, and a takeaway. The outcome column below is the primary objective and defines that check. Existing checks may be reused after review. Self-check results do not become certification scores.

R = Reference Manual PDF; F = Facilitator Guide PDF. Coverage markers refer to existing `coverage.json` concepts and must remain stable. New 06–09 markers are proposed; reconcile with the other author’s branch before assigning them.

### 1.1 Ang mga Tungkulin ng BHW — existing 01-tungkulin-ng-bhw

Competency: Participate in workplace communication. Primary sources R11–12, F19–20. Six lessons, each initially 3–7 minutes plus any facilitated activity.

| Lesson | Outcome and Read scope | Visual / slide treatment | Coverage |
|---|---|---|---|
| 1.1.1 Ang BHW at ang HEPO | Explain how education, organizing, and service fit the BHW role; introduce Marites’s day and needed knowledge | Three illustrated situations and an overview of the roles | m1.uhc.shift, m1.uhc.organizing, m1.hepo.umbrella, m1.hepo.knowledge |
| 1.1.2 Bilang Health Educator | Identify education appropriate to different community groups and life stages | Household scenes across life stages; classify an example | m1.role.educator, m1.educator.lifestages, m1.educator.allsectors |
| 1.1.3 Bilang Community Organizer | Describe how to encourage participation and bring observations into local planning | People-and-action sequence; simple barangay-to-LIPH link | m1.role.organizer, m1.organizer.participation, m1.organizer.planningteam, m1.organizer.liph |
| 1.1.4 Bilang Health Service Provider | Identify appropriate assistance, guidance, and follow-up within trained/supervised responsibilities | Resident → BHW → health team → follow-up sequence | m1.role.provider, m1.provider.firstcontact, m1.provider.guide, m1.provider.initialservices, m1.provider.monitoring |
| 1.1.5 Mga talaan at impormasyon | Match household profile, master list, registry, and assigned forms to their purposes; convey relevant information accurately | Four fictional document thumbnails with a single highlighted field each | m1.provider.records, m1.provider.documents; documentation outcome in m1.competency |
| 1.1.6 Gamitin ang mga tungkulin | Choose and explain the roles needed in a situation, follow a workplace instruction, and give a short handover | One scenario unfolding into three actions; recap linking later chapters | m1.competency, m1.skills.crossref; application of prior role markers |

Retain the existing named scenario and practices but place each next to its related lesson. Move the “deep” LIPH elaboration beside 1.1.3, not at the end of the entire subchapter. Do not turn the diagram’s HEPO umbrella metaphor into an unsupported formal organizational hierarchy.

### 1.2 Ang UHC Act — existing 02-uhc-act

Competency: Contribute to workplace innovation. Sources R13, F21.

| Lesson | Outcome and Read scope | Visual / slide treatment | Coverage |
|---|---|---|---|
| 1.2.1 Layunin at saklaw ng UHC | Explain the law’s purpose and coverage direction without promising every service is free | Resident’s question followed by a plain-language purpose card | m2.enactment, m2.philhealth |
| 1.2.2 Primary care at paglapit sa serbisyo | Describe outpatient care and the primary-care entry point, with locally verified service information | Entry-point pathway and “confirm locally” service details | m2.outpatient, m2.primary-care-provider |
| 1.2.3 Magkakaugnay na serbisyo | Explain referral, integrated programs, and the health board’s role | Progressive network; keep governance distinct from clinical referral | m2.referral-system, m2.program-integration, m2.health-board |
| 1.2.4 Mungkahi mula sa barangay | Identify an improvement, discuss it with colleagues, and propose a feasible first action | Observe → discuss → propose → try sequence | m2.bhw-skill, m2.health-promotion, m2.competency; HEPO cross-reference to 1.1 |

### 1.3 Mga Polisiya sa BHS — existing 03-polisiya-bhs

Competency: Practice entrepreneurial skills in the workplace. Sources R14, F22. Keep distinct policies in distinct lessons rather than combining breastfeeding and plastics into one reading block.

| Lesson | Outcome and Read scope | Visual / slide treatment | Coverage |
|---|---|---|---|
| 1.3.1 Milk Code | Recognize a policy-related promotional situation and select an appropriate response | Fictional visitor/product-promotion scenario, no real brand | m3.milk-code |
| 1.3.2 Suporta sa breastfeeding | Identify the workplace support described in the source | Annotated supportive BHS setting | m3.breastfeeding-act |
| 1.3.3 Promosyon ng gamot | Recognize conflicts arising from promotion and explain a policy-based response | Offer → decision → explanation storyboard | m3.pharma-ban |
| 1.3.4 Patakarang pangkapaligiran | Identify policy-relevant disposable materials and suitable alternatives | Object comparisons, clearly labelled | m3.plastics-ban |
| 1.3.5 Praktikal at matipid na operasyon | Propose and explain an efficient workplace practice without compromising care | Small before/after workflow and a spoken-response exercise | m3.other-topics, m3.competency |

### 1.4 Mga Karapatan at Benepisyo ng BHW — existing 04-ra7883

Competency: Develop life and career decisions. Sources R13, F23–25. Dates, eligibility and benefits require current official verification during content authoring; this plan does not certify their current legal accuracy.

| Lesson | Outcome and Read scope | Visual / slide treatment | Coverage |
|---|---|---|---|
| 1.4.1 Katayuan at akreditasyon | Distinguish training, accreditation, and registration | Three clearly distinguished terms and a source-grounded pathway | m4.legal-basis, m4.registration-requirement, m4.bhw-cap |
| 1.4.2 Sino ang responsable? | Identify the board/committee responsibilities and where to ask about an application | Application pathway with responsible bodies; expanded duties in Read | m4.accreditation-body, m4.board-duties, m4.registration-committee |
| 1.4.3 Mga benepisyo at kondisyon | Match benefit categories to their relevant conditions and inquiry points | Benefit cards; conditions visible alongside, not hidden in notes | m4.benefits |
| 1.4.4 Eligibility at pag-unlad | Distinguish BHWE from general accreditation and identify a next development step | Comparison and self-review checklist | m4.bhwe |
| 1.4.5 Kalmadong pag-follow-up | Demonstrate reflection, a clear inquiry, and constructive self-regulation | Josie’s follow-up dialogue and an opportunity to rehearse | m4.competency |

### 1.5 Ang BHW at ang Kanyang Barangay — existing 05-bhw-at-barangay

Competency: Work in a team environment. Sources R15–18, F26–27.

| Lesson | Outcome and Read scope | Visual / slide treatment | Coverage |
|---|---|---|---|
| 1.5.1 Mga ugnayan sa komunidad | Choose the kind of support needed in a barangay situation | Four relationships around a BHW, introduced one at a time | m5.four-relationships |
| 1.5.2 Mga katuwang sa barangay | Distinguish barangay partners’ responsibilities | People-and-responsibility cards | m5.stakeholders-barangay |
| 1.5.3 Health team at ibang katuwang | Identify technical and other support; distinguish referral from governance | Layered partner map with separate relationship types | m5.stakeholders-city, m5.stakeholders-other |
| 1.5.4 Maayos na teamwork | Allocate roles and respond constructively to a team difficulty | Purok assignment board and team dialogue | m5.teamwork-practices, m5.competency |
| 1.5.5 Pamamahala sa sarili | Recognize and apply the six self-management skills | Short situations grouped by skill rather than a dense list | m5.self-management-skills |
| 1.5.6 Plano para sa sariling gawain | Make a realistic weekly plan and explain a SMART goal | Fictional weekly planner filled progressively | m5.self-management-improve; applied m5.competency |

Team practice follows F27, with accessible adaptations to the suggested games. Participation must not require unwanted disclosure of personal problems. Read completion and demonstration of teamwork are separate records.

### 1.6 Epektibong Pakikipagkomunikasyon — align with incoming 06

Competency: Present relevant information. Sources R18–19, F28; health-promotion cross-reference in Chapter III. Outcomes below cover gathering, assessing, recording, and presenting information, not just polite conversation.

| Lesson | Outcome / proposed coverage | Visual / activity |
|---|---|---|
| 1.6.1 Makinig nang may respeto | Demonstrate attentive, unhurried listening in an appropriate setting | Paired listening scenes; role-play |
| 1.6.2 Magtanong at maglinaw | Use open questions and clarify an ambiguous answer | Closed/open question comparison; rewrite a question |
| 1.6.3 Empathy at malinaw na paliwanag | Explain respectfully and check the listener’s understanding | Short dialogue sequence; teach-back exercise as an instructional addition |
| 1.6.4 Suriin at itala ang impormasyon | Separate observed information from assumptions and record it accurately | Fictional interview-to-record example |
| 1.6.5 Ibahagi ang mahalagang impormasyon | Present a concise account and identify the appropriate recipient | Handover practice; facilitator observation |

### 1.7 Pagkilala sa Problema at Pagpaplano ng Solusyon — align with incoming 07

Competency: Solve or address general workplace problems. Sources R19–21, F29 and the separately transcribed Kwento ni Rosario. The worked tables on PDF pages 20–21 have now been visually inspected. Redraw them progressively rather than placing a full-page table on a slide. The Five Why’s example repeats “Pagtatae” in its first possible-cause column; flag this source ambiguity during authoring rather than silently treating it as a clean linear causal chain.

| Lesson | Outcome / proposed coverage | Visual / activity |
|---|---|---|
| 1.7.1 Linawin ang problema | State a problem using observations and community perspectives | Situation → evidence → problem statement |
| 1.7.2 Hanapin ang mga sanhi | Use Five Why’s and recognize social factors without assuming every problem has one cause | Branchable cause chain; Rosario discussion |
| 1.7.3 Piliin ang uunahin | Compare magnitude, seriousness, feasibility, and urgency using the source’s scoring method | Worked matrix revealed row by row |
| 1.7.4 Magplano ng aksyon | Recommend an activity with responsibility, resources, and a way to review it | Small action-plan template; group presentation |

### 1.8 Occupational Safety and Health — align with incoming 08

Competency: Practice OSH policies and procedures. Sources R21–23, F30. The original hazard table on PDF pages 22–23 (printed pages 14–15) is now visually verified. It covers five groups: needlestick injuries; infection exposure; muscle discomfort/pain; stress associated with long voluntary work; and work-related accidents. Cover both pages, including the latter two groups omitted from the earlier page-range assumption.

| Lesson | Outcome / proposed coverage | Visual / activity |
|---|---|---|
| 1.8.1 Kilalanin ang panganib | Identify hazards in a BHW setting | Hazard-recognition scenes covering all five verified source groups |
| 1.8.2 Panganib at proteksyon | Match each source hazard to appropriate prevention/control | Five hazard–control pairs, including workload boundaries and fieldwork risks; no invented clinical steps |
| 1.8.3 Paghahanda sa ligtas na gawain | Identify required preparation and relevant local procedure | Before-work checklist; supervisor-guided discussion |
| 1.8.4 Ipakita ang ligtas na paraan | Demonstrate selected approved practices and identify when help is needed | Demonstration storyboard and facilitator rubric |

### 1.9 Napapanatiling mga Gawi sa Trabaho — align with incoming 09

Competency: Exercise efficient and effective sustainable practices in the workplace. Source F19 competency table, related F22 resource-use guidance and R14 environmental policy. This is a proposed instructional expansion of the ninth competency, not a standalone manual chapter. Verify detailed outcomes against the cited TESDA source before authoring.

| Lesson | Outcome / proposed coverage | Visual / activity |
|---|---|---|
| 1.9.1 Saan nasasayang ang resources? | Identify avoidable use of water, electricity, and materials | Simple workplace audit scene |
| 1.9.2 Pumili ng ligtas na pagbabago | Choose feasible resource-saving practices consistent with safety | Option comparison; never imply unsafe reuse of supplies |
| 1.9.3 Subukan at subaybayan | Make a small improvement plan and compare results | Before/after tracker |

Boundary: 1.3 teaches the policy and workplace expectations; 1.9 applies an ongoing improvement cycle. Cross-link rather than repeat the full policy explanations.

## 5. Read, Slides, images, and facilitation contracts

Read is connected Filipino-first explanation, concrete examples, short labelled sections, and optional deeper detail. Each lesson has 1–2 objectives. Subchapter objectives and competency observation retain their broader scope; do not force the current 3–4-objective validator onto every short lesson. English must be equivalent in meaning and coverage.

Slides use dedicated authored text and layout, while sharing concept IDs and sources with Read. Allowed initial layouts: scene, annotated illustration, comparison, process, relationship map, decision/check, and takeaway. Start with 4–7 slides per lesson and usually no more than 35–45 visible words per explanatory slide; these are review thresholds, not reasons to omit essential conditions. One message per slide. Do not shrink text to meet a count. An occasional split is preferable to a crowded slide. Checks may need more words and must remain readable.

Each required concept must be taught in both Read and Slides, including necessary exceptions and conditions. Optional “Read more” cannot be the only location of an assessed concept. One Read section may map to multiple slides. Switching modes opens the corresponding concept; it must not rely on matching array indexes.

Images must have a defined learning purpose, Filipino and English alt text, a source/licence or generation provenance record, caption, and review status. Use a consistent Philippine barangay setting without stereotyping. No real patient records, identifiable patients without permission, or product endorsements. Keep labels as live text where feasible. Use SVG for simple diagrams and responsive compressed raster images for scenes. Reuse reviewed characters and settings across lessons. Do not generate images during this planning task.

Each lesson’s facilitator entry contains the linked objective, discussion prompt, activity, materials, misconception, answer rationale, and observable outcome. Optional group activities have solo equivalents where meaningful. Watching a slide is not evidence of practical competence.

Narration: retain Read narration only for the exact matching Read revision. Author slide narration separately from slide labels; never reuse sentence timing against different text. Neither audio nor animation is required to understand essential content. Provide static/reduced-motion forms. New slides may launch without audio until reviewed slide scripts and timing assets are ready.

## 6. Sample subchapter 1.1 storyboard

Read outlines and visuals for all six lessons are defined in section 4. The following gives the slide sequence for each; wording is draft presentation copy to be checked against the final content, not a new source of factual authority.

| Lesson | Slide sequence | Check / facilitator evidence |
|---|---|---|
| 1.1.1 | (1) “Isang umaga, maraming gawain” — Marites in three scenes. (2) “Kasama ang pagtuturo at pag-oorganisa” — show actions. (3) “Health Education and Promotion Officer” — explain the term visually. (4) Show three connected roles. (5) “Aling papel ang nakikita mo?” — classify a scene. | Learner explains why the role extends beyond service assistance; facilitator asks for a personal example. |
| 1.1.2 | (1) Household teaching scene. (2) Body and environment as related teaching subjects. (3) Different life stages, different information needs. (4) Choose the appropriate audience/example. (5) One-sentence takeaway. | Identify an education action and describe who it serves; demonstrate a brief appropriate explanation. |
| 1.1.3 | (1) Community clean-up planning scene. (2) Connect residents and local partners. (3) Invite participation with a clear action. (4) Bring observations into barangay planning. (5) Show the LIPH connection in plain language. (6) Choose an organizing action. | Learner names partners and a practical invitation; facilitator checks that participation and planning are both represented. |
| 1.1.4 | (1) A resident asks where to seek a service. (2) BHW as an initial contact. (3) Assistance within assigned training and supervision. (4) Guide to the appropriate health worker. (5) Follow-up closes the loop. (6) Select the next action. | Explain the assistance and referral boundary; no unsourced treatment demonstration. |
| 1.1.5 | (1) “Saan ginagamit ang tala?” (2) Household profile. (3) Master list versus registry. (4) Assigned form and recipient. (5) Match a task to a record. (6) Accuracy supports the next action. | Using fictional information, complete or explain one simple record and who receives it. |
| 1.1.6 | (1) One barangay observation. (2) Decide how to educate. (3) Decide whom to organize. (4) Identify service/recording support. (5) Rehearse a short handover following an instruction. (6) Recap and links to later learning. | Learner gives reasons, follows the instruction and communicates relevant information. Facilitator records demonstrated outcomes separately. |

Asset briefs for the sample:

| Asset | Must show | Avoid / verification |
|---|---|---|
| A01 Marites scene set | Teaching, community planning, and guiding a resident; consistent adult BHW character and barangay setting | No diagnosis or implied independent clinical authority; three reusable scenes |
| A02 Roles overview | Three roles connected to the BHW’s broader health-promotion function | Do not imply three exclusive jobs or an official chain of command |
| A03 Life-stage scenes | Different audiences and suitable learning contexts | Avoid dense health advice embedded in image |
| A04 Organizing sequence | Observation, partners, participation, planning contribution | LIPH link must be explained in adjacent text |
| A05 Service pathway | Initial contact, appropriate health-team guidance, follow-up | Referral arrows cannot imply everyone must follow one rigid clinical route |
| A06 Record examples | Four fictional document types with legible illustrative fields | Mark as learning examples, not official forms or patient records |
| A07 Applied scenario | Reuse A01 setting with a new decision point | Keep feedback separate until the learner responds |

Sample visual approval criteria: readable on a 360px-wide phone at normal size; no tiny embedded labels; source-matched meaning; recognizable setting; equivalent alt text; essential content understandable with images unavailable.

## 7. Technical design

### Preserve existing identities through an additive hierarchy

Recommended design: keep the existing `courses` row as **Chapter I’s delivery/assessment record**, because enrollment, tests, progress, assessments, and certificates already reference it. Add a parent curriculum table (`training_programs`) and mapping (`training_program_chapters`) for the learner-facing full course. This is an internal compatibility choice; the learner sees Course → Chapter → Subchapter → Lesson throughout.

Proposed tables:

- `training_programs`: UUID, stable content key, org scope, bilingual title/description, status, author and timestamps.
- `training_program_chapters`: UUID, program FK, stable chapter key, position, bilingual title, nullable unique existing-course FK, availability. Chapters II/III initially have no delivery course and are unavailable.
- `course_lessons`: UUID, module FK, stable lesson key unique within that module, position, bilingual titles/objectives, required flag, version, published revision pointer.
- `course_lesson_revisions`: immutable lesson revision, bilingual Read and Slides data, concept coverage, content hash and asset references. Staged revisions are invisible to learners until promoted.
- `course_lesson_progress`: learner FK + lesson FK, completion time, completion basis (`learner` or `legacy_equivalence`), content revision at completion. Uniqueness prevents duplicate completions.
- `course_lesson_resume`: learner + lesson, modality, stable section/slide key and concept ID, updated time. Resume is independent of completion.
- Restricted facilitator lesson notes, keyed to lesson revision; do not embed them in learner-readable JSON.

Use UUID relationships, foreign keys and unique ordering constraints. Stable authored keys are immutable and independent of display numbering. Do not rename the current module folders or discard project lock mappings: the inspected loader keys identities on those folder names.

Existing `course_modules` become subchapter records in this program; generic e-learning courses continue to use their original UI and behavior. New hierarchy rendering is enabled only for mapped programs with published lesson revisions.

### Content format and loader

Retain `content/training/day1-basic-competencies/` and the current module IDs during this release. Add a program manifest and chapter mapping, then a `lessons/` folder inside each existing module. Each lesson has a manifest, Filipino and English Read files, slide JSON, and facilitator files. Coverage stays attached to the subchapter but each concept names its owning lesson and both presentation locations.

A slide needs: stable ID, layout type, concept IDs, bilingual heading and short display text, asset reference, optional check, optional narration script. Read sections also gain stable IDs. Assets are referenced by stable IDs rather than positional numbers alone.

Loader requirements:

- Preserve all existing course/module UUIDs and lock entries; extend locks for lesson IDs.
- Validate all files before writes: source references, unique keys, bilingual parity, Read/Slides coverage, asset existence, alt text, facilitator mapping and unknown references.
- Stage revisions first, then atomically promote the complete selected subchapter after validation; an interrupted load cannot expose half-new content.
- Dry-run lists creates, updates, promotion targets and legacy progress mappings. A second identical run makes no content or progress changes.
- Lesson/subchapter-scoped loads must not rewrite unrelated course metadata, question banks or KB entries. The current `--modules` path still synchronizes course and test questions: fix this explicitly.
- Add explicit modes for hierarchy, selected content, assessments and KB synchronization. No implicit deletion of removed assets, lessons or questions.
- For identity conflicts or stale locks, fail with a reconciliation report; do not silently create a replacement for a record with learner history.

### UI flow

Course landing → Chapter I → expandable list of nine subchapters → lesson list with estimated time and completion → lesson reader. Show “Lesson 2 of 6” within the selected subchapter. Use Previous/Next and a compact progress indicator instead of dozens of pagination dots. Provide a return-to-subchapter link.

“Continue learning” opens the most recently active incomplete lesson, otherwise the first incomplete required lesson in the released chapter. If the chapter is complete, show review options and assessment status. Allow revisiting completed lessons. Unavailable chapters are labelled and do not open empty pages.

Read/Slides switch maps through stable concept IDs; returning to a mode restores its last matching position. If no exact match exists, open the containing lesson’s relevant first concept. No mode switching resets completion. Learners explicitly mark a lesson finished; merely viewing all slides does not mark competency achieved.

Display chapter progress as completed required lessons / released required lessons. Display whole-course availability separately (“Chapter I available; Chapters II–III coming later”), never “100% of the manual” after Chapter I. Do not create a full-manual certificate in this increment.

## 8. Progress, tests, and migration

Chapter I’s existing pre/post-test bank, sessions, attempts and assessor relationships remain linked to their original delivery-course UUID. Their UI labels become “Chapter I pretest/posttest”. Preserve existing scoring and attempt limits. A revised question bank must be versioned; historical questions/answers cannot be overwritten in place or compared as if the bank were unchanged.

For each completed old subchapter, map completion to the equivalent new required lessons only after the coverage map confirms equivalence. Store `legacy_equivalence`, migration batch, old completion time, and source module. This acknowledges prior completion; it is not a claim the learner clicked through the new lessons. New substantive requirements require a separately identified update, not fabricated completion.

For incomplete old subchapters, preserve the old row and any available resume state. Map a saved section to its new lesson/concept if possible. Never infer completed lessons from a read position alone. If no usable position exists, begin the first lesson without altering previously earned completion elsewhere.

New lesson completion uses a transactional RPC: verify access → upsert lesson completion → aggregate required lesson completion to the existing module-progress row → invoke the same Chapter I completion transition once all required subchapters qualify. Prevent the old whole-module completion RPC from bypassing required lessons for migrated subchapters. Legacy unmapped courses retain existing behavior.

Keep historic certificates and assessments intact. Clearly identify their original Chapter I scope in the new presentation. Adding future chapters must not revoke Chapter I achievements or silently turn them into a full-manual award. Chapter II/III will get their own delivery/assessment records when authored.

Migration rehearsal must report counts and IDs before/after for courses, modules, learners, completed modules, sessions, test attempts, assessments and certificates; compare these against expected mappings. No account reset or progress reset is part of this release.

Access: learner progress is writable only for self through validated RPCs; content access follows existing org and publication boundaries; facilitator notes remain assessor/admin-only; facilitator reporting keeps session ownership and organizational scope rules. Test both ownership and org-cascade cases with real RLS, not just client UI filters.

## 9. Audio, assets, density, and accessibility

Existing audio is keyed by module and section index. New audio uses lesson revision + stable section/slide ID + modality + language + content hash. Never reinterpret an old index after splitting content. Keep legacy assets for old views until cutover; regenerate only changed narration. Test stale hashes, mode switching, seeking, reduced motion and missing audio.

Existing short/normal/long density may select optional examples and practice, but every required objective and assessment concept must remain available in every supported path. Do not use “short” as a silent waiver of required lessons. Place enrichment within its relevant lesson. Store completion policy explicitly and keep it identical between Read and Slides.

Keep the current route-performance budget from the delivery plan as a release constraint. Lazy-load later lesson images and audio; avoid downloading a whole chapter on entry. Set explicit image dimensions and responsive sizes. Verify text reflow, keyboard operation, focus on slide change, 200% text zoom, contrast, screen-reader order, alt text and usable fallback with failed images. Automated accessibility checks supplement manual mobile checks.

## 10. Implementation work packages and acceptance

| Order | Work package | Main files / surfaces | Done when |
|---|---|---|---|
| 0 | Reconcile source and concurrent work | source-material, incoming 06–09 branch, coverage records | Approved concept-to-lesson map; original-image gaps flagged; no competing edits |
| 1 | Approve sample 1.1 | six lesson outlines, storyboards and A01–A07 previews | User accepts pacing, text density and visual treatment before full asset production |
| 2 | Add hierarchy, revisions and progress | new Supabase migration; `src/lib/elearning/types.ts`; progress RPCs | Migration replay/RLS tests pass; backfill is idempotent; old records preserved |
| 3 | Extend authoring/parser/loader | `scripts/lib/training-content.mjs`, tests; `scripts/training-load.mjs`; `content/training/README.md` | Both presentations validated; targeted load isolation; staged promotion; duplicate-free reruns |
| 4 | Build course and lesson navigation | `src/app/courses/[id]/page.tsx`; `course-detail.tsx`; program landing and lesson components | Correct labels, resume, unavailable chapters and meaningful progress on mobile |
| 5 | Build distinct Slides and media | `lesson-slides.tsx`, `lesson-module.tsx`; new slide layouts; narration/types | No Read paragraph reuse as slide body; concept-based mode switch; accessible static fallback |
| 6 | Convert 1.1 then 1.2–1.5 | existing module folders, visuals, competency and facilitator notes | Complete source coverage and content review for each subchapter; scoped loads only |
| 7 | Integrate 1.6–1.9 | incoming authored material plus new lesson manifests | No lost objectives; source dependencies resolved; boundaries with 1.3 and 1.5 checked |
| 8 | Update facilitator/reporting/KB | facilitator-module-view, training-session-detail, assessment views; Q&A links | Same learners and access scope; accurate Chapter I labels; stable KB identities |
| 9 | Rehearse and release | test project then named pilot project | Checks below pass; concrete preview and migration report reviewed before publication |

Run packages sequentially where they change shared contracts. The current author of 06–09 can finish subject content, but the integration owner must reconcile the latest branch and reserve shared schema, loader, question-bank, lock and renderer edits. No message has been sent to the other conversation, and no changes have been requested there as part of this plan.

Acceptance checks:

1. Every non-excluded coverage concept in 01–05 is mapped to a lesson and taught in both modalities; 06–09 receive the same validated coverage contract.
2. Each lesson has an observable outcome, coherent stopping point, useful feedback, and source links. No essential qualification is only in a hidden note.
3. New, partially complete, completed and certified learners retain correct history after migration; no Chapter I achievement is represented as full-course certification.
4. An interrupted or repeated load cannot duplicate records, change an unrelated test bank, or expose a partial revision.
5. BHW, assessor, admin, out-of-org and unauthenticated access scenarios pass real database tests. A BHW cannot fetch facilitator answer material.
6. Read/Slides/language switches and reloads preserve the appropriate lesson position and completion. Reordering slides does not attach stale audio or progress to another concept.
7. Chapter I pretest → lessons → posttest → facilitator results works for enrolled and solo learners; legacy generic courses still work.
8. Mobile visual QA, keyboard and screen-reader checks pass; no horizontal clipping or long unreadable slide paragraphs; media failure retains essential meaning.
9. Run repository lint, typecheck, unit tests and production build, plus focused Playwright and axe checks. Test migration/RLS on a replayed database and live test environment; label any unexecuted checks explicitly.

## 11. Release and rollback

Use additive migrations and an opt-in program/lesson experience. Stage content in the test project, verify 1.1, then convert other subchapters in small reviewed batches. Do not publish Chapters II–III as available until their own content and assessment plans are approved.

Before pilot promotion, produce a before/after preview, scoped loader dry-run, equivalence/backfill report and test results. Capture existing lock mappings and an authorized database snapshot. Publication and pilot writes are later implementation steps, not authorized by this planning request.

Rollback switches the affected program to the legacy reader or prior published lesson revision; it does not delete new progress or undo historical completions. Retain old module payloads and audio while the new experience is piloted. Reconcile progress created during the pilot through the same aggregation rules. Avoid destructive schema rollback.

## 12. Dependencies and settled defaults

Settled proposed defaults: nine Chapter I subchapters; 42 short lessons; Filipino-first with English parity; one shared completion per lesson across modes; Chapter I assessment scope; unchanged historical achievements; a parent course with unavailable later chapters; scoped staged publication; no simultaneous editing of shared contracts.

Reference Manual source gaps for the communication graphic, Five Why’s/prioritization tables and hazard table are resolved by visual inspection of the supplied PDF. The hazard table extends through PDF page 23, correcting the prior R21–22 reference. Source-image verification no longer blocks defining 1.8’s five hazard groups; current procedural accuracy and final visual review remain required. The Facilitator Guide original is now verified for PDF pages 16–30, including its three-role health-promotion illustration on PDF page 20. The Day 1 presentation original has now been checked, including its three-role graphic (PDF page 7), HEPO text (page 8), communication comparison (page 56), and Five Why’s table (page 62). Use the corrected page crosswalk in section 15. Do not assume the reference manual contains every image mentioned in the combined source inventory.

During authoring, verify legal, benefit, service-access and procedural claims against current official DOH/PhilHealth/CSC/TESDA sources and the applicable local implementation. The 2022 manual is the curriculum base, not proof every operational detail remains current. Record corrections separately from restructuring so the user can review them. This plan deliberately specifies the verification work instead of asserting those claims are already verified.

Update the style guide and delivery plan to remove stale references to the former four-relationship Module 1, the old eight-module mapping, and identical Read/Slides bodies. New terminology and per-lesson objective rules supersede those old examples only after this plan is approved for implementation.

Planning is complete at the architecture, lesson-boundary, storyboard, work-package and acceptance-criteria level. Final teaching copy, produced images, source-image verification, implementation, testing and deployment remain execution work.


## 13. Supplied Reference Manual verification — 24 September 2026

Inspected PDF page 7 (contents) and complete PDF pages 19–23, plus the following notes page. The three-chapter hierarchy is confirmed. Printed page numbers and the contents page are not sufficiently reliable for locating every topic; implementation citations should include PDF page numbers.

- Lesson 1.6.2: PDF 19 contains three open/closed question pairs. Adapt them into separate readable comparison slides with a practice question; do not use the whole table as a small screenshot.
- Lesson 1.7.2: PDF 20 contains a worked child-death/diarrhoea example with multiple possible causes. Preserve the distinction between an illustrative analysis and a verified causal finding; review the repeated entry before adapting.
- Lesson 1.7.3: PDF 21 has six candidate problems with four scoring criteria. The displayed totals (16, 17, 19, 15, 12, 10) agree with the row sums, and rankings agree with those totals. These are the example’s scores, not universal priority rankings. Present one row at a time before showing the comparison.
- Lessons 1.8.1–1.8.4: PDF 22–23 contains five hazard groups. Include stress/workload boundaries and fieldwork accidents alongside sharps, infection exposure and muscular discomfort. Give each group a distinct visual example and retain the source’s prevention/reporting dimension. Current clinical/procedural validation remains part of authoring.

This was a targeted source verification, not a full clinical review of all 150 pages. No application or repository content was changed.


## 14. Supplied Facilitator Guide verification — 24 September 2026

The original has 126 pages. Complete PDF pages 16–30 were visually inspected (printed pages 9–23, including the Basic Competencies divider). This verifies the schedules, competency table, role illustration and the topic-specific guidance relevant to Chapter I; it is not a full review of every chapter.

### Confirmed allocations and source discrepancies

| Subchapter | Table allocation (PDF 19) |
|---|---|
| 1.1 Roles / workplace communication | 6 hours |
| 1.2 UHC / workplace innovation | 3 hours |
| 1.3 BHS policies / entrepreneurial skills | 4 hours |
| 1.4 Benefits / life and career decisions | 3 hours |
| 1.5 Relationships, teamwork, self-management | 3 hours combined |
| 1.6 Present relevant information | 8 hours |
| 1.7 Solve workplace problems | 3 hours |
| 1.8 OSH policies and procedures | 4 hours |
| 1.9 Sustainable workplace practices | 3 hours |
| Total | 37 hours |

PDF 20 says at least three hours for roles, whereas the table says six. Retain an explicit discrepancy note; do not silently choose one as an independently verified current TESDA requirement. PDF 26 and PDF 27 refer to the same combined three hours for relationships/teamwork, not three hours each. PDF 19 maps both the eighth and ninth competencies to the OSH topic; 1.9 is therefore still a proposed separate learning grouping, not a separate printed section verified by this guide.

The suggested three-/five-day schedules span all three competency groups and cannot be used to claim that short digital lessons alone satisfy the table's training allocations. Keep estimated independent-learning duration, planned facilitated activities, and the source competency allocation as separate fields. Do not invent a complete 37-hour timetable from the 42 digital lesson durations.

### Additions to the facilitator content map

- **1.1, PDF 20:** the verified illustration shows Community Organizer, Educator and Health Care Service Provider under barangay health promotion. Use it as a conceptual reference for the three-role visual; it does not by itself establish an official HEPO reporting hierarchy.
- **1.4.2 and 1.4.4, PDF 23:** include a local accreditation-process walkthrough and an optional eligibility-form demonstration. Verify the currently applicable form before producing a worksheet; the guide cites a 2011 form revision. Use fictional practice data.
- **1.4.3, PDF 24:** distinguish statutory benefit categories from locally available implementation. Add a facilitator-maintained local information panel with source and verification date; do not imply uniform local availability.
- **1.4.5 and 1.5.5–1.5.6, PDF 23 and 27:** the guide also places self-management under life/career decisions. Teach the main material in 1.5 and cross-reference it from the reflective follow-up exercise in 1.4 rather than duplicating it.
- **1.5.2–1.5.3, PDF 26:** add an optional local partner directory using approved public professional names/roles/photos, plus the local health office's organizational structure and communication channels. Missing local entries must display as unconfigured rather than fabricated.
- **1.5.4 and 1.5.6, PDF 26:** include meeting protocols and a work-related administrative-document exercise in facilitator activities. Link documentation practice to 1.1.5.
- **1.6.1 and 1.6.4, PDF 26:** incorporate interpreting nonverbal communication and checking online information sources as supported supplementary exercises. These fit the existing lesson boundaries; no extra lesson is needed.
- **1.6.5, PDF 28:** offer a choice of role-play contexts from household profiling, family-planning referral, a resident expressing low mood, and smoking cessation. Assess communication and appropriate referral, not clinical skills not yet taught. Retain gathering, assessing, recording and presenting information as the full competency scope.
- **1.7.3, PDF 29:** after summing the four 1–5 criteria, ask learners whether they agree with the resulting ranking and why. Scores support discussion; the top score is not an automatic decision for every community.
- **1.8.4, PDF 30:** facilitator demonstration choices include sharps disposal, infection-control practice and prevention of musculoskeletal discomfort. Use approved procedures, appropriate supervision and training props. Detailed current safety instructions remain an authoring verification task.

These additions preserve the proposed 42-lesson structure and strengthen facilitator activities and source traceability. The Day 1 presentation was subsequently supplied and reviewed; see section 15. No further upload of these three source PDFs is needed. No repository, application, or database changes were made.


## 15. Supplied Day 1 presentation verification — 24 September 2026

The original has 78 landscape PDF pages. Text was extracted across the deck, all pages were rendered and surveyed in contact sheets, and pages 7, 25, 56 and 62 were inspected individually. This establishes sequence, visual treatment and the source discrepancies below; it is not a current legal or clinical validation. Poppler reported unavailable Symbol/ArialUnicode display fonts; text extraction and visual inspection were used together, so exact font reproduction is not claimed.

### Corrected presentation page map

Use actual one-based PDF page numbers for this supplied version. Do not apply one constant offset to the repository's older slide references; the differences vary by section.

| Planned subchapter | Verified deck pages | Teaching and activity mapping |
|---|---|---|
| Chapter I introduction | 1–4 | Title, outcomes and outline |
| 1.1 BHW roles | 5–13 | Competency on 5; activities on 6 and 13; roles graphic on 7; HEPO on 8; Educator on 9; Organizer on 10; service/records on 11–12 |
| 1.2 UHC | 15–18, 25 | Shared policy competency/activity pages; UHC content on 17–18 |
| 1.3 Other BHS policies | 15–16, 21–25 | Milk Code 21; breastfeeding 22; pharmaceutical promotion 23; plastics 24; practice 25 |
| 1.4 Benefits and eligibility | 15–16, 19–20, 25 | Benefits 19; eligibility 20; application/reflection practice 25 |
| 1.5 Relationships, teamwork, self-management | 27–40, 43–46, 48–50 | Partners 29–39; local structure/document activities 28 and 40; teamwork 43–46; self-management 48–50 |
| 1.6 Communication | 52–57 | Competency 52; practice 53/57; communication 54–56; question comparison 56 |
| 1.7 Problem-solving | 59–66 | Competency 59; problem-tree activity 60; Five Why's table 62; scoring criteria 63; worked ranking 64; Rosario 65; community action 66 |
| 1.8 OSH | 69–77 | Competency 69; pictured question/answer 70–71; hazard introduction 72; five hazard groups 73–75; demonstration/application 76–77 |
| 1.9 Sustainable practices | No standalone section | Continue to use the Facilitator Guide's ninth competency and related policy/OSH material; do not invent a deck section |

Repeated navigation pages are 4, 14, 26, 42, 47, 51, 58 and 68. Page 78 is the closing slide. Replace repeated navigation slides with course navigation. The unrelated high-heels/shopping interstitial is page 41 and the hydration/brain interstitial is page 67; omit these interstitials from the assessed curriculum. This does not remove appropriate hydration/heat-exposure content from occupational safety.

### Corrections and decisions carried into implementation

1. **Citation correction:** repository source notes cite some deck positions beyond this PDF's 78 pages and place several topics at different numbers. During implementation, correct each coverage reference against the map above and the exact claim; preserve concept IDs. Do not silently relabel the original PDFs or confuse a source page with a new lesson/slide number.
2. **Policy identifier discrepancy:** PDF 23 uses AO 2015-0053, whereas PDF 25's practice list prints AO 2015-0083 for the same topic. The facilitator guide also cites 2015-0053. Mark the practice-slide identifier as a source discrepancy; check the primary order before final authoring. Do not reproduce the conflicting number in new learning material.
3. **Source sequence versus planned organization:** the deck places benefits/eligibility before the other policies. The proposed 1.2 UHC → 1.3 other policies → 1.4 benefits order intentionally preserves the existing repository grouping. Document that choice; do not claim it exactly reproduces the deck order.
4. **Roles artwork:** PDF 7 reproduces the three-role graphic found in the facilitator guide; page 8 names the barangay HEPO role. The sample storyboard can now be grounded in both. Use a clear new illustration rather than importing a small screenshot or portraying the metaphor as an official reporting hierarchy.
5. **Presentation design:** the source deck frequently uses paragraph-length bullets and miniature tables. Preserve subject coverage and activity intent, but implement the planned visual slides with concise text and progressive diagrams. Source deck screenshots are references, not the new slide presentation.
6. **Activity separation:** retain the deck's learning-activity, explanation, demonstration and practical-application distinctions in facilitator notes. In learner mode, convert prompts to direct learner actions; never display “the trainer may…” as if it were learner teaching content.
7. **Pictured question:** pages 70 and 71 are a question followed by its highlighted answer. Implement one interactive check with feedback after response rather than two repetitive static screens. Use a reviewed non-graphic illustration and current procedural guidance.
8. **Image reuse:** original photos, clip art, campaign imagery and agency logos are visible in the deck, but inclusion in a PDF does not establish permission for every new use. Keep them as design references until provenance/reuse rights are established; prefer approved original illustrations for the course. Do not imply new DOH endorsement through copied branding.
9. **Problem example:** page 62 repeats the same ambiguous Five Why's entry seen in the reference manual. This is a shared source ambiguity, not a missing-text issue. Review the causal explanation when rewriting; keep the worked scoring example contextual rather than universal.

All three requested original PDFs are available and the specific missing diagrams/tables relevant to this planning pass have been checked. The proposed 42-lesson structure remains unchanged. Outstanding execution dependencies are final teaching-copy review, current official policy/procedure verification, approved visual production, reconciliation with incoming 06–09 work, and implementation/testing. No further source upload is needed for this plan's Chapter I review.
