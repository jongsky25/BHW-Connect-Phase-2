# Day 1 training package — multi-perspective assessment (September 2026)

**Scope.** The whole Day 1 Basic Competencies package in
`content/training/day1-basic-competencies/`:
- 9 modules;
- the 26 converted lessons in modules 1–5;
- the legacy module lessons;
- facilitator notes and guides;
- `competency.json` files;
- the 38-item pre/post test;
- chatbot `qa-entries.json`;
- visuals and narration;
- how the app delivers all of this.

The package was read the way six people would read it. The question was
not "is it well organized?" but **"does this build a BHW's capacity to do the
job?"**

**Companion document.** The standard that comes out of this review, for
fixing this package and building every future package, is
[`capacity-building-content-standard.md`](./capacity-building-content-standard.md).

**Method.** Each reviewer read the actual files; nothing was sampled from
docs alone. Figures were computed from the files, and the most serious
claims were checked again by hand. The six reviewers:
1. Facilitator
2. BHW learner
3. UX / learning-experience designer
4. Training and methodology expert
5. Public health subject-matter expert (SME) and content governance
6. Filipino language editor, plus a monitoring & evaluation (M&E) /
   competency assessor

The legal points were checked against RA 7883 on lawphil. The UHC IRR,
Milk Code rules and PhilHealth benefit names come from the reviewer's
knowledge and **must be confirmed by a named SME** before they are acted on.

---

## 1. Verdict in one paragraph

The package is **built to prove coverage, not to build capacity**. The
machinery is excellent:
- every source concept is traced to a page;
- Filipino and English stay in step;
- revisions are hashed and immutable;
- facilitator guides follow a fixed template.

But the parts that make a BHW able to *do* something are thin or
boilerplate: practice, feedback, observation, job aids, and follow-up on
the job. The newer short-lesson format (modules 1–5) has pulled the
learning design **backward** compared with the older module lessons
(modules 6–9). The strongest material in the repo is also the hardest to
reach:
- the older lessons' scenarios and scripts;
- the facilitator guides' practice activities.

Several layers also disagree with each other on facts that matter:
- lesson vs test vs chatbot;
- module notes vs lesson guides.

One of those disagreements teaches a policy violation.

## 2. What is already strong — keep it

- **Legacy modules 06 (Komunikasyon) and 07 (Problema) are the best teaching
  in the package.**
  - Stories have a start, a turning point and an ending.
  - They give exact lines a BHW can say: *"Ano ang nagpapahirap sa pagpunta
    mo?"* instead of *"Bakit hindi ka sumusunod?"*
  - Practice is done in pairs.
  - Checks have three plausible options.
- **Face-to-face practice in the lesson facilitator guides.** Examples:
  - triads with an observer checklist (`bhs-decline`);
  - a spoken three-line handover (`bhw-roles-application`);
  - eligibility profile cards (`bhw-eligibility`).

  These build real skill.
- **Module-level `competency.json` (all 9).** Four indicators each, with
  specific levels. For example, Module 06: *"Asks permission, uses an open
  question and lets the person finish."*
- **Scope guardrails in the new Read copy.** *"Perform only tasks covered by
  your training, local policy, and required supervision."* Module 08's
  "report the needlestick immediately; do not self-prescribe."
- **Traceability and parity machinery.** Coverage, source pages, hashing,
  immutable revisions and bilingual structural parity. Keep these as the
  *secondary* contract.
- **Learner resume, preloaded narration, 44px controls and read-along
  audio** in the new renderer.

## 3. Fix before any pilot use (safety, accuracy, integrity)

