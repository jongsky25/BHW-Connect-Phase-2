# AF-01 — BHW Reference Manual assessor foundation

Parent plan: [PR #166](https://github.com/jongsky25/BHW-Connect-Phase-2/pull/166).
Base inspected: `05d46153846977844408d1de7776715c441608cc`.

Status: executable curriculum inventory, readiness contracts, acceptance fixtures
and interactive design prototype implemented. Visual browser review and owner
review of the rubric/screen design remain outstanding. This increment does not
enable qualification or change existing assessment authority.

## Course identity and real inventory

The foundation is **BHW Reference Manual**, program key `bhw-reference-manual`.
Its chapters are qualification units, not separate new Day 1 courses. Existing
storage folders and pilot course IDs are not renamed or recreated.

| Manual chapter | Source folder | Subchapters | Required lessons | Existing indicators | Authored chapter exam items |
|---|---|---:|---:|---:|---:|
| I: BHWs and Their Barangay | `content/training/day1-basic-competencies/modules` (legacy folder name) | 9 | 42 | 36 | 38 |
| II: The BHW as First Responder | `content/training/chapter2-common-competencies/drafts` | 7 | 55 | 55 | No chapter bank found |
| III | Not yet inventoried/authored for qualification | — | — | — | — |

These are authored-file counts, not claims about live publication. The original
`program.json` still marks chapters unavailable, while Chapter II has a separate
release pipeline. Runtime availability must therefore be read from the actual
program/chapter/course mapping and published lesson records in AF-02. Never infer
live availability from directory names or that old file.

Neither inventory currently includes separate module quiz banks. In-lesson
retrieval checks remain formative; this increment does not reclassify them as
qualifying exams. Any subsequently required quizzes must be authored, mapped and
included in a reviewed manifest version.

## Implemented contracts

- `content/assessor/bhw-reference-manual.v1.json` lists every required lesson,
  component/subchapter, stable indicator identity and source objective mapping.
  It records the approved 80% post-test threshold, diagnostic pretest, progressive
  component unlock and exemption from candidate practical assessment. The existing
  rubric and question files are SHA-256 pinned; their contents are not copied.
- `scripts/lib/assessor-curriculum.mjs` checks the manifest against the repository:
  missing or duplicate chapters/modules/lessons, drifted rubrics/exams, wrong
  program identity and unapproved activation all fail. The check has no network
  client and performs no database writes.
- `src/lib/assessor/curriculum.ts` turns that same manifest into app requirements.
  Chapter II has no qualifying exam until a bank is authored, so it cannot pass
  the candidate gate; Chapter III returns no curriculum.
- `src/lib/assessor/readiness.ts` implements pure candidate and BHW component
  readiness. Candidate orientation requires full available chapter content,
  recorded diagnostic pretest, all lessons and all required exams passed. Scores
  below 80% do not pass; retained failed attempts do not erase a later pass.
  A BHW component needs only its own prerequisites. Learner readiness is separate
  from the assessor's qualification, active status, catchment and assignment.

These functions are not database authorization. Their input must eventually come
from trusted server records, and AF-08 RPCs must enforce equivalent checks at each
write. Nothing consumes browser-supplied scores as proof. Runtime qualification
issuance and candidate progress persistence are subsequent increments.

## Commands and manifest versioning

```sh
npm run assessor:check
npm run assessor:check -- --require-ready
npx vitest run src/lib/assessor scripts/tests/assessor-curriculum.test.mjs scripts/tests/assessor-prototype.test.mjs
```

The first command succeeds for a structurally valid **draft** inventory and lists
activation blockers. `--require-ready` intentionally exits 1: rubric/curriculum
review is outstanding and Chapter II lacks an exam bank and orientation.
A successful ordinary audit is not permission to activate the feature.

Do not automatically regenerate hashes to silence drift failures. Review the
changed source, add a new manifest version and preserve older versions referenced
by evidence. The source audit normalizes checkout line endings before hashing;
other formatting changes still require explicit review. AF-04 extends the
activation validator with its source and migration hashes while preserving the
remaining blockers.

## Existing mutation paths audited for the next increments

| Concern | Latest relevant source on inspected main | Next action |
|---|---|---|
| Candidate lesson completion | `20260924000000_training_lesson_foundation.sql`; resume optimized by `20261005000000_set_based_training_rls.sql` | AF-02 adds candidate context without invoking BHW queue completion |
| BHW course finish creates assessment | `20260729000000_inc12_elearning.sql`, `course_progress_maybe_finish` | Keep candidate completion away from this helper |
| Chapter test submission | `20260928000000_versioned_test_bank.sql` | AF-03 adds qualifying candidate attempts/retakes; current BHW phase is one submission and has no pass mark |
| Session create, observation record and assessment claim | `20261002000100_assessor_catchment_bhw_barangay.sql` | Preserve catchment direction; add chapter qualification at cutover |
| Activity-backed observations | `20261001010000_facilitator_activities.sql` | Preserve activity snapshot and close both direct/activity mutation paths |
| Final assessment decision | `20260802000000_inc16_notifications.sql` | Replace/guard binary decision, preserving notifications and certificate behavior |

Also recheck current feature-access and View as behavior before wiring production
routes. A preview persona cannot grant progress or certification authority.

## Acceptance fixtures

Tests cover a new candidate, diagnostic pretest, unfinished full chapter, partial
publication, 79.9% failure, 80% pass, retry history, invalid scores, missing exams,
different program/chapter/version, a ready BHW before finishing the chapter,
missing component test, inactive/unqualified assessor, sibling catchment,
self-assessment and competing assignment. Manifest tests exercise missing/duplicate
content and source drift. Prototype tests exercise the candidate sequence, BHW
rating/review, unqualified-state redirection, Filipino switching, search and tour.

## Screen prototype

Open `prototypes/assessor/index.html` in a browser, or serve its directory locally.
It has fictional records and no network requests or live data. Use the candidate
state selector to preview a 79% retake, an 80% pass and completed orientation.
The area dashboard leads to a BHW with 6/42 chapter lessons completed but an
eligible 1.1 component. Unqualified candidates are directed back to qualification.
The rating example uses the existing three-role indicator and rating anchors.

The prototype covers qualification, orientation example, area dashboard, BHW
detail, evidence/rating and review. It offers Filipino/English, responsive CSS,
light/dark styles, persistent help and a four-step tour. Demo save is explicitly
labelled and does not issue a certificate or persist an actual observation.

Verification: typecheck and full repository lint passed; all 1,009 tests across
111 test files passed, including 39 new automated tests.
The browser CLI failed to start and a Playwright browser download was unusable,
so no rendered visual/mobile/contrast verification is claimed. DOM interactions
were verified with jsdom. Complete a real browser check and owner design/rubric
review before treating AF-01's review gates as closed.

## Next increment

AF-02 adds actual assessor-owned progress and resume storage, using these full
Reference Manual chapter requirements and the existing lesson renderer. AF-03
implements the exam pass/retake path. AF-04 must author the actual scoring
orientation; the worked case here is a preview, not a published orientation.
