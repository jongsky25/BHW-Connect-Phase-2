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

- 30 focused Node tests: authoring failures, source/concept/asset parity, private
  payload separation, repeat loads, interruption recovery, promotion guards,
  stale identities, stable positions and continue/review selection.
- Strict TypeScript check of the new renderer, navigation helper and shared types.
- Disposable PostgreSQL 18.4: all 35 migrations and the 15 existing preservation/
  access scenarios pass. The actual loader also runs through an authenticated,
  parameterized SQL adapter: staging interruption/recovery, all six published
  revisions, zero writes on rerun and unchanged complete historical row snapshots.
  This adapter is not a PostgREST/Supabase integration test.
- Isolated React component browser checks: English/Filipino at 360, 768 and
  1280 pixels; mode-specific resume/reload, practice feedback and explicit completion.
  Six axe scans report no WCAG A/AA violations. Preview CSS is a local harness,
  not certification of the production application stylesheet.

Run focused tests with Node 22.18+. For the database test, use the existing
`scripts/tests/training-foundation-replay.mjs` loopback-only harness and its
`PG_TEST_MODULE` option as documented in `bhw-reference-foundation.md`.

The local source checkout is a partial snapshot. Full-repository lint, typecheck,
Vitest, Next production build, authenticated end-to-end REST testing and matching
Supabase/PostgreSQL-version rehearsal remain release gates. No shared/live database,
workflow dispatch, merge or deployment was performed. CI is skipped because the
repository's automatic PR E2E uses a shared Supabase project.