| # | Problem | Evidence | Fix |
|---|---|---|---|
| S1 | **The model "correct" refusal teaches a Milk Code violation.** The BHW offers the milk-company rep to "accept support for our lactation station instead." Milk Code rules restrict donations and sponsorship from milk companies. | `03-polisiya-bhs/lessons/bhs-decline/read.en.md:5,11`; `03-polisiya-bhs/lesson.en.md:84,136`; chatbot `03-polisiya-bhs/qa-entries.json` (`d1m3-decline-gift`) | Teach *decline, don't negotiate, report to the midwife/supervisor*, in all three layers. SME to confirm the wording. |
| S2 | **UHC "free / no premium" contradiction.** The new lesson correctly says *"Hindi nito ibig sabihing libre ang bawat serbisyo"*. The test keys the opposite as correct, and the legacy lesson says no premium is needed. | `test-questions.json:108`; `02-uhc-act/lesson.fil.md:28`; `02-uhc-act/lessons/uhc-coverage/read.fil.md:9` | One reviewed claim. Fix the test item, the legacy lesson and the UHC chatbot entries. Hold day1-m2 chatbot entries back until then. |
| S3 | **RA 7883 claims are overstated.** Subsistence allowance is presented as general, but applies to isolated BHS only. Benefits are "owed", but in practice depend on the LGU. The 1% cap is stated "per community", but the Act's cap is national. BHWE rests on a CSC rule that is not in `sources.json`. | `04-ra7883/lesson.en.md:48`; `04-ra7883/module.json`; `04-ra7883/coverage.json` | Use entitlement language ("may receive, subject to LGU…"). Add the IRR and CSC sources. |
| S4 | **Module 5 contradicts Module 4 on who accredits BHWs** (barangay officials vs the local health board). Module 5 also merges administrative oversight (punong barangay) with technical supervision (midwife/PHN). | `05-bhw-at-barangay/lessons/bhw-relationships/read.en.md`; chatbot `d1m5-four-relationships` | Fix the text, and separate the two kinds of supervision. |
| S5 | **The test bank covers content learners cannot open.** 18 of 38 items are on modules 06–09. The manual shows those modules as *unavailable* unless they are loaded (`src/app/training/[programId]/[[...path]]/page.tsx:143`). The pre/post test has no pass mark (the 80% `quiz_passing_percent` applies only to module quizzes), but `rpc_course_test_submit` scores against every bank row. So on a project seeded with all 38, the learning-gain figure would count unopenable content as wrong. | `test-questions.json`; `supabase/migrations/20260807000000_inc19_training_sessions.sql:634` | Tag every item with its module. Score only items whose module is published, which needs a versioned bank (see §3.1). |
| S6 | **Chatbot entries are tagged `tier: "cited"` but carry the old, uncorrected claims.** None of the lesson-level corrections reached `qa-entries.json`. | `modules/*/qa-entries.json` (e.g. `d1m1-three-roles`) | Generate chatbot entries and test items from the same reviewed claims as the lessons. |
| S7 | **Nothing has independent SME sign-off.** All 26 lesson guides end "Draft for review". 20 of 32 lesson assets are `draft`. The 1.1 approval was by the repository owner only. | `lessons/*/facilitator.*.md` §sources-review; `docs/bhw-reference-content-approval.md` | Two-key sign-off: author plus a named MHO/PHN, and legal review for entitlements. |

### 3.1 Fix status (September 2026)

Content fixes for S1–S4 and S6 are made in the repository. The claims now
match across the Read text, slides and narration, the older module lessons,
the facilitator guides, the chatbot entries, `coverage.json` and the test
bank. Narration for the 16 changed section-language pairs was re-rendered.
No module 01 lesson changed, so the owner-approved subchapter 1.1 hashes
still hold. Eleven lessons in modules 02–05 now hash differently and will
stage new draft revisions when loaded.

