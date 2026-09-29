# Chapter III offline staging package

This package prepares **The BHW as a Primary Care Advocate** for draft staging in the BHW Reference Manual program. It contains 12 subchapters and 65 bilingual lesson drafts. The planned facilitated allocation is **392 hours**. The guide's overview says 384 hours, while its detailed monitoring table yields 392; the owner chose the detailed basis for planning. The three/five-hour split of the guide's shared 3.1–3.2 block is an authoring proposal.

## What is here

- `chapter-blueprint.json`: stable keys, objectives, practice, indicators, source pages and hours.
- `lesson-cards.json` and `lesson-localization.tsv`: editable authoring source. Two full cards (3.1.3 and 3.10.1) are individually authored; the other 63 are generated from localized case/action rows.
- `drafts/<subchapter>/`: Read and Slides content, checks, lesson facilitator notes, observer sheets, practice, module guide, facilitated activity cards, transfer prompts and job aid.
- `review-queue.json`: one pending review record per lesson. No reviewer or current clinical authority is fabricated.
- `local-configuration.template.json`: empty fields for the authorized local team to verify after staging.
- Read narration: 910 Filipino/English MP3 sections under `public/training/audio/chapter3/`, indexed by the shared `content/training/day1-basic-competencies/narration.json` manifest. The new audio uses the existing Edge Read Aloud voices (`fil-PH-BlessicaNeural`, `en-PH-RosaNeural`).

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

Narration is rendered from the exact Read text and is not part of the draft staging database write. After any Read edit, run `npm run training:narrate -- --chapter 3` to find stale sections, then `npm run training:narrate -- --chapter 3 --apply` to re-render only those sections. Run `node scripts/chapter3-narration-validate.mjs` before committing or publishing. Speech quality still needs a human listening review, including Filipino/English pronunciation and acronyms; the automated check verifies presence, hashes, timing and text currency.

## Migration boundary

The owner triggered draft migration on 29 September 2026. Follow `docs/chapter-3-draft-staging-runbook.md` for the target record. The staging path creates or reconciles a draft course, its 12 modules, 65 unpublished lesson revisions and private module/lesson guides. The database requires the draft course to be mapped to Chapter III before lesson inserts; Chapter III remains `unavailable` and the course remains `draft`, so learners cannot reach it. Review in the system follows staging; publication remains a separate decision after the review queue and local configuration are completed.
