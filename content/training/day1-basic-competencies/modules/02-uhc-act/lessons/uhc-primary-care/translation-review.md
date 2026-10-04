# Lesson 1.2.2 — Cebuano and Hiligaynon draft review

Prepared 4 October 2026. Both packages remain `draft`; no owner approval, merge, publication, source-loader change or database write is recorded. Draft PR #247 depends on #246 for the shared translation pipeline. Reconcile newer main once before release after the dependency is resolved.

## Source and meaning

A narrowly scoped read confirmed the complete published Filipino/English learner source matches the authored six-section source: revision `26890d6e-e706-4fdd-b92e-f7e8d9f55211`. The full bilingual source matcher remains active. Source text, assets, historical Filipino/English media, concept/section/slide IDs, option order and correct answer index 0 are preserved.

The translations cover the title, objective, six Read headings/bodies/takeaways, six slides, prompts/options/feedback, asset descriptions, six story beats and all animated labels and applicable controls. Retained distinctions:

- The four selected changes are a story chain, not an exhaustive account of the manual.
- Automatic inclusion does not confirm clinic selection or guarantee every service at every facility.
- The resident chooses a provider; the BHW checks current options and the process with RHU/PhilHealth/health team.
- The clinician decides clinical need and referral. The BHW confirms local contacts and instructions without choosing a hospital by guesswork.
- The blank note is an illustrative learning cue. Online completion remains separate from observed practical competence.
- YAKAP retains its visible spelling and uses word pronunciation (YAH-kap), never letter-by-letter.

## Media and checks

Gemini `gemini-3.8-flash-tts`, Kore; six Read MP3s per language at 32 kbps and separate six-beat story audio. Cebuano Read total 321.541 seconds / story 96.888 seconds; Hiligaynon Read total 324.101 seconds / story 99.213 seconds. Timing text/order, actual audio hashes, measured durations and complete audio decode pass. New compositions were registered only after their corresponding MP3/timing JSON existed.

App typecheck, changed-file lint, Remotion lint/typecheck, 91 targeted Vitest tests and two configuration tests pass. Tests cover draft learner exclusion/staff access, complete source binding/stale-source rejection, check order/feedback, media language and optional-story completion preserving the original lesson/revision identity. React review found no added effects, network fetches, inline component definitions or unstable animation keys.

Actual-component review verified all six Read positions and six slides in both languages, wrong/correct feedback, real Read playback/highlighting, stopping/replacing recordings on section/language changes, and fullscreen reader open/close/orientation controls. Phone 390×844, landscape 844×390 and tablet 768×1024 had no horizontal document overflow. Real-phone native fullscreen sizing and authenticated production progress remain unverified.

Final videos measure 98.048 seconds (Cebuano) and 100.352 seconds (Hiligaynon), 854×480 H.264/AAC. Video/poster/caption hashes, ordered timing/text and caption bounds, budget and complete audio/video decoding pass. Twenty portable media copies, including both combined Read recordings, match their source bytes and serve HTTP 200. All six scenes per video are readable, with the approved participants and illustration preserved. Fourteen listening-report hashes match the actual selected recordings. The package selects the provisionally cleaner recordings from two generation passes; each report record retains its source commit and pass. Remaining model flags include Cebuano kon/kung and Siguroha variants, a repeated pagtag-an in the story, Hiligaynon idalom/ilalum and an inserted ya, and Vlanche consonant/stress uncertainty. They are not confirmed substitutions by a native listener. YAKAP word pronunciation and clear clinician/resident role boundaries were reported in both stories. Model-mediated listening checks actual MP3 bytes and is not native-speaker certification, owner approval, independent clinical/policy review or accessibility sign-off. Any provisional wording/pronunciation flags remain available for owner listening.

Final-head CI/E2E, Vercel preview and the all-composition Remotion workflow must be checked before release. CI database tests use their disposable local stack; the pilot database was not used for development, E2E or seeding.
