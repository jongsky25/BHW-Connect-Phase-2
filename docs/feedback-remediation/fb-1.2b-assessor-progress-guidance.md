# FB-1.2b — assessor progress shortcuts and certification guidance

Two reports reviewed:

- `be0f7c2b-8aaf-4c87-8354-1b4dbae3d68d`, a Chapter 2 assessor lesson: “Please add dashboard po or shortcut para ma access agad at makita ang progress po...”
- `ef1ed93b-967a-4fae-a876-bb64b4c7f69d`, `/assessor/qualifications`: “what does this mean? how do i know what are the next steps”

Both remain `new` in the pilot and have no attached screenshot. The audit used the existing code, read-only report/publication metadata, and disposable tests; no authenticated production interaction is claimed.

## Merit and current support

The system already has personal chapter-study progress, a Chapter 1 preparation checklist, certification records and a separate Chapter 1 working area for supporting BHWs. The reported Chapter 2 lesson already displays a numeric progress section and a chapter breadcrumb; “My certifications” is also linked. A second dashboard is unnecessary.

Two supported discoverability gaps remain: the lesson has no explicit shortcut naming the chapter's progress and lesson list, and the certification page's overall “Next” text is informational without a direct destination. The page also needs to explain how personal study differs from a certification record and the BHW roster.

Read-only pilot metadata on 25 October 2026 shows all three chapter entries as available with courses. This is publication metadata, not proof of qualification readiness or personal-study route support. The implemented assessor personal-study router handles Chapters 1 and 2; the new guide never invents a Chapter 3 study URL. All existing chapter-specific exam, orientation, simulation, certification and authority checks remain authoritative.

## Increment

- On non-exam chapter, subchapter and lesson pages, **Study progress and lesson list / Progreso sa pag-aaral at listahan ng mga aralin** opens the current chapter dashboard at `#assessor-study-progress`. The target wraps the existing checklist/progress panel and is focusable for fragment navigation. Progress and certification-record targets have responsive scroll clearance so their headings remain below the sticky app header; record cards become programmatically focusable without entering the normal tab order. Chapter 2 stays in Chapter 2. Existing breadcrumbs, My certifications and working-area links remain.
- “My certifications” now explains completed lessons/remaining preparation versus certification records and explicitly separates personal study from progress of supported BHWs.
- The existing trusted overall `nextStep` text is retained in the guide. A known `complete_chapter-1/2` with available publication links to that chapter's existing study/progress route; `review_chapter-N`, unsupported Chapter 3 study, or a chapter without an available study path links to its existing record card. Waiting/unknown steps stay informational rather than guessing a new requirement. Available Chapter 1/2 study links support revisiting preparation regardless of the overall award step.
- A chapter/history/overall read error suppresses specific guidance and exposes **Reload status**. An empty overall response is distinguished from missing evidence; known publication links can still be used. No missing lessons or certification result is fabricated from failed reads.
- Chapter roots retain their existing briefing/pretest/lesson/checklist gates. No new in-progress-exam navigation was added; shared assessment save/leave behavior is unchanged.

This is read-only navigation and explanation. There are no new page queries/RPCs, migrations, progress writes, issue-award actions, role changes, deadlines or qualification policies. The shared lesson reader, prior receipts, content, media and assessments are unchanged. Training owner remains Ray Justin Ventura.

## Verification

- 59 focused component/route tests across four files, including bilingual links, real fragment targets, nested Chapter 2 scope, supported/unavailable/unknown/waiting/complete states, read-error recovery, unchanged read-only RPC inventory, actual-role/preview/inactive gating, and existing certification-card behavior.
- `scripts/assessor-progress-browser.mjs`: 16 actual-component phone cases at 320px/XL, English/Filipino × light/dark, covering actionable next steps, record review, unsupported Chapter 3 and failed reads. Checks long-title wrapping, 44px link targets, keyboard focus, actual certification-card fragment clearance below a 128px sticky-header fixture, eight clean full-page axe scans, zero horizontal overflow/page errors and no non-GET requests. Screenshots inspected in all four language/theme combinations. This fixture does not exercise Next routing or database authorization.
- The existing `e2e/assessor-preparation.spec.ts` is extended in the disposable local Supabase flow: after real briefing/pretest setup, follow the dashboard shortcut, open My certifications, return through the personal-study link, and verify actual URL/fragment/progress and clearance below the real app header. Exact snapshots of study, exam attempts, qualifications and awards remain unchanged by navigation. The localhost guard now runs before account creation as well as before SQL. CI provides the local database; no pilot writes.
- Full CI, exact merged production commit/canonical alias, public smoke and read-only postrelease report status receipts are recorded in the release PR. Live comments remain the pilot review mechanism. Original feedback records are unchanged; repository disposition is partial fix pending live review.
