# BHW Reference Manual development handoff

Updated 24 September 2026. Package 3 and the initial lesson navigation/Slides integration are implemented in [draft PR #82](https://github.com/jongsky25/BHW-Connect-Phase-2/pull/82), stacked on [foundation PR #81](https://github.com/jongsky25/BHW-Connect-Phase-2/pull/81), which is stacked on [prototype PR #80](https://github.com/jongsky25/BHW-Connect-Phase-2/pull/80).

## Implemented

- Branch `codex/bhw-reference-content-navigation`; implementation commit `f286a307bc7fef040fe5eac7011360337bc55804`, based on genuine upstream foundation head `fcc41600105a1e0f08c91d415278174571feb922`.
- Strict bilingual Read/Slides parser, stable section/slide IDs, bidirectional concept coverage, corrected named PDF sources, asset existence/hash/provenance/alt checks and separate private facilitator notes.
- Explicit loader modes: hierarchy, course, content, lessons, assessments, KB. Selected lesson loads preserve existing course/module/lock identities and never synchronize unrelated course metadata, assessments, KB or progress.
- Resumable immutable staging and complete-subchapter atomic promotion. Identical reruns make no database writes. Stale/conflicting locks fail closed. Existing assessment banks cannot be silently overwritten. Hierarchy staging creates draft/unavailable records only.
- Six approved-prototype 1.1 lessons converted to authoring files, 31 authored Slides/checks, all 20 non-excluded legacy concepts. Seven static SVG adaptations remain draft and block promotion. Parts 6–9 remain untouched.
- Published mapped programs use lesson navigation, Continue learning, per-mode resume, concept-based switching, explicit shared completion, practice feedback and sources. Existing Chapter I tests, assessment and certificate identities remain authoritative. Completed/certified learners can review released lessons. Chapters II–III remain unavailable; generic courses keep the legacy reader.

## Verification

- 30 focused Node tests pass.
- Strict TypeScript passes for the new React renderer, navigation helper and shared types.
- All 35 migrations and all 15 existing preservation/access scenario groups pass on disposable loopback PostgreSQL 18.4.
- The actual loader also passes staging/interruption/recovery/promotion/repeat-load tests through an authenticated SQL adapter, preserving complete historical row snapshots. This does not replace PostgREST testing.
- React component browser checks pass in Filipino/English at 360, 768 and 1280 pixels: mode switching, resume/reload, explanatory checks, explicit completion and next incomplete lesson selection. Six axe scans report no WCAG A/AA violations. The image-path issue found during visual inspection was corrected.

## Preview and local workspace

- New isolated component preview: http://127.0.0.1:4174 — uses the actual new React component with local browser state, harness CSS and no database connection.
- Original prototype remains unchanged at http://127.0.0.1:4173 when running.
- Integration source snapshot: `C:/Users/Rae Jane/Documents/Codex/2026-09-24/start-building-the-bhw-reference-manual/work/bhw-foundation`.
- New preview harness: `C:/Users/Rae Jane/Documents/Codex/2026-09-24/d/work/ui-check`; start with `node serve.mjs` from that directory. `build.mjs` rebuilds the component bundle; `check.cjs` runs its local browser checks.
- Offline validation from the source root: `node scripts/training-validate-reference.mjs 01-tungkulin-ng-bhw`.
- Focused tests: `node --test scripts/tests/reference-content.test.mjs scripts/tests/reference-navigation.test.mjs` (Node 22.18+).
- See `docs/bhw-reference-content-navigation.md` and `content/training/README.md` for the authoring/loader contract.
- Git caution: this is a partial source snapshot with synthetic local history. Never push that local root over upstream. The remote commits were built on the genuine upstream tree through the GitHub connector.

## Remaining release work

1. Obtain a complete authenticated checkout and run full-repository lint, typecheck, Vitest and Next production build. Run authenticated app/REST E2E, production stylesheet mobile/keyboard/screen-reader/zoom checks and matching-version Supabase rehearsal.
2. Review final 1.1 teaching copy, bilingual private notes and the static visual adaptations. Their draft status deliberately blocks promotion. No subject/clinical approval is inferred from structural validation.
3. Verify the concrete target lock/mapping, staging and equivalence/backfill reports before any authorized shared-project operation. Program/chapter activation is a separate reviewed release step; no automatic activation or backfill occurs.
4. Continue reviewed 1.2–1.5 batches. Parts 6–9 still need claim-level citation corrections and subject review. Preserve existing IDs, questions, historical progress and Chapter I certificate scope.
5. Follow-up: lesson-revision narration audio, chapter-scale lazy revision fetching (current route fetches published revision JSON together), and an archival/reset flow before enabling destructive reset for converted courses.

No shared/live database changes, workflow dispatch, merge or deployment occurred. CI commits use `[skip ci]` because the existing automatic PR E2E writes to a shared Supabase project. Local platform stubs and the component harness are not full production certification.
