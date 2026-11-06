# Assessor home progress

Owner: current implementation session. Branch: feat/assessor-home-progress.
Base: 00c234da. Updated: 6 November 2026.

The assessor home page now shows personal study progress for supported Chapters
1 and 2, with an overall ring, per-chapter bars, lesson totals, unavailable
content notices, and chapter/preparation and certification links. Continue opens
the first incomplete available chapter; that existing route resolves current
briefing and pretest requirements and offers the saved/next lesson. It is not a
new qualification calculation and does not skip unfinished preparation steps.
Completed chapter links remain available for preparation and review.

The new loader reads published manual/course metadata and the signed-in
assessor's own completion records through existing RLS. It reuses chapterStudy:
the authored required-lesson list determines totals, and only matching current
published revision receipts count. Unavailable chapters retain required totals.
It does not query BHW progress or write progress, exam, award or certificate data.
Reads are bounded and batch across chapters. Read errors show an explicit
unavailable-status message while keeping home destinations accessible. No new
schema, content load, dependency, environment variable or feature flag is needed.
Actual active assessor role and non-preview status are required.

Validation before PR:
- 80 focused tests passed across home, new loader/card, existing assessor study
  routes and shared progress visuals. Loader tests use the real Supabase client
  against mocked HTTP responses; they do not claim live RLS verification.
- Typecheck, targeted lint, and production build passed. A subsequent heading
  color-only change fixed an accessibility contrast finding.
- Eight actual-component browser cases passed at 320px with XL text, both
  languages/themes and partial/completed states: axe, overflow, 44px targets and
  keyboard focus. Filipino screenshot visually inspected.
- Disposable-Supabase preparation E2E extended to check home → briefing and
  1/42 after reload, with unchanged study/exam/award snapshots. CI must execute
  this integration check before merge; no automated pilot tests are allowed.

Release: pending PR CI and normal main-branch deployment. No pilot writes.
Rollback: revert this code increment through the normal main deployment path;
there is no data migration to undo. Authenticated live verification requires an
established assessor session; no pilot login credentials are configured locally.
