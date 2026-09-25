# Chapter I, 1.6–1.9: retained authoring snapshots

Status: 1.6–1.8 lesson copies are released under `modules/*/lessons`; their files here remain unchanged snapshots for comparison. Module 1.9 remains an authoring draft and is not staged or published.

This directory contains the 16 short lessons planned for 1.6–1.9. Each lesson has native Reference Manual authoring files: Read in Filipino and English, separately written Slides, a three-option formative check, one practical objective, a specific observation indicator with three levels, and private facilitator guides. There are 81 Read sections and 81 slides, covering all 38 existing non-excluded concepts.

The loader and narration discovery use `modules/*/lessons`, not this directory. For 1.6–1.8, the release validator compares these snapshots with the released copies. Keep 1.9 here until its review work in `docs/chapter-1-6-1-9-draft-review.md` is complete. These snapshots contain no approved visuals; an empty asset array is not evidence of visual approval. Narration for released lessons lives under `public/training/audio` and in `narration.json`.

The `module.json` and `coverage.json` files are frozen copies of existing metadata at main `6c5e05ab16c0290072c6c67e6ed8ad56436b76b3`, used for offline validation. The copies do not replace the authoritative files under `modules`. The validator detects drift and requires reconciliation rather than silently overwriting either side. Existing module IDs, legacy lessons, question banks, locks and progress are untouched.

Run from the repository root:

```sh
node scripts/training-validate-drafts.mjs
```

The command is offline and has no Supabase client. It checks bilingual structure, exact legacy concept coverage, private-note separation, observation schema, slide limits, new key collisions, frozen metadata, inventory consistency and the proposed facilitated-time totals. These checks do not establish clinical, pedagogical, language or visual approval.

Facilitator files remain staff-only material. Do not place them in `public/`, learner props, narration input or a learner download. The existing private-note loader boundary still applies when these lessons are eventually promoted.

For 1.9, the editable files here are the draft source of truth. The released 1.6–1.8 copies under `modules` are authoritative; reconcile any future edits there and update the retained snapshots deliberately. The one-time local conversion helper is not part of the release or repository. `inventory.json` records the proposed order and facilitated timing.

