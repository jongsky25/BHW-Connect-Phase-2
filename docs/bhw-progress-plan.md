# BHW progress view: manual, chapters, subchapters — plan

Status: planned, not started. Agreed with the owner on 24 September 2026.

Goal: a BHW can see at a glance how far along they are in the BHW Reference
Manual as a whole, in each chapter and in each subchapter, and can jump
straight back to where they stopped. Colour codes make the state readable in
one look; text and icons carry the same meaning for anyone who cannot rely on
colour.

## 1. Decisions

| # | Question | Decision |
|---|---|---|
| 1 | Does content not yet published count in the percentage? | **No.** Only published, required lessons count. Unpublished subchapters (currently 1.6–1.9) and unavailable chapters (2–3) are shown as "Coming soon" / "Not yet available", never as 0%. |
| 2 | Do the assessment and certificate count in the chapter percentage? | **No — separate steps.** The percentage measures lessons. Pretest, post-test and certificate appear as a step tracker next to it. |
| 3 | A "My training" card on `/home`? | **Yes.** |
| 4 | Supervisor (admin / facilitator) view of each BHW's progress? | **Yes**, as Phase 3. |
| 5 | Colour-coded, visually appealing progress | **Yes** — see §4. |

## 2. What already exists (no migration needed)

| Level | Table | Progress signal |
|---|---|---|
| Manual | `training_programs` | derived from the levels below |
| Chapter | `training_program_chapters` → one `courses` row | `course_progress.status` (`in_progress`, `content_completed`, `certified`, `failed_assessment`), pretest attempt in `course_test_attempts`, `certificates` |
| Subchapter | `course_modules` | derived from its lessons |
| Lesson | `course_lessons` | `course_lesson_progress` (done), `course_lesson_resume` (last position) |

Today the manual route (`src/app/training/[programId]/[[...path]]/page.tsx`)
shows no progress on chapter cards, a plain "3/6 completed" line on
subchapter cards and "· Completed" on lessons. `/home` and `/courses` show
none.

## 3. What the BHW sees

1. **Manual overview** — a summary header: large progress ring, "12 of 26
   lessons done · 46%", and a **Continue where you left off** button. Each
   chapter card gets a colour-coded bar, a status chip and its lesson count.
2. **Chapter page** — the chapter's bar at the top plus a step tracker:
   `Pretest → Lessons → Post-test → Certificate`, each step coloured by its
   state. Each subchapter card gets its own bar (replacing the text line) and
   a status chip.
3. **Subchapter page** — each lesson shows a status icon (✓ done, ◐ started,
   ○ not started), "Lesson 3 of 6", and the subchapter bar.
4. **`/home` "My training" card** — overall ring, the current chapter's
   status chip and the Continue button. Only for `role = bhw`.
5. **Admins / assessors** — the manual pages stay a preview with no personal
   progress; they get the supervisor view instead (Phase 3).

All labels in Filipino and English, following the existing `text(fil, en)`
pattern.

## 4. Colour codes and visual design

Built only from the existing tokens in `src/styles/tokens.css`, which already
carry separate light/dark values and were contrast-checked there.

| State | Colour token | Icon | Chip label (fil / en) |
|---|---|---|---|
| Not yet available | neutral, dashed outline (`ink/15`) | 🔒 lock | Hindi pa available / Not yet available |
| Not started | neutral grey track (`ink/15`) | ○ | Hindi pa nasisimulan / Not started |
| In progress | `info` (blue) | ◐ | Kasalukuyan / In progress |
| Lessons done — take the assessment | `primary` (marigold) | → | Handa na sa pagtatasa / Ready for assessment |
| Assessment to retake | `warning` (amber) | ↻ | Ulitin ang pagtatasa / Retake assessment |
| Completed | `success` (green) | ✓ | Tapos na / Completed |
| Certified | `success` bar + `celebration` (sampaguita yellow) badge | ★ | Sertipikado / Certified |

