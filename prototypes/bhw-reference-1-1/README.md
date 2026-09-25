# BHW Reference Manual Training: subchapter 1.1 review

Work packages 0–1 only. An offline, reviewable prototype of six lessons, with Filipino/English Read, 31 authored Slides including six self-checks, and A01–A07 original SVG/HTML visual sketches. Awaiting the user's approval of content, pacing, and visual treatment. These are original schematic sketches for review, not approved final illustrations.

## Review locally

From the repository root, run `node prototypes/bhw-reference-1-1/serve.mjs` and open `http://127.0.0.1:4173`. The server binds only to the local machine and serves four allowlisted files. No dependencies or environment credentials are required. Use `PORT` to select another port.

Switch Read/Slides or language at any concept. Navigate the six lessons, try each self-check, and reload to resume. Review marks and per-lesson positions are saved under the separate browser key `bhw-reference-1-1-review-v1`. They are demonstration state, never learner completion, competency evidence, test scores, or certificates. Storage failure is handled without blocking reading. No narration is included in this prototype.

`content.mjs` contains explicit bilingual Read paragraphs and separate slide layouts/labels/captions, joined by stable section and concept IDs. Slides do not paginate or interpolate Read paragraphs. Each lesson has an observable objective, source locations, a stopping point, feedback, and a takeaway. Diagrams have live text alternatives; decorative SVGs can disappear without losing essential meaning. No audio, animation, remote fonts, analytics, or network API calls are needed.

## Boundaries

- This folder is outside `content/training` and is not a production-loader input. No existing module, course, progress ID, lock, assessment bank, renderer, migration, or database is changed.
- Chapters II–III are unavailable. Subchapters 1.2–1.9 appear only as course context. The 42-lesson structure is proposed, not a claim made by the manual.
- Estimates of 3–7 minutes are unvalidated independent-study targets, separate from facilitated activity and source training allocations. No digital certificate or practical competence is awarded.
- Facilitator notes are a separate review document, never imported into learner code. They require restricted storage and authorization in later application integration; a static review folder is not an authentication system.
- Final bilingual editorial review, local process validation, current policy verification where applicable, and visual approval remain release gates. This prototype teaches role boundaries, not clinical procedures.

## Continue

Read `docs/bhw-reference-handoff.md`, `docs/bhw-reference-reconciliation.md`, and `facilitator-review.md`. Run `node --test prototypes/bhw-reference-1-1/validate.test.mjs` for the isolated content contract. Shared production schema/loader/parser/renderer implementation begins only after prototype review; do not pass this content to `training:load`.
