# Capacity-Building Content Standard

**Status: proposed (September 2026).** Comes out of
[`content-assessment-2026-09.md`](./content-assessment-2026-09.md).
- **Applies to:** every new training package (Chapters II–III, CESR, and
  later ones) and to the rework of Day 1.
- **Relation to the other authoring docs:**
  - [`training-content-style-guide.md`](./training-content-style-guide.md)
    stays the guide to writing craft.
  - [`content/training/README.md`](../content/training/README.md) stays the
    file-format reference.
  - Where either conflicts with this document, this document wins once
    adopted.
- **Enforcement:** rules marked **[auto]** can be checked by the loader or
  CI. That enforcement is proposed, not yet built. Until it is built, they
  are checklist items for the reviewer.

---

## 1. The purpose, in one line

> A BHW who finishes a package can **do** specific tasks of the job better,
> on the job, and we can **see** that they can.

Everything below serves that. Covering the source is necessary but it is not
the goal. It is a check we run *after* the package is designed around tasks.

## 2. Principles

1. **Task first.** The unit of design is a BHW **work task** under real
   conditions, not a concept or a source page. Examples: interview a
   household, refer, fill the master list, report a signal, decline a
   sponsor, teach back.
2. **Assessment before content.** Write how you will *see* the skill before
   you write what to read.
3. **Practice is the core, reading is support.** Every objective gets a
   practice where someone can watch it happen, with feedback and a second
   try.
4. **Learning must leave the room.** Every package ships:
   - a job aid;
   - an on-the-job task;
   - spaced recall;
   - a supervision checklist item.
5. **One source of truth per fact.** Lessons, tests, chatbot entries and
   facilitator material reference the same reviewed claim. They never
   restate it independently.
6. **Written for the reader.** No author notes, review status, draft stamps
   or developer links reach a BHW or a facilitator.
7. **Real BHW conditions.** Honorarium, workload, weak signal, a shared
   phone, barangay politics, far-off sitios, the midwife as partner, and
   regions beyond Tagalog areas.

## 3. What a complete package contains

For **each module** (one TESDA competency, or one program area such as
CESR):

| Component | For whom | Purpose |
|---|---|---|
| `performance.json` — 3–6 critical tasks, each with conditions, standard, common errors, and TESDA unit/outcome/performance criteria | author, assessor | The organizing contract (replaces `coverage.json` as the primary one) |
| `coverage.json` | author, reviewer | Secondary trace: every source concept is delivered or excused |
| Lessons (one format — §6) | BHW | Just enough content to do the practice |
| Checks + scenario decisions | BHW | Retrieval and judgement, inside the lesson |
| Facilitator guide with run sheet + printable kit | facilitator | Run the session and observe the skill |
| `competency.json` — task-specific indicators | assessor, app | What is observed and recorded |
| Test items tagged to objectives | M&E | Learning gain (Kirkpatrick Level 2) |
| **Job aid** (printable, one page) | BHW on the job | Performance support after training |
| **On-the-job task** | BHW + midwife | Transfer into real work |
| **Spaced-recall set** (3–5 scenario items) | BHW | Stops forgetting at +2 days, +2 weeks and +2 months |
| **Supervision checklist item** | midwife / PHN | Re-observation during routine visits (Level 3) |
| **Localisation slots** | LGU coordinator | Referral directory, contacts, local benefits, local forms |
| Claim references | reviewer | Every legal/clinical statement traces to the claim registry (§10) |

## 4. Design process and gates

No step starts until the previous gate is signed. Record the sign-off (name,
role, date, content hash) in the module's `review.json`.