Design rules:

- **Never colour alone.** Every state has an icon and a text label; every bar
  prints its number ("4/6 · 67%"). This covers colour-blind users and
  monochrome screens (WCAG 1.4.1).
- **Contrast.** Bar fill against its track ≥ 3:1 (WCAG 1.4.11); chip text
  ≥ 4.5:1 in light and dark mode. Verify with axe plus a manual check of
  each token pair, both themes.
- **Shapes.** Ring for the overall manual total (one per page, the hero);
  horizontal bars for chapters and subchapters; a segmented stepper for
  pretest → certificate. Bars are rounded, at least 8px tall, and chapter
  bars are split into subchapter segments so a BHW can see *which* part is
  unfinished.
- **Encouraging, not punishing.** Retake uses amber, never red; `danger`
  is not used anywhere in the learner progress view.
- **Small celebration.** A subchapter or chapter turning green shows a short
  check animation, and a certificate adds the sampaguita star — both
  disabled under `prefers-reduced-motion`.
- **Mobile first.** Must read cleanly at 360px; cards stack, the ring
  shrinks, labels never truncate the number.
- **Accessible markup.** `role="progressbar"` with `aria-valuenow/min/max`
  and an `aria-label` such as "Kabanata 1: 12 sa 26 na aralin tapos".

## 5. Counting rules

- Unit: one required lesson with a `published_revision_id`.
- Done: a `course_lesson_progress` row for that lesson, whether
  `completion_basis` is `learner` or `legacy_equivalence`.
- Progress is keyed on `lesson_id`, not revision: republishing a lesson does
  not undo a completion (matches `rpc_course_lesson_complete`).
- Subchapter % = done / published lessons in that module. A module with no
  published lessons is "Coming soon" and excluded.
- Chapter % = done / published lessons across its subchapters. Chapter
  status comes from `course_progress.status` plus the pretest attempt and
  certificate, mapped to the states in §4.
- Manual % = done / published lessons across available chapters.
- Continue target: `continueLesson()` from
  `src/lib/elearning/reference-navigation.ts`, applied across the manual.

## 6. Build phases

The manual route and `src/components/elearning/*` are under active
development by another agent (Codex, BHW Reference Manual stream). To avoid
conflicts:

**Phase 1 — new files only (can start immediately)**

- `src/lib/progress/manual-progress.ts` — pure summariser (program,
  chapters, modules, lessons, completions, resumes, certificates → totals
  and states for manual / chapter / subchapter + continue target) and a
  fetcher that loads them for the signed-in BHW in ~5 queries.
- `src/components/progress/` — `progress-ring.tsx`, `progress-bar.tsx`
  (segmented), `status-chip.tsx`, `chapter-steps.tsx`, `my-training-card.tsx`.
- Vitest: no lessons yet, unavailable chapter, certified, failed assessment,
  legacy-equivalence completion, lesson republished after completion,
  100% subchapter, colour/label mapping for every state.
- Wire `my-training-card` into `/home` (outside the Codex area).

**Phase 2 — manual route integration (after Codex's next PR lands)**

- One small PR that merges `main`, then replaces the text lines in the
  manual route with the Phase 1 components. Few lines in that file.
- Browser check at 360 / 768 / 1280px, light and dark mode, axe scan.

**Phase 3 — supervisor view**

- Extend `/admin/course-progress` (or a sibling page) with a per-BHW
  breakdown: manual %, each chapter's status chip and bar, each
  subchapter bar, reusing the same components and summariser.
- Filter by org unit, following the existing admin scope rules; check that
  RLS lets an admin read `course_lesson_progress` for BHWs in scope, and add
  a `security definer` read RPC only if it does not.

## 7. Verification

- `npm run lint`, `npm run typecheck`, `npm test` on every phase.
- Browser checks with a fixture BHW session in each state of §4.
- CI e2e is currently red for an unrelated reason (dead CI Supabase
  project), so it is not used as a gate for this work.
