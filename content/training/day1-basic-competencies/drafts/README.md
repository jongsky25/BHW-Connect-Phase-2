# Chapter I, 1.6–1.9: authoring drafts

Status: first bilingual authoring pass, 25 September 2026. **Not staged or published.**

This directory contains the 16 short lessons planned for 1.6–1.9. Each lesson has native Reference Manual authoring files: Read in Filipino and English, separately written Slides, a three-option formative check, one practical objective, a specific observation indicator with three levels, and private facilitator guides. There are 81 Read sections and 81 slides, covering all 38 existing non-excluded concepts.

Drafts are deliberately outside `modules/*/lessons`. The loader and narration discovery use that production authoring path. Do not point the release process at these drafts or move them there until the review work in `docs/chapter-1-6-1-9-draft-review.md` is complete. They contain no approved visuals or narration. An empty asset array is not evidence of visual approval.

The `module.json` and `coverage.json` files are frozen copies of existing metadata at main `6c5e05ab16c0290072c6c67e6ed8ad56436b76b3`, used for offline validation. The copies do not replace the authoritative files under `modules`. The validator detects drift and requires reconciliation rather than silently overwriting either side. Existing module IDs, legacy lessons, question banks, locks and progress are untouched.

Run from the repository root:

```sh
node scripts/training-validate-drafts.mjs
```

The command is offline and has no Supabase client. It checks bilingual structure, exact legacy concept coverage, private-note separation, observation schema, slide limits, new key collisions, frozen metadata, inventory consistency and the proposed facilitated-time totals. These checks do not establish clinical, pedagogical, language or visual approval.

Facilitator files remain staff-only material. Do not place them in `public/`, learner props, narration input or a learner download. The existing private-note loader boundary still applies when these lessons are eventually promoted.

The editable files in each lesson folder are the draft source of truth. The one-time local conversion helper is not part of the release or repository. `inventory.json` records the proposed order and facilitated timing; maintain it when editing the lessons.