| Step | Output | Gate (who signs) |
|---|---|---|
| 1. **Task analysis** — what BHWs actually do, the conditions, the common errors; confirmed with 2+ midwives/PHNs and 3+ BHWs | Draft `performance.json` | Task list approved by an MHO/PHN |
| 2. **Competency map** — each task tied to its TESDA unit, learning outcome and performance criteria (or the DOH program standard) | `performance.json` complete | 100% of the unit's performance criteria mapped or explicitly excluded |
| 3. **Assessment first** — observation indicators (§8) and test items (§9) for every objective | `competency.json`, tagged items | An independent assessor confirms every indicator is observable; the test blueprint is signed |
| 4. **Practice design** — for face-to-face *and* self-study | Practice specs in the guide; self-study scenarios | Every objective has a practice that can be observed |
| 5. **Minimum content** — only what the practice needs; the claim registry is referenced | Lessons, visuals, checks | Coverage passes; SME accuracy sign-off (clinical: MHO/PHN; legal/entitlement: DOH-CHD or LGU legal) |
| 6. **Transfer package** — job aid, on-the-job task, spaced set, supervision item, localisation slots | The four transfer files | A supervisor confirms they are usable in a routine visit |
| 7. **Language and read-aloud test** — 3 BHWs (at least 1 outside Luzon) read or listen and explain back | Test notes | Each section is explained correctly by 2 of 3 |
| 8. **Pilot** — one real session | Item analysis, rater agreement, Level 1 forms, facilitator debrief | The thresholds in §9 and §11 are met, or the revision is logged |
| 9. **Monitor** — review every 6 months, plus whenever a new law, IRR, DOH AO or PhilHealth circular appears | Revised claims/lessons | The owner re-verifies the affected claims |

Author sign-off alone is **never** SME sign-off.

## 5. Objectives

- **O1 [auto].** Each objective states **condition + action + standard**.
  Example: "Given a resident's question about PhilHealth, the BHW gives the
  correct first answer and names where to confirm, without promising a free
  service."
- **O2.** Skill competencies are at Bloom *Apply* or higher. Recall-level
  objectives are allowed only as enablers of a task objective.
- **O3 [auto].** Banned verbs (know, understand, appreciate, malaman,
  maintindihan…) are rejected **anywhere** in the objective, not only as the
  first word.
- **O4 [auto].** No templated objectives. An objective whose text repeats
  across lessons apart from a slug is rejected.
- **O5.** Every objective links by id to one task in `performance.json`, one
  practice, one indicator and at least one test item.

## 6. BHW-facing lessons

**One format.** Every lesson uses the `lessons/<key>/` structure. Legacy
module-level `lesson.*.md` is retired once a module is converted. Density
tiers, if kept, vary **practice depth**, not reading volume.

Each lesson follows this shape:

1. **Scene** — a named person, place and problem, told completely *within
   this lesson*.
2. **What to do and say** — steps, plus a script for any conversation
   (*"Sabihin: '…po'"*).
3. **Worked example** — a filled-in form, a completed decision, or a model
   dialogue.
4. **Check(s)** — decisions about the scene (§7).
5. **Resolution** — how the scene ends, including what the BHW did.
6. **Sa Lunes, gawin ito** — 1–3 concrete next actions naming who, where and
   what to bring. Link the job aid.

Rules:

- **L1 [auto].** Read sections have ≤ 80 words (Filipino). ≥ 90% of
  sentences have ≤ 20 words, and none has > 30.
- **L2 [auto].** Every lesson has a "Sa Lunes" section.
- **L3.** Every story has an ending. Never refer to a character the reader
  has not met in the same lesson.
- **L4.** Every procedural topic shows a filled-in example of the real form
  or tool, with fake data. Say "halimbawa lang" **once**, in the lesson
  footer.
- **L5 [auto].** At most one disclaimer per lesson. No "Reference Manual",
  "curriculum", "draft", "review", "PDF page" or repository links in learner
  text.
- **L6.** Content serves the practice. Legal detail is taught as *"what I
  can tell a resident"* and *"what I can ask my LGU"*, not as lists of IRR
  duties.
- **L7.** Scope block. Every lesson that involves client contact states:
  - what the BHW may do;
  - what they must escalate, and to whom;
  - the emergency exception (go direct to a facility, or call the hotline).

  Use the same wording in every layer.
- **L8 [auto].** Slides have ≤ 4 display lines of ≤ 70 characters each, and
  ≤ 280 characters in total. The takeaway is its own field and is never
  numbered as a step.
