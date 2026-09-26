# Handoff: enhancing the Chapter 2.3 handrub clip

Written 26 September 2026. It is for a new session picking up the Remotion
handrub clip. Read `docs/session-handoff.md` §1 first for how to work in this
repository, then this.

The owner asked for two things:

1. **Separate the clip from slide 4 of 7.** It is inserted into the lesson's
   `example` section, where it looks out of place. **Plan this first and get
   the owner's decision before building.**
2. **Add audio narration, and pace each step of the clip to it.**

---

## 1. Current state

### The clip

- Source: `remotion/src/hand-hygiene/` (`HandrubSteps.tsx`, `Hand.tsx`,
  `steps.ts`), registered in `remotion/src/Root.tsx`. Remotion 4.0.526.
- 854×480, 30 fps, 27 s. Timing is hardcoded in `HandrubSteps.tsx`:
  `INTRO = 45`, `STEP = 84`, `LAST_STEP = 72`, `SUMMARY = 105` frames, laid
  out with `<Series.Sequence>`.
- Eight WHO handrub steps (`HANDRUB_STEPS` in `steps.ts`). Labels are
  bilingual on screen, so one muted file serves both languages.
- Rendered with `npm run remotion:render -- HandrubSteps handrub-steps
  --public training/chapter2-draft`. `scripts/remotion-render.mjs` renders
  **`--muted`** (H.264, CRF 28) and warns above about 50 KB/s. The poster is
  the last frame.
- Committed output: `public/training/chapter2-draft/handrub-steps-2f831aea2a9b.mp4`
  and `handrub-steps-469d5db8110b-poster.jpg`. Names carry content hashes.
- `.github/workflows/remotion.yml` lints, typechecks and renders every
  composition in CI when `remotion/**` changes. It never calls a TTS API, so
  any audio the composition uses must be committed.

### Where it sits in the lesson

Draft source:
`content/training/chapter2-common-competencies/drafts/03-infection-control/lessons/hand-hygiene/`
(`lesson.json`, `read.{fil,en}.md`, `slides.json`).

The lesson has seven sections and seven matching slides:

| # | Section / slide | Assets | Check |
|---|---|---|---|
| 1 | `scene` | | |
| 2 | `action` | `action-sequence` (SVG) | |
| 3 | `check-start` | | yes |
| 4 | **`example`** / `slide-example` | **`handrub-steps`** | |
| 5 | `scope` | | |
| 6 | `check-transfer` | | yes |
| 7 | `next-step` | | |

Why it looks out of place: the `example` text is about rinsing, drying with a
single-use towel, closing the tap, and the 40–60 s wash and 20–30 s rub
times. The clip is an 8-step handrub technique demo. The section is
narrated in Read mode, so the page also has two unrelated players side by
side.

### How it renders

- `src/components/elearning/reference-lessons.tsx:128-130` renders each
  section's or slide's `asset_ids` through `LessonAssetFigure`.
- `src/components/elearning/lesson-asset-figure.tsx` renders
  `<video controls muted playsInline preload="none" poster>`, with a "Steps as
  text" disclosure showing the alt text. It never autoplays.
- Modes are only `read` and `slides` (`LessonModality` in
  `src/lib/elearning/types.ts:23`, and a DB check in
  `supabase/migrations/20260924000000_training_lesson_foundation.sql:91`).
  A new mode would need a migration.
- `course_lesson_revisions.assets` is `jsonb` with only an "is an array"
  check. New asset fields need no migration.
- The asset schema is enforced in `validateReferenceLesson`
  (`scripts/lib/reference-content.mjs:218-280`: allowed fields, `.mp4` under
  `/training/`, 1–90 s, raster poster). The TypeScript type is
  `LessonAsset` / `LessonAssetVideo` in `src/lib/elearning/types.ts`.
- `scripts/chapter2-preview.mjs` (`figureHtml()`) renders the same asset in
  local review HTML. Keep it in step with the app.

### Live state (production)