| # | Status | What changed |
|---|---|---|
| S1 | Fixed; SME to confirm wording | Corazon declines, offers the milk company nothing, promises nothing, and tells the midwife the same day. The "Right" example now cites the Milk Code, not AO 2015-0053. The chatbot's Milk Code answer bars gifts and samples outright and says any donation offer goes to the supervisor. |
| S2 | Fixed in repo; SME to confirm PhilHealth terms | "Automatically included" no longer means "free". Direct contributors still pay premiums. Primary care means *registering* with a provider of choice, not being "assigned" one. Referral is what the law "calls for", with local variation. The route from barangay to health board goes through the midwife and the municipal/city health office. |
| S3 | Fixed; checked against RA 7883 text | The 1% cap is nationwide (§5). The subsistence allowance applies only at isolated BHS (§6b). The hazard allowance amount is set locally (§6a). "Owed" is replaced by "benefits the law provides… set locally". The three roles are attributed to the DOH BHW Reference Manual, not RA 7883, which does not name them. The BHWE "two years of college" condition is not in RA 7883 §6d; it is flagged for a CSC source. |
| S4 | Fixed | Accreditation comes from the local health board. The punong barangay oversees BHWs *administratively*; the midwife remains the technical supervisor. |
| S5 | Live UHC item corrected; versioned bank still open | See below. |
| S6 | Fixed for S1–S4 claims | The chatbot entries now match the lessons. A claim registry (standard §10 G1) is still needed to stop the drift recurring. |
| S7 | Open | The claims below need a named reviewer before pilot use. |

