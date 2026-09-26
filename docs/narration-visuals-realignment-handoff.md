# Handoff: realigning narration and animated-visual work with the chapter route

Written 25 September 2026, after PR #119 was merged. It is for a new session
picking up voice, narration or animation work. Read `docs/session-handoff.md`
§1 first for how to work in this repository. This document covers **what**
to work on next and **why the previous direction is being corrected**.

---

## 1. Summary

INC-27 (narration) and INC-28 tier 1 (scenes that build up as the narration
plays) were built for the **legacy one-page-per-module view**
(`/courses/:id` → `LessonModule`). No learner on Chapter I or Chapter II
reaches that view any more. Learners use the **chapter route**
(`/training/:program/:chapter/:subchapter/:lesson`), which the reference
redesign made canonical. That route has its own narration pipeline and its
own visuals. Neither the Gemini voice (PR #119) nor the scene build-up feeds
the chapter route.

What carries forward from the PR #119 session:

- **The owner approved the Gemini Filipino voice** (`gemini-3.8-flash-tts`,
  voice `Kore`) after hearing a Module 1 sample on 25 Sep.
- The Gemini provider code works against the live API: 24 sections rendered
  with no rate limits hit.
- The build-up mechanism and its e2e test are correct. They sit in the wrong
  renderer.

What does not carry forward:

- The 24 Gemini rows written to the pilot's `course_module_audio` for legacy
  Module 1. No learner-facing screen reads them.
- The INC-27/INC-28 definitions of done ("Module 1 … in the module view") in
  `docs/training-modules-plan.md`.

---

## 2. Terms: chapters, sub-chapters, modules, sections

The learner-facing structure is **Program → Chapter → Subchapter → Lesson**
(`docs/bhw-reference-implementation-plan.md:7`, `:38-41`).

| Learner sees | Stored as | Example |
|---|---|---|
| Kabanata 1 | `courses` row, mapped via `program.json` | `day1-basic-competencies` course |
| Subchapter 1.1 | `course_modules` row; content folder `modules/01-…` | `01-tungkulin-ng-bhw` |
| Lesson 1.1.1 | `course_lessons` + `course_lesson_revisions`; folder `modules/01-…/lessons/<key>/` | `bhw-roles-hepo` |
| (not shown) | a "section" is one `## [id] Heading` block of a lesson's `read.*.md`, the unit of narration and read-along | `hepo` |

- "Module" is the retained internal and database identity of a subchapter
  (`content/training/README.md:11-12`, `:147-149`). Renaming a module folder
  orphans its database row.
- The app created the 1.1–1.9 numbering. The manual's Kabanata I has eight
  unnumbered topics. The nine groupings are an instructional design choice
  (`bhw-reference-implementation-plan.md:45`,
  `bhw-reference-reconciliation.md:15`).
- Chapter I has no stored `code` field. Numbers are computed from display
  order (`src/app/training/[programId]/[[...path]]/page.tsx:140` uses the loop
  index; `:145` uses `position`). Chapter II stores codes in
  `chapter-blueprint.json`.

---

## 3. The two pipelines

| | Legacy module view | Chapter route (canonical) |
|---|---|---|
| URL | `/courses/:id` | `/training/:program/:chapter/:subchapter/:lesson` |
| Who reaches it | Only courses **not** mapped to an available chapter: console-made courses and e2e fixtures. Mapped courses redirect (`src/app/courses/[id]/page.tsx:129-130`), except a BHW with `?assessment=1`, who sees only the tests and certificate. | Every learner, for Chapter I and Chapter II |
| Content source | `modules/<m>/lesson.{fil,en}.md` → `course_modules.lesson` | `modules/<m>/lessons/<key>/` → `course_lesson_revisions` |
| Narration script | `npm run training:tts` → Supabase `course_module_audio` | `npm run training:narrate` → committed `public/training/audio/**` + `content/training/day1-basic-competencies/narration.json` |
| Voice providers | Azure / edge-tts / **Gemini** (PR #119) | **Edge only**; hard-imported at `scripts/training-narrate.mjs:36` |
| Narration coverage | Pilot: Module 1 only, 24 sections, written 25 Sep | All 97 lessons, 530 sections × 2 languages (Chapter I: 42 lessons, 1,877 sentences, about 181 min; Chapter II: 55 lessons, 3,907 sentences) |
| Audio in Slides mode | yes | **no** (Read mode only) |
| Visuals | `course_module_visuals`, inline sanitized SVG | `revision.assets` → `<img>` / `<video>` (`src/components/elearning/lesson-asset-figure.tsx:19`, `:25`) |
| Visuals synced to narration | yes: `data-scene-step` build-up (`lesson-module.tsx:252-300`) | **none**; only the sentence being read is highlighted |
| Remotion clip | no | yes: handrub steps, Chapter 2.3, promoted to production 26 Sep 2026 |
| e2e test for narration | `e2e/lesson-narration.spec.ts` | **none**; unit tests only (`reference-read-section.test.tsx`, `scripts/tests/reference-narration.test.mjs`) |

Legacy code is still used in two places:

- `/training-sessions/[id]` (`FacilitatorModuleView`, assessor-only) renders
  `module.lesson` and the legacy SVGs, without audio.
- The rollback plan switches a program back to the legacy reader
  (`bhw-reference-implementation-plan.md:306`).

Neither place needs narration.

---

## 4. Assessment against the overall direction

1. **Wrong target.** INC-27 and INC-28 tier 1 were scoped before the
   chapter redesign (`training-modules-plan.md:1473-1691`). The redesign
   already said new audio should be keyed by "lesson revision + stable
   section/slide ID" (`bhw-reference-implementation-plan.md:269`). The
   Gemini provider was nonetheless added to the legacy script. That is the
   misalignment this handoff corrects.
2. **The chapter route already narrates everything.** Read-mode audio exists
   for all 97 lessons. So on the chapter route, "narration" work now means
   voice quality (Gemini instead of Edge), Slides-mode audio, and a size
   budget. It does not mean coverage.
3. **The voice upgrade is the most valuable piece**, and it is cheap to move.
   The owner has approved the voice. Wiring Gemini into `training:narrate` is
   about 30–60 lines (details in §5, step A1).
4. **Scene build-up is a feature for later, not a fix.** It needs inline SVG
   rendering, progress plumbing and asset authoring on the chapter route
   (§5, Track B). The one scene authored so far, the legacy three-duties
   diagram, is also mistimed. The narration names all three duties in one
   sentence (0:18–0:33 Filipino), but the diagram reveals them one sentence
   apart. Community Organizer appears at 0:33 and Health Service Provider at
   0:46, while the narrator has moved on to the knowledge prerequisite.
   Build-up only works if the lesson text is written for it: one sentence
   per element revealed.
5. **Compliance debt from the Gemini provider.**
   - `scripts/lib/tts-providers/gemini.mjs:22` calls the Gemini API directly
     under a lint exception. It bypasses `callProvider()`, writes no
     `ai.external_call` audit event, and is not counted against the
     1,200/day ceiling. `free-ai-leverage-plan.md:42`, `:48` require all of
     those.
   - The content sent is `admin_authored` published lesson text, which
     Tier B permits (`:31`).
   - The PR asked for the owner's OK on this exception. That OK is not
     recorded.
6. **The audio size budget is already exceeded.**
   - The capacity-building standard asks for ≤32 kbps and ≤1 MB per lesson.
   - Current narration is 48 kbps and 154 MB committed.
   - The Gemini encoder also defaults to 48 kbps.
   - A full re-render is the cheapest moment to fix this.
7. **Priority relative to the content roadmap.** The September content
   assessment judged the package "built to prove coverage, not to build
   capacity" (`content-assessment-2026-09.md:42`). Its Phase 1 roadmap is
   rewritten objectives and checks, "Sa Lunes, gawin ito" (a "do this on
   Monday" action for each lesson), and job aids (`:505-553`). Voice and
   animation are polish on top of that. Their priority is the owner's call
   (§7, decision 1).

---

## 5. Plan

### Track A — Gemini voice on the chapter route (recommended first; small)

**A1. Add a provider option to `training:narrate`.**
- Add `--provider edge|gemini` (default `edge`).
- Pass a voices map into `planReferenceNarration` / `buildManifest`
  (`scripts/lib/reference-narration.mjs`). The manifest's top-level
  `voices` is hardcoded to `NARRATION_VOICES` (`:202`).
- Include `geminiVoiceId()` in the content hash. Filenames then change and
  a provider switch re-renders cleanly.
- For Gemini, use `synthesizeWithGemini`'s bytes and timings directly and
  skip `assembleNarration`.
- **Trap:** synthesize `spokenText(zone.text, lang)` (acronym spelling,
  `/`, `**` stripped), but write the **display** text into `timings[i].text`.
  Otherwise `timingsMatchSection` fails and the player silently disappears.
  The Gemini path in `training:tts` currently sends raw `zone.text`
  (`scripts/tts-render.mjs:114-116`). Fix that there too, or leave the
  script frozen (A5).
- Resume behaviour: finished sections are skipped by hash, the same as
  today.
- Add unit tests beside `scripts/tests/reference-narration.test.mjs`, using
  a fake `fetch` the way the #119 provider tests do.

**A2. Bitrate.**
- Encode at 32 kbps mono.
- Check a sample by ear. Confirm the per-lesson total is ≤1 MB, or record
  why not.

**A3. Sample, then get the owner's approval.**
- Render lesson 1.1.1 (`bhw-roles-hepo`) locally in Filipino and send the
  MP3.
- The owner approved the voice on legacy text. Re-confirm it on reference
  text before bulk rendering.

**A4. Bulk render, Chapter I first.**
- Chapter I is 1,877 requests: about 2 days at the 1,200/day ceiling.
  Re-runs resume.
- Chapter II is 3,907 requests. Do it only after the owner listens to
  Chapter I.
- Output is committed files, with no Supabase write (README `:71-86`).
- Delete superseded MP3s in the same commit so the repository does not grow
  to about 300 MB.
- Deploying makes it live. Say so in the PR, because merging the PR is the
  release.

**A5. Freeze the legacy path.**
- Mark `training:tts` and `course_module_audio` legacy in
  `content/training/README.md` and `training-modules-plan.md`.
- Do not delete code the rollback plan relies on.
- Decide what happens to the 24 Gemini rows (§7, decision 4).

**A6. Verify in the real app.** See §6.

### Track B — Narration-synced visuals on the chapter route (later; medium)

Only if the owner wants it after Track A.

- **B1. Render SVG assets inline.** Make them sanitizable
  (`src/lib/elearning/svg-allowlist.ts`) instead of `<img>`, for assets that
  declare scene steps. Keep `<img>` for everything else.
- **B2. Pass playback progress.** Feed progress from the reference Read
  player (`reference-read-section.tsx`) to that section's asset. Reuse
  `isSceneStepRevealed` and the globals.css rules. Keep the rule that reduced
  motion or not playing shows the finished picture.
- **B3. Rewrite for build-up.** Rewrite the 1.1.1 `hepo` section so each
  duty has its own sentence. Add `data-scene-step` to a 1.1.1 hub-and-spoke
  asset. This is lesson-text work, so it needs the owner's content approval,
  a revision bump, and re-narration.
- **B4. Add the manual-route narration e2e that does not exist yet.** Cover
  play, sentence highlight, build-up, reduced motion and axe.
- **B5. Rewrite INC-28's definition of done** in `training-modules-plan.md`
  to target the chapter route.

### Track C — Documentation realignment (do this alongside A)

These are stale against the current state:

- `training-modules-plan.md`
  - `:162` frames the course as "Day 1 … Chapter 1 only".
  - `:25` still marks INC-25 blocked.
  - The INC-27/28 definitions of done target the legacy view.
- `session-handoff.md`
  - "Last updated: 24 September".
  - Tracks Module 1 / Araw 1 IDs at `:144-148`.
  - Lists Azure as owed at `:306`.
- `bhw-progress-plan.md:20` still calls 1.6–1.9 unpublished and Chapter II
  unavailable.
- `bhw-next-lessons-draft.md:3` says 1.2–1.5 are not published.
- These still say Chapter II is unavailable; it was published 25 Sep:
  - `chapter-2-execution-record.md:3`, `:9`
  - `bhw-reference-foundation.md:3`
  - `bhw-manual-navigation.md:14`
  - `bhw-reference-content-approval.md:43`
- `bhw-manual-navigation.md:14` calls 1.6–1.9 "source-defined"; they are
  app-defined groupings.
- UI terminology (separate small PR):
  - Filipino chapter screens mix untranslated "subchapter" (`page.tsx:81`,
    `:95`; `messages/fil.json:917-935`) with "subkabanata"
    (`messages/fil.json:717`, `:733`).
  - "Modules/Modyul" is still on the posttest-lock message
    (`messages/en.json:801-804`), the session roster (`:876`) and admin
    progress (`:692`).

---

## 6. Verifying in the real app

- The loader account (`KB_LOADER_USERNAME`) signs in for scripts over
  PostgREST, but the **app** login rejects it ("Mali ang username o
  password"). It has no matching `public.users` row for
  `rpc_login_precheck`.
- To see the chapter route on the pilot you need an app account: one of the
  E2E stable accounts (`.env.example` names `E2E_STABLE_BHW_PASSWORD` and
  others), or one the owner provides. None were set in this container.
- Ask for one once, at the end of your turn, per the working agreement.
- A working local recipe:
  1. `NEXT_PUBLIC_SUPABASE_URL=https://ltzicxyefizxoqhfuuzc.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=$KB_LOADER_ANON_KEY npx next dev`
  2. Run Playwright with `executablePath: '/opt/pw-browsers/chromium'`. The
     pinned Playwright expects a different headless-shell build.
- Do not probe the pilot's `users` table from scripts. The session's safety
  classifier blocks it as personal-data handling.

---

## 7. Decisions for the owner

**Decided 25 September 2026: the owner accepted every recommendation
below.** In short:

1. Do Track A now.
2. Re-voice Chapter I first. The owner listens before Chapter II is decided.
3. The direct Gemini call is approved and recorded in
   `free-ai-leverage-plan.md` §2.
4. Leave the 24 legacy rows.
5. Track B is deferred until after the owner has listened to the re-voiced
   Chapter I. The rewrite of 1.1.1's `hepo` section is **not** approved yet.

The original questions, for the record:

1. **Priority.** Voice upgrade (Track A) now, or content-capacity Phase 1
   first (`content-assessment-2026-09.md:505-553`)? Recommendation: Track A
   now. It is small, and the owner has already approved the voice.
2. **Scope of the re-voicing.** Chapter I only, or Chapter I and II?
   Recommendation: Chapter I, listen, then decide on II.
3. **The Gemini policy exception.** Approve the direct script-only call for
   published lesson text, or require routing through the AI adapter with an
   audit event? Recommendation: approve, and record it in
   `free-ai-leverage-plan.md`. It is offline authoring of public text, not
   feature code.
4. **The 24 legacy rows** in `course_module_audio`, from Module 1 on 25 Sep.
   Leave or delete? Recommendation: leave; they are harmless and unused.
   Their MP3s sit in the public `training-audio` bucket under the Module 1
   row ID. If deletion is wanted, confirm which admin-scoped path
   `scripts/tts-render.mjs` writes through, and delete through that same
   path.
5. **Track B.** Wanted at all? If yes, approve rewriting 1.1.1's `hepo`
   section so each duty gets its own sentence.

---

## 8. Handoff: finish Chapter I in one run (written 25 Sep 2026, 16:30 UTC)

For the next session. Read `docs/session-handoff.md` §1 first.

**PR #124 was merged on 25 Sep 2026 with day 1 done**, at the owner's
request. Production therefore plays Chapter I in mixed voices (Gemini for
182 recordings, Edge for 108) until this run is merged. Cut a **new branch
from `main`** and open a new draft PR for the remaining audio. Merging that
PR is the release.

### Owner decision: no ceiling for this run

On 25 Sep 2026 the owner said to **disregard the 1,200/day Gemini ceiling
for this one run** and finish all remaining Chapter I narration. It applies
to this run only. Other runs still follow `free-ai-leverage-plan.md` §2.
Pass `--max-requests 5000` so the script never stops on its own budget.

### State at handoff

- **Done:** A1, A2, A3 and A5, Track C, and day 1 of A4. The owner approved
  the 1.1.1 Filipino sample after the silent-file fix.
- **Rendered in Gemini:** 182 of Chapter I's 290 section × language
  recordings. That is 177 from day 1 plus the 5 sections of 1.1.1 (fil).
  Commit `8c4de53`.
- **Left:** 108 recordings, about 711 Gemini requests. They still play the
  Edge voice, and the player uses each section's own voice meanwhile.
- **CI** was green on `8c4de53` before the merge.
- **Requests used on 25 Sep:** 1,197 in total (both renders, the 1.1.1
  re-render and two probes). Gemini never returned `429` or any error. The
  key's real quota is unknown; the owner can see it in Google AI Studio.

### Steps

1. **Check the environment.** `GEMINI_API_KEY` must be visible. Check that
   `git status` is clean.
2. **Dry run.** Expect about 108 sections to render and about 711 Gemini
   requests.
   `npm run training:narrate -- --chapter 1 --provider gemini`
3. **Hide in-progress MP3s from the stop hook.** The manifest is written
   only when the run ends, so do not commit mid-run.
   `printf 'public/training/audio/**/*.mp3\n' >> .git/info/exclude`
4. **Render in the background with a log.** It takes about 45–60 minutes
   and outlasts one tool timeout, so watch the log with Monitor for `✓ [N/`,
   `✗`, `failed` and `manifest:`.
   `nohup npm run training:narrate -- --chapter 1 --provider gemini --max-requests 5000 --apply > <scratchpad>/ch1-run2.log 2>&1 &`
   - `--concurrency 3` is the default, and it saw no rate limits. You may
     try 5.
   - If Google starts refusing (`429` after 6 retries, or a quota error),
     the run stops cleanly: finished sections are kept, the rest keep
     their Edge audio, and the manifest is still written. Commit what
     rendered and re-run after 07:00 UTC, when the quota resets.
5. **Remove the exclude line** you added in step 3.
6. **Check for silence (required).** The unit tests cannot hear, and on
   25 Sep a lamejs bug shipped silent 32 kbps files. Decode every Gemini
   file in Chromium (Playwright with
   `executablePath: '/opt/pw-browsers/chromium'`):
   - `OfflineAudioContext.decodeAudioData`, then the peak of
     `getChannelData(0)`.
   - Any file with a peak below 0.05 is silent: stop and investigate.
   - Also add up MP3 bytes per lesson per language from `narration.json`
     (Chapter I lessons are those whose `module` has no `chapter2/`
     prefix). The cap is 1 MB per lesson per language. After day 1, the
     only Gemini lesson over was `communication-explain` (fil, 1.08 MB).
7. **Verify.**
   - `npx vitest run scripts/tests/reference-narration.test.mjs scripts/tests/reference-narration-gemini.test.mjs scripts/lib/tts-providers/`
     (the committed-narration guard must pass)
   - `npm run lint`
   - `npm run typecheck`
   - Confirm every Chapter I entry in `narration.json` now has a
     `gemini:` voice.
8. **Commit and push.** One commit holds the new MP3s, `narration.json`
   and the deleted superseded Edge MP3s: `git add -A` on
   `content/training/day1-basic-competencies/narration.json` and
   `public/training/audio`.
9. **Open the new draft PR.**
   - Say that it completes A4 of PR #124 and give the final per-lesson sizes.
   - Record that the owner waived the ceiling for this run.
   - Keep the release note: **merging is the release**, because deploy
     serves `public/`.
   - Subscribe to the PR's activity and drive CI to green.
10. **A6: verify in a browser** on the chapter route. See §6 for the local
    recipe. It needs an app account on the pilot that the owner has not
    supplied yet; ask for it once, at the end.
11. **Tell the owner Chapter I is done.** Chapter II stays on Edge until
    they decide (§7, decision 2).

### Traps already hit

- **Silent MP3s.** At 32 kbps, lamejs's own 24 kHz → 22.05 kHz conversion
  outputs silence. `encodeMp3` in `scripts/lib/tts-providers/gemini.mjs`
  now resamples first and throws if the header rate differs. Do not
  bypass this.
- **Display text vs spoken text.** Timings must keep the displayed text
  and only the synthesized text is `spokenText`. `renderNarration` in
  `scripts/lib/reference-narration.mjs` does this; keep it that way.
- **Re-runs without `--provider`** keep each section's current voice, so a
  plain `training:narrate --apply` after a text edit will not revert
  Chapter I to Edge.
- **Vercel preview failures** saying "Deployment rate limited — retry in
  24 hours" come from the account's 100 deploys/day. They are not this
  PR's fault.
- **Cancelled e2e jobs.** e2e runs in a repo-wide concurrency group, and a
  newer queued run cancels a pending one. Re-run it once.