- **L9 [auto].** The takeaway and summary are **not** shown before the
  check. They are revealed after the learner answers (retrieve first, then
  reveal).
- **L10 [auto].** The self-study time estimate is computed from the content
  and narration, never hard-coded.

## 7. Checks (in-lesson, ungraded)

- **C1 [auto].** At least one check per 2–3 sections. The last check is a
  scenario decision: the stem names a person and a situation.
- **C2 [auto].** ≥ 3 options, all plausible and drawn from real
  misconceptions. The correct option is not the longest in more than 35% of
  checks across a module. The correct position is randomized at delivery.
- **C3 [auto].** Feedback for **each option** explains why it is right or
  wrong. Feedback strings repeated across lessons are rejected.
- **C4.** A check tests the scene's decision point, not trivia (not
  acronyms, numbers or dates unless the job needs them).

## 8. Observation and competency

- **K1 [auto].** `observable_*` is never equal to the objective. It
  describes a completed, visible action in a named practice activity.
- **K2 [auto].** Level texts (`kaya_na`, `kailangan_practice`, `hindi_pa`)
  and `not_yet` are unique across the course. Each one names the specific
  behaviour at that level, with an example.
- **K3.** What the guide tells the facilitator to observe is **exactly**
  what `competency.json` holds and what the app records. It lives in one
  place and is referenced from the other.
- **K4.** Every practice states the group size and a sampling plan. Example:
  "30 BHWs → 10 triads, 3 rounds; observe 3 triads per round; the rest on
  the paper tally sheet."
- **K5.** Every observation records its setting: role-play, simulation or
  field.
- **K6.** Certification requires every critical indicator to be rated
  **Kaya na** by an assessor. A self-check or test score alone never
  certifies.
- **K7.** 10% of observations are double-rated in the pilot. Target
  agreement: κ ≥ 0.6. Otherwise calibrate the raters and revise the
  indicator.
- **K8.** BHWs can see their own ratings and the coaching note.

## 9. Pre/post test and item bank

- **T1 [auto].** Every item carries `module_id`, `objective_id` and
  `bloom_level`. It maps to a **published** lesson; items on unpublished
  lessons are not scored.
- **T2 [auto].** The blueprint follows the hours. Each module has ≥ 4 items,
  in proportion to its training hours. ≥ 70% are scenario/application items.
- **T3 [auto].** 4 options per item. Each answer position holds 20–30% of
  the key. No run of 3 or more at the same position, and no cycle. The
  correct option is the longest in ≤ 35% of items. Option lengths within an
  item stay within ±25%.
- **T4 [auto].** No NOT-stems. No throwaway distractors: each distractor
  must name the misconception it represents in `distractor_rationale`.
- **T5.** Parallel forms: A for the pretest, B for the post-test. Add a
  delayed post-test at 60–90 days.
- **T6.** After each pilot: item analysis. Revise or retire an item if
  p > 0.95, p < 0.20 or point-biserial < 0.20. The cut score is set with a
  documented method, not assumed at 80%.

## 10. Accuracy, sources and governance

- **G1. Claim registry.** Every legal, clinical or entitlement statement
  gets an id, a **primary source to the section**, a verified date and a
  reviewer. Lessons, checks, test items, chatbot entries and facilitator
  material reference claim ids.
  - Primary sources are the statute, IRR or DOH/PhilHealth issuance.
  - DOH manuals and decks are secondary sources.
- **G2 [auto].** Consistency. The build fails when a test key or chatbot
  answer contradicts the lesson claim it links to. It also fails when a
  lesson is marked approved while any linked asset or guide is draft.
- **G3. Entitlement language.** Write "may receive, subject to LGU ordinance
  and funds." Never write "owed", "free" or "automatic". Every benefit or
  service claim has a localisation slot.
- **G4.** Unresolved conflicts between sources **block release**. They are
  never passed to the facilitator to resolve live.
- **G5 [auto].** Learner builds reject assets or text whose `review_status`
  is not approved. They also reject captions that say "draft", "review" or
  "schematic".
