# Chapter 2 authoring package

This package executes the source-mapping and sample stages of the incorporation plan. It is deliberately outside the live `day1-basic-competencies/modules` tree. Do not treat it as a loadable or published Chapter 2 delivery course.

- `chapter-blueprint.json`: seven subchapters / 55 lesson boundaries, task and practice IDs, source crosswalk and shared hours.
- `drafts/01-difficult-situations`: four complete bilingual lesson drafts using the existing reference lesson contract; 12 concepts, 28 Read sections, 28 separately authored Slides, eight checks, private guides, four activity kits, four original diagrams and a transfer package.
- `claim-review-queue.json`: clinical/policy questions that must be resolved during later authoring; no claims have been clinically signed off.
- `standards-status.json`: implemented content versus platform work still needed.
- Source text and hashes: `docs/source-material/chapter2-common-competencies/`.

Run `node scripts/chapter2-validate.mjs` for local, read-only validation. It uses the current reference parser and checks the chapter map, hour allocation, draft isolation, density, rubric/guide alignment and printable material links. Run `npx vitest run scripts/tests/chapter2-content.test.mjs scripts/tests/chapter2-preview.test.mjs` for regression, rejection and DOM simulation tests. DOM simulation does not establish visual layout or assistive-technology behavior.

Run `node scripts/chapter2-preview.mjs --output <review-directory>` to generate separate learner and private facilitator HTML review files. The learner file intentionally contains no facilitator notes. These files are local review artifacts, not production app routes. Their print styles supply participant and observer sheets without a network connection. Staff must distribute learner cards separately from private answer material.

The source allocation for behavior is 10 hours; the four session outlines total 600 minutes. For large groups, plan enough observed rounds/staff; the timetable does not prove competence or replace extra practice. The other three competency allocations remain in the blueprint. Community mobilization and DRRM share two hours within the guide's 12-hour first-aid group.

Next gate: review the 2.1 sample's language, pacing, visuals and facilitation usability, then continue the remaining six subchapters. This is not an independent content approval, clinical endorsement, formal certification or production release. No Chapter I content, questions, IDs, historical progress, certificates or database state changes.
