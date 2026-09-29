# Chapter III offline staging package

This package prepares **The BHW as a Primary Care Advocate** for draft staging in the BHW Reference Manual program. It contains 12 subchapters and 65 bilingual lesson drafts. The planned facilitated allocation is **392 hours**. The guide's overview says 384 hours, while its detailed monitoring table yields 392; the owner chose the detailed basis for planning. The three/five-hour split of the guide's shared 3.1–3.2 block is an authoring proposal.

## What is here

- `chapter-blueprint.json`: stable keys, objectives, practice, indicators, source pages and hours.
- `lesson-cards.json` and `lesson-localization.tsv`: editable authoring source. Two full cards (3.1.3 and 3.10.1) are individually authored; the other 63 are generated from localized case/action rows.
- `drafts/<subchapter>/`: Read and Slides content, checks, lesson facilitator notes, observer sheets, practice, module guide, facilitated activity cards, transfer prompts and job aid.
- `review-queue.json`: one pending review record per lesson. No reviewer or current clinical authority is fabricated.
- `local-configuration.template.json`: empty fields for the authorized local team to verify after staging.

The drafts use fictional residents and synthetic records. They intentionally avoid fixed 2022 clinical thresholds, vaccine schedules, medicine instructions and service promises. Some lesson examples and activity cards are still editorial drafts; structural validation does **not** establish clinical accuracy, teaching quality or local readiness. The module hours represent facilitated training time, not time awarded for opening the digital lessons.

## Offline build and validation

Run from the repository root:

```sh
node scripts/chapter3-build-blueprint.mjs
node scripts/chapter3-fill-cards.mjs
node scripts/chapter3-author.mjs
node scripts/chapter3-validate.mjs
node scripts/chapter3-stage.mjs --check
```

The last two commands do not read credentials or contact Supabase. Regeneration overwrites files under `drafts/`, so edit the source blueprint/crosswalk, localization rows, full cards or generator rather than a generated lesson file.

## Migration boundary

The current owner instruction is to finish preparation and **wait for an explicit migration trigger**. No project mode of `chapter3-stage.mjs` should run yet, including its remote dry run. Once triggered, follow `docs/chapter-3-draft-staging-runbook.md`. The staging script creates or reconciles a draft course, its 12 modules, 65 unpublished lesson revisions and private module/lesson guides. It has no publish switch and does not link Chapter III to the learner program. Review in the system follows staging; publication remains a separate decision after the review queue and local configuration are completed.
