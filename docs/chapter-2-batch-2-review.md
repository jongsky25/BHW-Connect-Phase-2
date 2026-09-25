# Chapter 2.2 and 2.6 — review package

25 September 2026. The user approved the Chapter 2.1 sample and requested the next batch: Quality Services and Community Mobilization. This increment authors those eight lessons using the approved format. It does not mark the new lessons as reviewed or published.

## What is ready

| Module | Four lesson tasks | Facilitated outline |
|---|---|---|
| 2.2 Quality Services | Compare service encounters; practise privacy and inclusion; map a service pathway; inspect all seven 7S categories | 120 + 180 + 180 + 120 = 600 minutes |
| 2.6 Community Mobilization | Frame an issue with residents; map invitations and barriers; facilitate a core-group meeting; agree and review an action plan | Four 15-minute introductory activities = 60 minutes |

Each lesson has Filipino and English Read content, seven independently written Slides, two scenario checks with explanations for all choices, an original bilingual diagram, narration scripts, a private facilitator guide, participant cards, a blank worksheet and an observation sheet with retry guidance. Each module includes a job aid and a supervised transfer/recall specification. Recall dates are not scheduled notifications and narration scripts are not recordings.

This batch adds 56 Read sections, 56 Slides, 16 checks, eight diagrams, eight activities, 16 bilingual worksheet files and 28 mapped concepts. With Chapter 2.1, the chapter now has **12 of 55 lessons drafted**; 43 remain outlines.

## Source decisions

- Quality Services: Reference Manual PDF pages 29–30, Facilitator Guide PDF page 34, and presentation PDF pages 29–38. The lesson-specific evidence pages are recorded in each lesson. All seven 7S categories appear in both Read and Slides; the demonstration uses safe props only.
- Community Mobilization: Reference Manual PDF pages 52–54 and Facilitator Guide PDF page 41 provide the substance. Presentation pages 93–94 only name the topic, so they are retained as navigation context in the blueprint and excluded from substantive lesson citations.
- The issue card, invitation map and action-plan columns are teaching adaptations of community participation, local problem solving, accountability and result review. They are not represented as official forms copied from the manuals.
- Sensitive discussion uses privacy and voluntary participation. Attendance is not made a condition for services. The source warning about incentives is taught as avoiding promised attendance rewards; any practical participation support must be confirmed with the organizer under local policy.

## Timing and observation

The guide allocates ten hours to quality service. The four session plans preserve that total; additional practice or observation may still be needed.

The guide combines Community Mobilization and DRRM into **two hours**, within its 12-hour first-aid competency. The **60/60 split is an explicit authoring proposal**, not a separate requirement from the source. This package uses 60 minutes for an introduction to mobilization and reserves 60 for DRRM. Its short exercises do not establish competence for every participant. Facilitators must leave unobserved learners unrated and arrange further supervised practice. Digital reading does not replace facilitated time.

## Review files and privacy

Generate one module at a time:

```sh
node scripts/chapter2-preview.mjs --module 2.2 --output <quality-review-directory>
node scripts/chapter2-preview.mjs --module 2.6 --output <mobilization-review-directory>
```

The default remains the approved 2.1 sample. Only authored modules can generate previews.

- `chapter-2-learner-preview.html`: learner Read/Slides and checks only; preview progress is temporary.
- `chapter-2-participant-workbook.html`: participant cards and blank worksheets; excludes private answer explanations and staff rating anchors.
- `PRIVATE-chapter-2-facilitator-kit.html`: private guides, answers, rubrics, worksheets and job aid. Staff should distribute the separate participant workbook.
- `chapter-2-authoring-validation.json`: authoring checks across all three authored modules.

The files are self-contained, including diagrams. Print controls select one language. Print layout still needs browser inspection.

## Validation and remaining work

Authoring validation checks the existing reference parser, all 12 lesson identities, language/mode parity, source coverage, asset hashes, draft isolation, density, guide/rubric wording, materials and hours. Focused tests also reject copied review identities and misuse of the DRRM time allocation. DOM simulations exercise every new lesson, completion gating, language switching, feedback focus and separation of participant/private materials.

Final local results: **59 tests passed across four files**, authoring validation passed for 12 lessons / 84 Read sections / 84 Slides / 24 checks, and focused ESLint passed. The two-preview generation setup exceeded the initial 10-second test hook limit on this host; a 60-second setup allowance and one-worker run completed successfully.

```sh
node scripts/chapter2-validate.mjs
npx --no-install vitest run scripts/tests/chapter2-content.test.mjs scripts/tests/chapter2-preview.test.mjs scripts/tests/chapter2-batch2-preview.test.mjs scripts/tests/reference-content.test.mjs --maxWorkers=1
npx --no-install eslint scripts/chapter2-validate.mjs scripts/chapter2-preview.mjs scripts/tests/chapter2-content.test.mjs scripts/tests/chapter2-preview.test.mjs scripts/tests/chapter2-batch2-preview.test.mjs
```

Browser visual, keyboard, assistive-technology and print-layout QA remains pending. The earlier local-file browser policy block has not been overridden. DOM simulations do not replace those checks. There has been no clinical endorsement, live course activation, database write, application deployment or change to Chapter I. The 2.1 lesson files are preserved exactly; the user's sample approval is recorded separately in `sample-review.json`.

Next content stages are IPC, first aid, medicinal plants and DRRM, after the required claim verification. The present eight new drafts still need language/instructional review and a BHW/facilitator pilot before publication.