- **G6.** Two-key sign-off (§4) is recorded against the content hash. A
  changed hash needs a new sign-off.
- **G7.** Records content always includes confidentiality and the Data
  Privacy Act. Client-contact content always includes the danger-sign /
  emergency rule.

## 11. Facilitator material

- **F1 [auto].** Every lesson guide opens with a **run sheet of ≤ 150
  words**: steps with minutes, the slide for each step, 3 questions to ask,
  materials, the practice card, and what Kaya na looks like.
- **F2 [auto].** The full guide is ≤ 800 words. Generic guidance goes in one
  shared facilitator handbook, not in each lesson.
- **F3.** Module notes are the **session plan**: sequence, timing and
  materials. Lesson guides are the **script** and hold the answer keys. No
  answer keys at module level for converted modules.
- **F4 [auto].** Lesson minutes sum exactly to the module's TESDA hours, and
  modules sum to the course total. No unowned rows.
- **F5.** Every course ships a **training design**: a day grid with breaks,
  the pretest/post-test, daily recap and energizers. Where the DOH design
  moves hours to on-the-job training, say which tasks move and how they are
  observed.
- **F6.** Every card, checklist, rubric and tally sheet named in a guide
  ships as a printable file in the package.
- **F7.** Every step has a no-projector / no-internet alternative, and every
  material has a local substitute.
- **F8.** Prep that needs outside confirmation (LGU benefits, local forms,
  referral contacts) is flagged **"Gawin 1 linggo bago"** (do this one week
  before).
- **F9 [auto].** No `sources-review` or other author/reviewer material in
  the facilitator view. It goes to the reviewer's `review.json`.

## 12. Language and inclusion

- **N1 [auto].** Glossary. One preferred term per concept in both languages
  (e.g. *residente*, *midwife*, *punong barangay*, *BHS*, *RHU*). The build
  lints lessons and UI strings against it.
- **N2 [auto].** Every acronym and English term is explained in plain
  Filipino on first use in each lesson. Each lesson ends with a word list.
- **N3 [auto].** A deep-word list (*untag*, *kaukulang*, *iakyat*,
  *pinamumugaran*…) is rejected. Use everyday Filipino.
- **N4.** Write Filipino first, the way BHWs talk: natural Taglish, "po"
  where it is natural. English is a full equivalent. Names, roles and
  numbers match across the two (entity-checked).
- **N5.** Each module has at least one scenario set outside Luzon, names
  from at least two ethnolinguistic groups, and, where relevant, a scene
  with an interpreter, an IP elder or a Muslim household. Good and poor
  examples are balanced by gender.
- **N6.** Respect. Say why a rule exists instead of repeating "huwag".
  Include failure stories from real BHWs.

## 13. Visuals, media and delivery

- **V1 [auto].** Legibility on a phone: rendered text ≥ 14px in a 296px
  column, i.e. `font-size × 296 / viewBoxWidth ≥ 14`. ≤ 6 labels per visual.
- **V2 [auto].** The caption is a full sentence that states the takeaway.
  Alt text describes the content and differs from the caption. One asset is
  not reused for different concepts in the same lesson.
- **V3.** A visual earns its place: it shows a flow, a decision or a
  comparison. Otherwise use prose.
- **A1 [auto].** Audio ≤ 32 kbps mono. ≤ 60 s narration per section. ≤ 1 MB
  of media per lesson.
- **A2.** Each lesson can be downloaded for offline use: text, images and
  audio cached together.
- **U1 [auto].** Learner body text ≥ 16px with contrast ≥ 4.5:1, including
  the pre/post test.
- **U2 [auto].** "Complete" requires reaching the last section and answering
  every check. It then offers the next lesson.
- **U3.** The test shows one item per screen, with progress saved. It is
  framed as "hindi ito grado" (not a grade) for the pretest, with a review of
  missed items linked to their lessons after the post-test.

## 14. Transfer and evaluation