**Live pilot database (`ltzicxyefizxoqhfuuzc`), read-only check.** It holds a
20-item bank for modules 01–05 (not the 38 in the repo) and 5 recorded
attempts. So S5 does not occur there today. But that bank still keys the old
UHC answer as correct (position 9: *"…nothing to worry about regarding cost
at the health center"*), and still uses the old wording at positions 2
(three roles "named in RA 7883") and 16 ("a benefit that's owed").

`training:load --mode assessments` deliberately refuses to change a loaded
bank ("version it before changing historical questions",
`scripts/training-load.mjs:248`), so the repo fix cannot reach it.

**One-off correction applied (24 September 2026, at the owner's request).**
- Row `course_test_questions.id = b30cfb2f-b9c0-46c3-aca3-fd354f3daf7c`
  (course `73e0edda-…`, position 9) had its option 1 text replaced in both
  languages with the repo wording: *"Consultation can be covered if the
  resident is registered with a PhilHealth primary care provider, but not
  every service is free."*
- The prompt, the other three options and `correct_option_index` (1) were
  left unchanged.
- The update was guarded on the old text and changed exactly one row.
- The 5 historical attempts keep their stored scores. One of them had chosen
  this option under its old wording; its meaning (the "covered" answer) is
  the same slot.
- The PhilHealth wording is still subject to SME confirmation (queue item 2).

**Also corrected the same day, at the owner's request.** Only the prompt text
changed; options and answer keys are untouched. Both updates were guarded on
the old text.
- Position 2 (`2f79477f-…`): the prompt now says "the three BHW roles in the
  DOH BHW Reference Manual" instead of "named in RA 7883", in both languages.
- Position 16 (`d4bcbe36-…`): the English prompt now says "a benefit is
  delayed" instead of "a benefit that's owed is delayed". The Filipino prompt
  already matched the repo.

The live bank now matches the repo wording for all three items the review
flagged.

**Still open.**
- The versioned bank (per-item module tag plus active/retired items, with
  `rpc_course_test_submit` scoring only active items on published modules)
  is still needed. It is what stops S5 on a project seeded with all 38
  items.

**SME confirmation queue (S7).**
1. Milk Code implementing rules (AO 2006-0012): confirm that the refusal
   wording and "no gifts or samples; donation offers go to the supervisor"
   match the current rule.
2. PhilHealth: the current name and registration rules for the primary care
   / outpatient benefit (Konsulta; reportedly renamed YAKAP in 2025), and
   premium obligations for direct contributors.
3. The actual route from the barangay to the provincial/city health board
   in the pilot LGU.
4. The CSC issuance behind the four BHWE conditions. Add it to
   `sources.json`.
5. The RA 7883 IRR on registration, accreditation and hazard allowance
   procedure. Add it to `sources.json`.

## 4. Findings by perspective

### 4.1 Facilitator — "I could run one lesson, not a training day"

- **There is no training design.**
  - The course is called "Day 1", but the source allocates 37 hours
    (4.5–5 days).
  - There is no day grid: no AM/PM blocks, breaks, energizers, place for the
    pre/post test, or daily recap.
  - DOH's own suggested designs (Facilitator's Manual PDF 16–17, "Day 1 AM
    + on-the-job training") are not used.
- **Hours drift between layers.**
  - Module 03: TESDA 240 min, module notes 200 min, sum of lesson guides
    180 min.
  - Module 05: TESDA 180 min, lesson guides 200 min.
- **Module notes and lesson guides contradict each other, and nothing says
  which one wins.**
  - Module 01's answer key is for checks that no longer exist ("BHW Lito").
  - Module 01's notes refer to density tiers the new lessons do not have.
  - Module 03's notes schedule "CSC Form 101-H (20 min)", which no lesson
    teaches.
- **The guides can't be scanned five minutes before a session.** A lesson
  guide runs 1,300–1,800 words for a lesson of 80–300 words.
  - `sources-review`, which is author/reviewer material, is the
    second-largest section (about 209 words on average), larger than
    `practice`.
  - Unresolved editorial conflicts are passed to the facilitator to handle
    live ("If a BHW notices, thank them… noted for review").
- **The materials named don't exist.**
  - "The rubric" (modules 06, 07, 09).
  - Offer cards, record cards, BHWE cards A–D, observer checklists.
  - A marshmallow activity with no local substitute.
  - "A video on UHC" with no file.
  - No printable or offline version of any guide.
- **Group size is ignored.** A 45-minute lesson for 30 BHWs lets "two or
  three pairs present", yet the guide asks the facilitator to rate every
  BHW. There is no sampling rule and no paper tally sheet.
- **Modules 06–09 have the opposite problem.** They are 18 of the 37 hours,
  with 8 for Komunikasyon alone. Their notes are 350–470 words of shorthand,
  with no lesson-level guides.

### 4.2 BHW learner (Aling Rosa, 52, 14 years' service) — "Ano ang gagawin ko sa Lunes?"

- **Many new lessons don't say what to do next.**
  - `uhc-coverage` opens with Mang Ernesto asking *"Totoo bang libre na ang
    konsulta?"* The lesson never answers him; it ends with "tiyakin sa
    PhilHealth o RHU."
  - `bhw-benefits` never says who to go to, what to bring, or anything about
    the honorarium.
- **The most needed lesson has no worked example.** `bhw-records` says
  *"halimbawa lamang / kathang-isip"* seven times but never shows one
  filled-in master-list row.
- **Stories were cut apart.** `bhs-decline` begins "Bumalik tayo kay BHW
  Corazon…", but the learner never met Corazon in that lesson. Lessons in
  modules 02–05 read as sections copied out of the older lessons, without
  the story.
- **Real conditions are missing.** Late or unpaid honorarium, a change of
  barangay captain, political pressure, workload, far-off puroks, a shared
  phone, no signal. The legacy Module 4 line *"baka mukhang mataray ako kung
  magtatanong ako tungkol sa pera"* was dropped from the new lesson.
- **The tone distrusts the reader.** Repeated *"huwag hulaan / huwag
  mangako / halimbawa lamang"* reads as "they don't trust us."
- **What BHWs asked for:**
  - a filled-in sample master list and household profile;
  - a household-visit script;
  - a UHC/PhilHealth answer card;
  - a contact sheet with blanks to fill in;
  - an accreditation checklist;
  - stories from other BHWs, including failures;
  - offline use.

### 4.3 UX / learning-experience designer — "retrieval practice became recognition"

- **The answer is shown before the question.** The check section shows its
  takeaway/summary before the check is asked, in both Read
  (`reference-read-section.tsx:212-222` → `reference-lessons.tsx:398-404`)
  and Slides (the `check-slide` display text).
- **Completion isn't earned.** "Mark lesson complete" works on slide 1 with
  the check unanswered (`reference-lessons.tsx:430-439`). After completing,
  there is no "next lesson" link.
- **Visuals are the weakest layer.**
  - All 20 lessons in modules 02–05 use one placeholder SVG stamped "Draft —
    para sa pagsusuri". Its caption tells learners the item still needs
    review.
  - The other 12 carry the empty caption "Eskematiko para sa pag-aaral…".
  - The module SVGs (640-wide viewBox) render at about 0.46× on a 360px
    phone, so 10–13px labels come out at about 5–6px.
  - The purpose-built `modules/*/visuals` never appear in the manual path.
- **Six names for four levels.** kurso, manual, kabanata, subchapter,
  modyul, aralin. The toggle is "Slides" in one renderer and "Islide" in the
  other. The breadcrumb has six crumbs on a 360px screen.
- **Offline doesn't work.** The service worker caches only `/_next/static`
  (`public/sw.js:51-57`). Audio is 30 MB in total at 48 kbps, up to about
  1.1 MB per lesson, and nothing can be downloaded ahead of time.
- **The time estimate is hard-coded.** "3–7 minuto" appears on every lesson,
  but narration runs 41–181 seconds per lesson.
- **Hard to read, and developer text leaks through.** The pre/post test
  uses `text-sm` at 80% opacity and shows 38 questions on one page with no
  save point. Learners see GitHub source links and "PDF 12".

### 4.4 Training & methodology expert — "the alignment chain breaks at every structured link"

- **TESDA → objectives.** No TESDA learning outcome or performance criterion
  is stored anywhere. Competency statements are paraphrased in prose.
- **Lesson objectives.** 20 of 26 are generated from a template: *"Explain
  and apply in a situation: understanding bhwe."*
  - The banned-verb check only looks at the first word, so "understanding"
    slips through.
  - Module 01's hand-written objectives are recognition or explanation
    (Identify / Describe / Match / Explain). The job needs Apply and Analyze.
- **Objective → indicator.**
  - Module 01: all 6 lesson indicators copy the objective word for word.
  - Modules 02–05: all 20 share one sentence (*"Explains the main point and
    an appropriate first action…"*).
  - Rating levels: only **two** text sets across all 26 lessons.
  - The good, specific rubric lives in each guide's `[observe]` prose, but
    `competency_observations` records against the generic JSON. **The data
    captured is the weakest version.**
- **Self-checks.** Exactly 1 per lesson, always last. 20 of 26 have **two
  options**. 22 of 26 have the correct answer in **position 0**. 20 share
  boilerplate feedback ("Ipaliwanag ang dahilan gamit ang sitwasyon sa
  aralin").
- **Certification.** `rpc_assessment_decide` is pass/fail plus free text, so
  a certificate needs no observed performance
  (`supabase/migrations/20260802000000_inc16_notifications.sql:258`).
- **Practice, spacing and transfer.**
  - Deliberate practice exists only face-to-face. Self-study BHWs get one
    2-option check per lesson.
  - There is no spaced recall.
  - There is no on-the-job task, job aid, or link to the midwife's
    supervision.
  - The CESR material in this repo shows the cost: *"BHWs demonstrate gaps
    in recalling signal definitions"* after training
    (`docs/source-material/cesr/mss-feedback-2026-06.md`).
- **Density tiers.**
  - The converted lessons have **no tiers at all**, so Maikli / Karaniwan /
    Detalyado only works in modules 06–09.
  - Tiers vary how much learners *read*. Capacity comes from how much they
    *practice*.

### 4.5 Public health SME & governance — "what's important vs policy trivia"

- **Time goes to law, not to the core job.**
  - About 10 of 37 hours go to legal and policy material. Module 4 has BHWs
    learn the local health board's eight IRR duties.
  - Records and reporting get about 45 minutes, with **no Data Privacy Act /
    confidentiality** content, although household profiling collects
    personal data.
  - There is no referral-slip or return-referral practice.
  - There is no household-visit protocol.
  - There is no danger-sign / emergency rule, apart from "follow local
    procedures".
- **Referral is always "midwife/RHU first",** with no emergency exception
  and no local referral directory.
- **Governance gaps.**
  - Missing primary sources: RA 7883 IRR, UHC IRR, CSC issuance, Milk Code
    RIRR, RA 10173, RA 11058.
  - Many citations point to manual pages, not statute sections.
  - "Inherited page reference; final audit pending" appears repeatedly.
  - There is no trigger to update content when policy changes (PhilHealth
    circulars, a BHW Magna Carta).
- **Module 08 (OSH) is the strongest clinically.** It is missing:
  - that post-exposure treatment is time-critical;
  - the animal-bite pathway;
  - safety against violence or harassment on home visits;
  - an LGU insurance check.

### 4.6 Filipino language editor — "natural in 06/08, translated elsewhere"

- **The register is too deep, worst in the rating wording.**
  - *untag* ×54, *kaukulang* ×11, *iakyat sa supervisor*, *pinamumugaran*.
  - Before: "nang walang untag". After: "kahit hindi pinapaalalahanan".
- **Grammar and parity errors.**
  - "ubo **ni** anak ni Aling Nena" should be "ng anak".
  - Filipino "bagong-tanggap" is English "newly accredited" in the same
    lesson (`05/bhw-right-contact`).
- **Sentences run long.** Median 16 words, but **720 sentences over 25
  words**. One is 70 words (`04-ra7883/lesson.fil.md`).
- **Author jargon reaches BHWs.** "Reference Manual" ×87, "curriculum",
  "kathang-isip" ×20.
- **No glossary, and terms drift.**
  - The community member is "residente" 71 / "pasyente" 14 / "kliyente" 4.
  - Barangay leader is "Kapitan" / "barangay captain" / "punong barangay".
  - *hilot* never appears.
- **Settings are Tagalog-only.** Every name is Tagalog; places are always
  "purok". There are zero Visayas, Mindanao, IP or Muslim settings. Filipino
  is a second language for a large share of BHWs.
- **One gender skew.** Every good-model BHW is female. The one "Mali"
  (wrong) example is male.

### 4.7 M&E / competency assessor — "nothing today would show capacity improved"

- **The test has exploitable patterns.**
  - Correct position: A 11, B 15, C 10, **D 2**.
  - The **longest option is correct in 27–28 of 38** (English) and 30 in
    Filipino.
  - The last 12 answers cycle `…120120120120`.
  - Distractors are throwaways: "They lack discipline", "Who can be blamed",
    "Turn off the vaccine refrigerator".
  - Items mix 3 and 4 options; about 10 are pure recall; 4 have NOT-stems.
- **The blueprint doesn't follow the hours.** Items were mapped by content:
  M1 9, M2 3, **M3 2**, M4 3, M5 3, M6 6, M7 4, M8 4, M9 4. Module 3 is
  4 hours; Module 6 is 8 hours. No item carries a module or objective id.
- **The pre/post design is flawed.**
  - Identical forms before and after, so the retest effect is uncorrected.
  - No item analysis.
  - The 80% module-quiz pass mark has no stated basis, and the pre/post test has no success threshold at all (it records a gain only).
- **Kirkpatrick levels:**
  - **Level 1 (reaction):** absent.
  - **Level 2 (learning):** the weak test above.
  - **Level 3 (behaviour on the job):** observations exist, but can be
    logged in the classroom immediately. There is no 30/90-day schedule, no
    field setting and no rater calibration. BHWs cannot see their own
    ratings, which blocks coaching.
  - **Level 4 (results):** absent. There is no link to profile
    completeness, referral completion or report timeliness.

## 5. The cross-cutting themes (what actually matters)

1. **Coverage is the contract; performance should be.**
   - `coverage.json` is the only thing enforced in both directions.
   - Progress counts lessons completed.
   - Both measure exposure. The organizing unit should be the **BHW work
     task** (interview a household, refer, record, report, decline, teach
     back), with coverage kept as a secondary trace.
2. **The capacity-building core is in prose, not in structure.**
   - Practice, rubrics and scripts sit in facilitator Markdown.
   - What the app records and certifies is the generic boilerplate.
   - Moving them into structured, checkable fields is the single
     highest-leverage fix.
3. **One source of truth per fact.**
   - Lessons, the legacy lessons, the test, chatbot entries, module notes
     and lesson guides each restate facts independently, and they have
     drifted.
   - They need one claim registry and one lesson format.
4. **Learning doesn't leave the room.** There is no job aid, on-the-job
   task, spaced recall, supervision link or field re-observation.
5. **Validators check form, not substance.**
   - The loader enforces headings, parity and hashes.
   - It cannot catch a copied indicator, a two-option straw-man check, a
     placeholder caption or a skewed answer key.
   - Many of those *can* be checked automatically (see the standard §5).
6. **Written for the author, not the reader.** Review notes, disclaimers,
   "Reference Manual", GitHub links and draft stamps reach the BHW and the
   facilitator.

## 6. Prioritized roadmap

**Phase 0 — before any pilot learner sees it (days).**
- S1–S7 above.
- Hide `draft` assets and "draft/review" wording from learners.
- Stop scoring test items on unpublished lessons.
- Gate "complete" on reaching the end and answering the check.
- Move the takeaway so it is revealed *after* the check.

**Phase 1 — make it build skill (weeks).**
- Rewrite the 26 lesson objectives and indicators:
  - Apply-level objectives;
  - specific observables and levels, copied up from each guide's
    `[observe]`.
- Rebuild the lesson checks: scenario stem, 3+ plausible options,
  per-option feedback, one check per 2–3 sections.
- Put the story and script back into the 02–05 lessons (the Josie, Corazon
  and Mang Ernesto scenes) and give every story an ending.
- Add a **"Sa Lunes, gawin ito"** step to every lesson.
- Ship one job aid per module. Start with:
  - a filled-in sample master list / household profile;
  - a household-visit script;
  - a referral contact sheet.
- Rebuild the test to a blueprint: tagged, weighted by hours, balanced key,
  parallel pre/post forms.

**Phase 2 — make it runnable and measurable (weeks).**
- A course training design: a 5-day, 37-hour grid, and the DOH half-day +
  OJT variant. Lesson minutes must sum to TESDA hours.
- A ≤150-word run sheet at the top of every guide. Move `sources-review` to
  a reviewer file.
- A printable kit per lesson: cards, observer checklist, paper observation
  sheet, manila-paper version of the slides.
- Lesson-level guides for 06–09.
- An evaluation plan:
  - Level 1: a reaction form.
  - Level 2: the parallel-form test plus item analysis.
  - Level 3: field re-observation by the midwife at 30 and 90 days.
  - Level 4: 3–5 service indicators with a baseline.
- Tie certification to observed Kaya na on critical indicators.

**Phase 3 — make it last (ongoing).**
- A claim registry feeding lessons, test and chatbot.
- A glossary lint.
- Localisation slots per LGU: referral directory, benefits, contacts.
- An offline download pack and lighter audio.
- Non-Tagalog scenarios.
- A 6-month review plus policy-change triggers.
- Spaced retrieval at +2 days, +2 weeks and +2 months.

Every future package — Chapters II and III, CESR — is built to
[`capacity-building-content-standard.md`](./capacity-building-content-standard.md)
from the start. That is cheaper than converting afterwards.
