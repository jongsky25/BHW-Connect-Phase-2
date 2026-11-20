# C1-PE-2 — Clear simulation steps and saved-state guidance

Owner / release coordinator: current Codex session, single-session increment.
Branch: `feat/c1-pe-2-simulation-guidance`.
Base: `9153a983622e360bc6553fc0e03b5a96f9ab9862` (PR #516).
Updated: 20 November 2026 UTC.
Status: implemented, local verification below; exact remote delivery is recorded
on this branch's PR. Representative signed-in pilot usability is outstanding.

## Reconciled navigation baseline

The existing BHW reader already gates completion on reaching the end and answering
every check, waits for the save before offering continuation, retains completed
lesson review, and returns to the lesson list after the final lesson. The assessor
preparation checklist already selects the next action from current personal
records and handles unpublished lessons, missing prerequisites and unreadable
status. The two-card assessor home remains the entry point. No duplicate hub or
new invented destination is added.

Existing completion, preparation-checklist and progress-navigation tests were
run with this increment. They cover required checks, completion failure, saved
continuation, historical completion, final-lesson return, missing prerequisites,
unknown records, chapter availability and current personal next steps. Passing
these checks is not evidence that representative users can navigate unaided.

## Confirmed gaps and changes

The simulation's preparation choices were clickable before completing the three
required views, and empty evidence could reach an answer rejected by the server.
Edited evidence disabled choices without explaining the save dependency nearby.
The note field had no direct unsaved/saved status. Completing 11 checkpoints still
requires a separate completion action near the bottom of the page.

- **Nasaan ka na at ano ang susunod / Where you are and what to do next** shows
  recorded checkpoint count and the next action from confirmed simulation state.
- Preparation states name the next view: Prepare, BHW presentation, return to
  Prepare. Choices wait for the same three-view sequence already enforced by SQL.
- Evidence instructions give the order: select the three observed facts, write a
  fictional note, save, then answer. “Prompt” is explained as a reminder or help.
  Partial evidence can still be saved for later. Choices wait for all three facts,
  a nonblank note and confirmed saved values, matching the existing server gate.
- Notes distinguish unsaved edits, save in progress, unconfirmed saves, saved
  values and no saved evidence. Status recovery still preserves local edits.
- Reviewing a recorded checkpoint offers a direct return to the first unfinished
  checkpoint. No checkpoint can be skipped and no progress is reset.
- All 11 recorded checkpoints are explicitly distinguished from a saved completion
  receipt. A same-page link leads to the existing final action; nothing submits
  automatically. Replay retains its prior receipt under the existing rules.
- A long provenance path was confirmed to overflow at 320px with 200% text. It
  now wraps without changing its source information.

The source story, choices, explanations, rubric, evidence meaning, score, passing
rules, eleven-checkpoint contract, receipt validation and RPC payloads are unchanged.
No learner record, certification, authority, publication or feature flag changes.
The UI prevents invalid attempts already rejected by the server; the server remains
responsible for enforcement.

## Owned paths and checks

Owned: `assessor-simulation-runner.tsx` and its tests, the existing authenticated
simulation E2E, local simulation-guidance fixture/browser check, this handoff and
phase/register updates. No database or shared navigation model changes.

- 82 focused tests passed: simulation UI (including both languages, partial saves,
  required views, review/resume and final-receipt distinction), existing lesson
  completion and assessor navigation, and the simulation database contract.
- Corrected an existing test hook that returned the mock function from `beforeEach`:
  Vitest treated it as cleanup and called it without RPC arguments. The hook now
  returns nothing; assertions and production behavior are unchanged.
- TypeScript passed; lint passed with the same five existing warnings.
- Production build passed. Final wrapping correction is covered by the mobile
  check and the required remote build.
- The enhanced authenticated E2E uses only disposable local Supabase. It checks
  the new choice gates, unsaved/saved messages, reload, response-loss recovery,
  unchanged learner records and a single completion receipt. CI runs this test.
- A separate local rendering check uses actual runner/CSS with RPCs disabled. It
  checks preparation, evidence and final guidance at 320px/200% text, both UI
  languages and light/dark themes, WCAG A/AA, and unsaved-note visibility. It is
  also included in CI; final results appear in the PR delivery receipt.

## Release, review and remaining evidence

Application-only deployment. No migration, content load or pilot mutation is
needed. Rollback is reverting this UI increment and redeploying; saved simulation
state and learner data require no restoration. Prior production is
`dpl_7db73YGN1yDXVpsEu6WtiP781ZzL` (main `9153a983`).

Known live review route for an eligible signed-in assessor:
https://bhw-connect-phase-2.vercel.app/training/8dfe8b88-84ce-4e60-a353-93031eceda59/assessor/chapter-1/simulation

Follow the next-step message, save a fictional note, and review a recorded step
before returning to the unfinished step. Existing prerequisite and authority
checks remain; do not enable flags or alter qualification just to open the page.

Representative BHW/assessor navigation and signed-in pilot usability remain
unverified. No stable pilot credentials are available in this workspace. C1-PE-3
assessment explanations and disclosure/retake decisions remain a separate phase;
this release makes no policy decision for them.