- **E1.** Every module ships:
  - a one-page **job aid**;
  - one **on-the-job task** logged in the app and confirmed by the midwife
    within 2–4 weeks;
  - a **spaced-recall set** pushed at +2 days, +2 weeks and +2 months, where
    misses trigger a refresher;
  - a **supervision checklist item**, following the pattern of
    `docs/source-material/cesr/supportive-supervision-tool.md`.
- **E2.** Every course has an evaluation plan covering all four levels:

| Level | Instrument | When | Owner | Example target |
|---|---|---|---|---|
| 1 Reaction | 5-item form (relevance, clarity, confidence, pace, what to change) | End of session | Facilitator | ≥ 80% "useful for my work" |
| 2 Learning | Parallel-form test A/B + item analysis | Pre, post, +60–90 days | M&E | Mean gain ≥ 20 points; retention ≥ 70% of gain |
| 3 Behaviour | Field re-observation on the same indicators | 30 and 90 days | Midwife/PHN | ≥ 70% Kaya na at 90 days on critical indicators |
| 4 Results | 3–5 service indicators the BHW already produces (profile completeness, referral completion, report timeliness) | Baseline, then quarterly | LGU / M&E | Named per module |

## 15. Definition of done (per lesson)

Every box must be ticked before a lesson can be approved.

- [ ] Links to a task, a practice, an indicator and ≥ 1 test item (O5).
- [ ] Scene → what to do/say → worked example → check(s) → resolution →
      "Sa Lunes" (§6).
- [ ] Checks: ≥ 3 plausible options, per-option feedback, takeaway revealed
      after (C1–C3, L9).
- [ ] Indicator is specific, not copied from the objective, and has unique
      levels (K1–K2).
- [ ] Guide: run sheet ≤ 150 words, ≤ 800 words total, printable kit,
      offline alternative, group size and sampling (F1–F2, F6–F7, K4).
- [ ] Every legal/clinical statement references a claim id, with SME
      sign-off recorded (G1, G6).
- [ ] Glossary-clean, sentence lengths within L1, read-aloud test passed
      (N1–N3, step 7).
- [ ] Visuals legible at 360px and captions state the takeaway (V1–V2).
- [ ] No draft/review/author text visible to learners or facilitators (L5,
      F9, G5).

## 16. Worked mini-examples

**Objective (O1).**
- ❌ "Explain and apply in a situation: understanding bhwe."
- ✅ "Given four BHW profiles, the BHW correctly says which ones qualify for
  BHWE and what document each would bring to the MHO."

**Indicator (K1–K2)** for that objective:
- *Observable:* "Sorts all four profile cards correctly and names the
  missing document for each one that does not qualify."
- *Kaya na:* "Sorts 4/4 and names each missing document without being
  reminded."
- *Kailangan pa ng practice:* "Sorts 3/4, or needs a reminder that
  continuous service is required."
- *Hindi pa:* "Treats any five years of service as qualifying, or confuses
  BHWE with a job or plantilla item."

**Check (C1–C3).**
- *Stem:* "Tinanong ni Mang Ernesto si Beth: 'Libre na ba ang konsulta sa
  RHU?' Ano ang pinakamabuting unang sagot?"
- Options, each with its own feedback:
  - (a) "Opo, libre na lahat." — overpromises.
  - (b) "Sakop po ang konsulta kung rehistrado kayo sa primary care
    provider; ang ibang gamot at laboratoryo ay depende — tingnan natin ang
    PhilHealth record ninyo." — correct.
  - (c) "Hindi ko po alam, sa munisipyo na lang kayo magtanong." — drops
    the resident.
  - (d) "Kailangan pa rin pong magbayad sa lahat." — the opposite
    overstatement.

  *(The wording of (b) depends on the claim registry entry being confirmed
  by an SME.)*

**"Sa Lunes, gawin ito"** (benefits lesson):
> 1. Itanong sa MHO kung nasa BHW registry ka. 2. Humingi ng kopya ng
> accreditation certificate. 3. Itanong kung aling allowance ang galing sa
> barangay at alin sa munisipyo — isulat sa contact sheet.
