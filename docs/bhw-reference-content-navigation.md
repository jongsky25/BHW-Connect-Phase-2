# Reference Manual content loading and app integration

Package 3 adds a strict bilingual authoring parser, content-addressed revisions and
explicit loader modes. The selected subchapter is fully validated and reconciled
before writes. Staging is resumable; promotion uses the existing atomic publication
RPC. Identical repeated loads write no database rows. Existing course/module lock
identities are required, never silently replaced. Scoped lesson loads do not touch
the course metadata, assessment bank, KB, historical progress or certificates.

The approved 1.1 prototype is converted into six authoring folders with 31 distinct
Slides/checks and coverage of all 20 non-excluded legacy concepts. Read and Slides
remain separate. Citations use the corrected PDF crosswalk. The private bilingual
facilitator notes retain the six-hour versus at-least-three-hour source discrepancy.
The seven static SVG fallbacks are draft adaptations, not newly approved final artwork.
Their review status blocks promotion; human subject/visual review remains necessary.
Parts 6–9 and their original source files are untouched.

Packages 4–5 integrate a published mapped program into the existing course route.
Published lessons get a subchapter/lesson navigator, Continue learning, Read/Slides,
stable concept-based switching, per-mode server resume, explicit shared completion,
practice feedback after answering, static accessible media and sources. Images are
lazy-loaded. Earlier completed lessons remain reviewable after certification.
Chapter I assessments/certificates retain the same identities and existing flow;
Chapters II–III are unavailable. Generic courses retain their original reader.
The new route requires the foundation migration to exist.

The server fetches no private notes. Progress writes use the existing scoped RPCs.
Resume requests are serialized to avoid older responses overwriting later clicks.
Stale published revisions are rejected by the database. Initial estimates are
3–7 minutes for independent study, separate from facilitated practice.
No existing module-index audio is reused for lesson positions. New narration
audio production and full chapter-scale lazy revision loading remain follow-up work;
the current route fetches published revision JSON together for the selected course.

## Verification on 24 September 2026

- Full Vitest suite: 43 files, 345 tests passed. The two reference test files now use Vitest, matching the repository runner.
- Full repository lint and TypeScript passed after correcting three local variable names. Targeted lint passed again for both UI contrast fixes.
- Next.js 16.2.10 production build passed with Webpack, including TypeScript, 46 page-generation steps and build tracing. The default Turbopack build was not completed.
- All 35 migrations and 15 preservation/access scenario groups passed on disposable PostgreSQL 18.4. The loader's SQL-adapter rehearsal preserved historical snapshots through interrupted staging, recovery and repeat loads.
- Actual PostgREST 16.4 rehearsal: six lessons promoted in the fixture, stable identities on rerun, and 13 access/progress checks passed.
- Production-app browser: 20 checks passed, covering mode-specific server resume/reload, Filipino/English, keyboard navigation, six-lesson completion, pretest/posttest gates, certified review with unchanged certificates, generic courses, out-of-scope access, 320px reflow and 200% CSS zoom.
- Three production-app axe WCAG A/AA scans passed. Fixed low contrast in the privacy link and completed module badges. Six earlier isolated component scans also passed.

The full test suite preceded the two CSS-class-only contrast fixes. The corrected production build, targeted lint and browser checks were repeated afterward. No assertions were weakened.

## Reproduce locally

Install the locked dependencies. Run focused tests with npm test -- scripts/tests/reference-content.test.mjs scripts/tests/reference-navigation.test.mjs. On the Windows validation host the full suite used --maxWorkers=1 --pool=threads --testTimeout=30000 to accommodate resource limits.

For SQL replay use scripts/tests/training-foundation-replay.mjs with PG_TEST_MODULE as documented in bhw-reference-foundation.md.

For the production browser rehearsal:

1. Start disposable PostgreSQL on 127.0.0.1:55432 as postgres. Set PG_TEST_MODULE to the installed pg module (or install pg locally without changing the lockfile). Set POSTGREST_TEST_BINARY to a local PostgREST executable; on Windows set POSTGREST_TEST_DLL_PATH when libpq needs an explicit DLL directory.
2. Run node scripts/tests/reference-local-app.mjs. This creates a new uniquely named database, replays migrations, loads fixtures and starts loopback REST on port 55434. It requires Chrome for the later browser scripts. Generated fixture sessions and next.env are under ignored test-results/local-reference-app; never commit them.
3. Load the variables from that next.env into the build/start process. Run npm run build -- --webpack, then npm run start -- -p 4175 -H 127.0.0.1.
4. Run node scripts/tests/reference-local-rest-check.mjs, node scripts/tests/reference-app-journey.mjs, then node scripts/tests/reference-app-gates.mjs, in that order. The browser scripts reset only their named disposable learners. The journey removes the fixture question bank; the gates script recreates it. Results and screenshots go into the ignored fixture directory.

Authentication uses signed fixture sessions and a fixture Auth endpoint, not real Supabase Auth. Matching-platform Supabase rehearsal and manual screen-reader testing remain release gates. Draft assets are approved only in memory for the disposable fixture; source approval and shared publication remain separate.

No shared/live database changes, workflow dispatch, merge or deployment occurred. Commits use [skip ci] because the automatic PR workflow writes to a shared Supabase project.
