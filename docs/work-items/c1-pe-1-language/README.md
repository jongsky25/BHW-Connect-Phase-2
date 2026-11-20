# C1-PE-1 — Filipino reading support

Updated: 20 November 2026 UTC. Owner/release coordinator: current Codex session;
single-session increment, no parallel assignments.
Branch: `feat/c1-pe-1-filipino-reading-support`.
Base: `202eb69b33ce73de34cfb5820c7f1edf91ccad08` (merged PR #515).
Status: implemented; validation and delivery receipts below. No signed-in pilot
or representative-participant usability result is claimed.

## Finding and change

The effective Filipino readings mix plain Filipino sentences with training and
measurement vocabulary such as *triad*, *prompt*, *rehearsal*, *controlled master*,
*baseline* and *denominator*. A blanket rewrite would also need coordinated
narration, captions and immutable lesson-release changes. This increment provides
short editorial explanations beside the reader instead.

All 42 effective lesson readings were screened for 21 selected terms. The
[terminology review](terminology-review.json) records the actual section IDs for
every match, including explicit no-match dispositions. Twenty-four lessons have
at least one selected term; 18 do not show an extra panel. This is a bounded
editorial terminology review, not a new clinical/legal sign-off, a full rewrite,
or evidence that participants found every existing sentence understandable.

**Mga salitang gamit sa aralin / Words used in this lesson** is a collapsed,
optional panel above the existing manual reference. It shows only explanations
mapped to the current lesson, in Filipino or English according to the UI language.
It uses ordinary words: for example, *triad* becomes “Pangkat na may tatlong tao”
and *prompt* becomes “Paalala o gabay”. Editorial explanations are clearly separate
from the manual quotations. The largest panel has 13 terms. No search, extra
navigation, PDF, image download or database request is needed to use it.

The definitions preserve the distinction between practice and assessment, evidence
and authorization, and percentage points versus relative percentage change. They
do not copy a question, answer key, answer-specific feedback or worked assessment
answer. They explain vocabulary already present in teaching text. This panel is
only in explicitly enabled Chapter 1 lesson readers, including assessor study and
read-only review; it is not mounted in assessment runners or Chapters 2/3.

## Preservation and release

All 42 effective lesson hashes still match the C1-PE-0 publication receipt. No
lesson text, question, rationale, scenario, manual quotation, narration, caption,
media, completion gate, score, attempt, learner data or certification rule changes.
No newly established source contradiction is claimed by this terminology-only
screening; existing source-support limits remain in the C1-PE-0 inventory.

Owned paths: the new `chapter1-reading-support` component/data, `manual-lesson`
integration, terminology evidence, focused source/integration checks, the existing
local manual fixture plus a browser script and E2E entry point, and phase handoffs.
Only the application bundle is released. No migration, content loader, publication
or flag mutation is required. Revert this increment and redeploy to remove the
reading support; no database restoration or learner-progress repair is needed.
Prior production: `dpl_EweR9tpSoBnGzHJ2CFXw9Ne6yAG1`, main `202eb69b`.

## Validation and delivery

- 16 focused tests passed across source/publication parity, manual-reference
  content/component checks and BHW/assessor reader integration. The new integration
  cases confirm explicit Chapter 1 enablement, read-only access and no save or
  completion calls when opening the panel.
- TypeScript passed. Lint passed with the same five pre-existing warnings.
- Production build passed. The local Chromium check passed all 42 mappings in
  both languages at 320px, keyboard opening, longest-panel reflow at 200% text,
  WCAG A/AA scans in light/dark themes, and reopening loaded help while offline.
  A new E2E entry point runs this same check in CI. Cold offline loading is not
  promised. The rendered Filipino dark-theme screenshot was visually reviewed.
- The PR linked from this branch's GitHub record carries the exact checked head,
  CI result, merge SHA, deployment identity and live-check limits after release.

Live review entry point: use the Chapter 1 course on the established pilot,
https://bhw-connect-phase-2.vercel.app/training/8dfe8b88-84ce-4e60-a353-93031eceda59 .
Open a communication, problem-solving, safety or resource lesson with the panel,
then open **Mga salitang gamit sa aralin**. Reference quotations remain in the
separate **Basahin ang Reference Manual** panel.

Remaining evidence: signed-in phone review with representative BHWs/assessors,
including whether these explanations resolve the observed vocabulary difficulty.
Use the existing page-comment workflow for specific remaining phrases. That
participant evidence cannot be replaced by an automated or agent-only review.
Next implementation phase is C1-PE-2 navigation, assessor steps and simulation;
its independent work need not wait for participant feedback on this panel.