- The clip was promoted to Los Baños production on 26 Sep 2026 (PR #126).
  The `hand-hygiene` lesson (`b9f69e51-…`) serves revision
  `a0e10ae4-40c3-4f80-b6e2-a9d19ef3e7e7`, with `handrub-steps` approved and
  attached to `example` / `slide-example`.
- Record of that: `content/training/chapter2-common-competencies/release/los-banos-2026-09-26-handrub-clip.json`
  and `drafts/03-infection-control/review.json` (`asset_visual_approvals`,
  `blocking_reviews_attestation`).
- Because `handrub-steps` is now live, the **normal** release script
  `scripts/chapter2-lessons-release.mjs` carries later edits of it (same
  asset id). **Do not reuse `scripts/chapter2-promote-handrub-clip.mjs`.** It
  was a one-time exception and exits early once the asset is live.

---

## 2. Task 1: separate the clip (plan, then owner decision)

Write the options up for the owner and ask them to choose. Do not build
until they have. Constraints any option must satisfy:

- **`chapter2-validate.mjs` lesson arc (`:93-95`).** The last section must be
  `next-step`, and `example` and `scene` must exist. Checks may be **at most 3
  sections apart**. Today the gaps are exactly 3 (`scene, action, check-start`
  and `example, scope, check-transfer`). **Inserting any new section before
  `check-transfer` fails validation.** The only free slot is between
  `check-transfer` and `next-step`.
- **Read and Slides parity.** Every section has a matching `slide-<id>`, and
  checks must match between modes (`chapter2-validate.mjs:66`).
- **Filipino density** (`chapter2-validate.mjs:79-92`). At most 80 words per
  Read section, most sentences 20 words or fewer, none over 30. Slides: at
  most 4 lines, 70 characters per line, 280 characters.
- **Coverage.** Each section and slide lists `concept_ids`, and
  `coverage.json` must still hold. A demo section belongs to
  `c2.ipc.hand-technique`.
- **Any new or changed section needs:** owner content approval, a revision
  bump through the release script, and a Read-mode narration re-render for
  that section (`npm run training:narrate`, see `content/training/README.md`).

Options to put to the owner:

**A. A dedicated demo section and slide after `action`, and relax the check-spacing rule for it.**
- Add a section such as `demo` ("Panoorin: 8 hakbang ng handrub" / "Watch:
  the 8 handrub steps") right after `action`, which introduces the method.
  Give it a matching `slide-demo`. Move `handrub-steps` there, off `example`.
- Change the check-spacing rule so a media-only section does not count
  toward it. Add a flag, or a rule for sections whose only content is a
  video asset.
- Best teaching order: the method, then the demonstration, then a check.
- Cost: a validator change, a new section, and re-narration of one section.

**B. A dedicated section and slide between `check-transfer` and `next-step`.**
- Passes today's validator unchanged.
- Weaker order: the demo comes after the learner has already been checked
  on the method.

**C. A lesson-level "Panoorin" (Watch) block, outside the section flow.**
- Add a revision-level field, for example `featured_asset_id`, or a
  `placement: "lesson"` field on the asset. `ReferenceLessons` shows it as
  its own card near the top of the lesson in both modes.
- No new section, so none of the arc, parity, density or check-spacing rules
  apply.
- Cost: a schema field in the validator and types, UI in
  `reference-lessons.tsx`, and a decision on whether watching counts toward
  completion (today it doesn't).
- Scales to future clips without redesigning lessons.

Recommendation: **C**. It is exactly "not an insert", keeps the lesson text
untouched (no content re-approval or re-narration), and gives future clips a
home. Offer A if the owner wants the clip inside the lesson's step order.

Whichever option: remove `handrub-steps` from `example` and `slide-example`,
and keep `example` as it is.

---

## 3. Task 2: narration, with each step paced to it

### Design

1. **Narration script.** For each language, write one short sentence per
   beat: intro, the 8 steps, and a closing line. Follow the WHO wording the
   on-screen labels already use (`steps.ts`). This is new clinical text, so
   **the owner approves it before any audio is rendered**. Keep it in a
   committed file next to the composition, for example
   `remotion/src/hand-hygiene/narration.ts`, holding the text for both
   languages.
2. **Synthesize with the approved voice.** Gemini `gemini-3.8-flash-tts`,
   voice `Kore`, via `synthesizeZoneText` / `synthesizeWithGemini` in
   `scripts/lib/tts-providers/gemini.mjs`.
   - Render one clip per beat, so each step's length is known exactly.
     `synthesizeWithGemini` already returns per-zone `start_ms` / `end_ms`.
   - Send `spokenText()` (`scripts/lib/reference-narration.mjs:60`) so
     acronyms are spelled out.
   - Write a small script, for example `scripts/remotion-narrate.mjs`. It
     should write the audio plus a timings JSON under `remotion/public/`
     and commit both, so CI renders without an API key.
   - Prefer WAV/PCM from `decodePcm()` over MP3 as Remotion input. That
     avoids encoding twice with lossy codecs and the lamejs silence trap.
3. **Pace the composition to the audio.**
   - Read the timings JSON and derive frame counts in Remotion's
     `calculateMetadata`: each beat lasts its audio plus a short pad
     (about 0.4 s).
   - Replace the hardcoded `INTRO`/`STEP`/`LAST_STEP`/`SUMMARY` with those
     values, and play each beat's audio with `<Audio>` inside its
     `<Series.Sequence>`.
   - Keep the hand motion looping inside each step, since it already derives
     from `frame / fps`.
   - Keep the static all-steps summary as the last frame; it is the poster.
4. **One render per language.**
   - The browser cannot reliably switch audio tracks, so render
     `HandrubSteps-fil` and `HandrubSteps-en` from one component with
     a `language` prop.
   - On-screen labels may then be single-language per render. Decide this
     with the owner.
5. **Unmute the pipeline.**
   - Add a flag to `scripts/remotion-render.mjs`, such as `--with-audio`,
     that drops `--muted`. Encode AAC mono at 32–48 kbps.
   - Update the header comment (lines 3-5 say narration is separate).
   - Re-check the ~50 KB/s size warning against the longer clip plus audio,
     and record the result.
6. **Schema and UI for per-language video.**
   - Extend the asset, for example `video: { path, content_hash, duration_s }`
     becoming `videos: { fil: {...}, en: {...} }`, or `video_fil` /
     `video_en`.
   - Update `validateReferenceLesson` and its tests
     (`scripts/tests/reference-content.test.mjs`), plus `LessonAssetVideo` in
     `types.ts`.
   - `LessonAssetFigure` picks the video by `en` and **drops `muted`**. Keep
     `preload="none"` and no autoplay.
   - **Add a WebVTT captions track** generated from the same timings. A
     video with speech needs captions, and the alt-text disclosure is not a
     substitute.
   - Update `scripts/chapter2-preview.mjs` `figureHtml()` and
     `lesson-asset-figure.test.tsx`.

### Traps

- **Real handrub time is 20–30 s.** The lesson teaches that. The current
  clip is 27 s; narrated, it may run 40–60 s. The clip must not imply that
  the handrub itself takes that long.
  - Keep sentences short.
  - Say so in the intro or closing line, for example "sa totoong buhay,
    20–30 segundo lang" ("in real life, only 20–30 seconds").
  - Or keep a caption to that effect on screen.
  - Get the owner's call on the wording.
- **Silent audio.** On 25 Sep, lamejs shipped silent 32 kbps MP3s.
  - Before rendering, decode every narration file and assert a peak above
    0.05. The Chromium `OfflineAudioContext` check in
    `docs/narration-visuals-realignment-handoff.md` §8 step 6 works.
  - After rendering, play the MP4 once and confirm it has sound.
- **Validator limits.** `duration_s` must be an integer from 1 to 90
  (`reference-content.mjs:273`). Check the narrated length stays within it,
  or raise the limit deliberately.
- **Gemini policy.** `docs/free-ai-leverage-plan.md` §2 ("Owner-approved
  exception: offline narration rendering") approves the direct Gemini call
  only from `training:narrate` / `training:tts`, and only for published
  `admin_authored` lesson text. A new `remotion-narrate.mjs` script and new
  clip text fall outside that wording. Ask the owner to extend the
  exception, and record their answer there. It is about 20 requests per language,
  far under the 1,200/day ceiling. `GEMINI_API_KEY` must be set in the
  environment.
- **Deploy order.** Media is served from `public/`, so it goes live only
  when merged to `main` (Vercel deploys `main`). The lesson's DB revision is
  published separately by script. **Merge and deploy the new MP4s first,
  then publish the revision that points at them.** The reverse order gives
  learners a broken video. Content-hashed names mean the old files keep
  working until then; delete superseded files in a later PR.

---

## 4. Suggested order

1. Read this doc and the INC-28 section of `docs/training-modules-plan.md`
   (about line 1659).
2. Write the placement options (§2) and the narration script (§3.1) and
   send both to the owner in one message. Wait.
3. Build the narration pipeline and the audio-paced composition. Render a
   Filipino sample and send it to the owner. Wait for approval before the
   English render and the lesson wiring.
4. Implement the chosen placement, the schema and UI changes, captions, and
   tests.
   - Run `node scripts/chapter2-validate.mjs`.
   - Run the chapter2 vitest suites listed in
     `content/training/chapter2-common-competencies/README.md`.
   - Run `npm run lint` and `npm run typecheck`.
5. Open a draft PR with the media and code. Merge it: that deploys the files.
6. Record the owner's approvals in `drafts/03-infection-control/review.json`
   and a new dated file under `release/`, following the existing
   `asset_visual_approvals` convention.
   - Keep source `review_status: "draft"`; `chapter2-validate.mjs` requires it.
   - Run `node scripts/chapter2-lessons-release.mjs --project ltzicxyefizxoqhfuuzc --modules 03-infection-control`
     (dry run), read the diff, then add `--apply`.
7. Verify on the chapter route in a browser: Read and Slides modes, both
   languages, sound, captions, reduced motion, the poster.
   - It needs an app account on the pilot (see
     `docs/narration-visuals-realignment-handoff.md` §6); ask the owner once.
   - Lesson URL: `/training/8dfe8b88-84ce-4e60-a353-93031eceda59/chapter-2/609cab9b-d846-47b1-8e93-fdc6d4a362de/b9f69e51-34bc-46ce-b2d3-821056a44f7b`.

## 5. Decisions for the owner

1. Placement: A, B or C (§2). Recommendation: C.
2. Narration script wording in both languages, including how the 20–30 s
   real-time point is made.
3. On-screen labels: keep bilingual, or match the narration language per
   render?
4. Does the Gemini script-only exception cover the new narration text?
5. Should watching the clip count toward lesson completion? Only for option C.
