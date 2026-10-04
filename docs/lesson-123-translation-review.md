# Lesson 1.2.3 — Cebuano and Hiligaynon draft review

The two complete translations cover six Read sections, six slides, ordered four-choice knowledge checks and feedback, localized controls and accessibility text, and a six-beat optional story. The selected story asset also supplies all six scenes as a readable transcript; assets without a transcript retain the existing alt-text fallback. Both packages remain `review_status: draft`, visible through staff preview only. No owner/native-speaker approval, merge, content load, production release or database write is recorded. The original Filipino/English approval does not approve these new translations.

## Source and scope

The complete published learner source was read once through a bounded public-source query and matches revision `90f3fc1a-1021-4c41-b0b4-fe76bc096232`. The package retains lesson key `uhc-local-system`, its objective, six Read/slide IDs, concept and asset IDs, check order and correct index 0. No original Filipino/English text, facilitator guidance, competencies, source references, illustration or historic media was changed.

The translation keeps board governance separate from the health-team contact and the BHW's contribution. A BHW is not automatically a board member or a policy decision-maker. Factual observations omit unnecessary identifying details, private conversations are not posted publicly, messages are checked with the team, and the recipient, authority and follow-up are locally confirmed. No universal route through a midwife, office and board is invented. Online completion checks understanding; practical competence is observed separately.

The branch depends on the shared UHC translation infrastructure in unmerged draft PR #246. It is independent of draft PR #247. Draft PR: https://github.com/jongsky25/BHW-Connect-Phase-2/pull/249.

## Recorded checks

- Root typecheck, changed-file ESLint and Remotion ESLint/typecheck pass.
- 106 targeted tests across nine files pass, plus two translation configuration checks. Tests cover source/draft access, both languages' answer feedback and complete story transcripts, stable completion identity without the optional video, narration, pronunciation and original lesson/story regressions.
- Six Read MP3s and one story MP3 per language decode fully. Audio hashes, exact authored timing text, zone/beat order, nonoverlap and measured duration bounds pass. Gemini `gemini-3.8-flash-tts`, Kore; one narrator with expressive language-specific delivery directions.
- Actual component review confirms all six Read and slide positions in both languages, translated feedback and direct language switching. Actual Read playback advances, highlights text and stops on a section change. Final video playback loads language-matched captions, switches to one paused replacement player, and unmounts on returning to Read. Both complete story transcripts are exposed on request. Fullscreen Read/story controls and orientation selection work. Phone portrait, landscape, tablet and desktop layouts were inspected without horizontal overflow, and all six final rendered scenes were visually inspected.
- Final videos are 854×480 H.264/AAC and decode completely; content hashes, measured duration/caption bounds and byte budgets pass. The final Cebuano video is 90.688 seconds; Hiligaynon is 93.376 seconds. Final combined Read recordings total 387.213 and 399.256 seconds respectively.
- Both portable HTML packages have six Read audio players, six slides, the full story transcript and matching captions. Actual portable Read/video playback and stopping media when changing tabs work in both languages. All 20 copied/combined media assets match source bytes and serve HTTP 200. Browser review reported no warnings or errors.

## Remaining review

Two narration passes were compared through model-mediated listening to actual MP3 bytes. The second pass uses additional governance-verb, consonant and single-narrator directions. Both selected stories use pass 2. Cebuano retains pass 1 for `local-system-observation` and `local-system-check`; Hiligaynon retains pass 1 for `local-system-board`, `local-system-observation`, `local-system-promotion` and `local-system-feedback`. The other Read tracks use pass 2. Every selected report retains its actual-audio SHA-256, original review source commit, generation pass, transcript and provisional concerns. Earlier immutable Read recordings are preserved.

This is not human listening, native-speaker certification or policy approval. Provisional concerns remain: for example the Cebuano opening's wording and perceived title-voice change, the board track's integration-word articulation, regional word substitutions, Hiligaynon `nga`/`na` in the story and some word endings/stress. The selected story reports no longer flag the first-pass governance-verb misreading. These reports are evidence to check against the recordings, not definitive phonetic judgements or permission to publish.

Scoped narration generation and media-review/render jobs succeeded. Exact final-head CI/E2E, Vercel preview state and all-composition Remotion regression state are tracked in draft PR #249; an earlier green run does not certify a later commit. All release gates must be green before merge. The final source/media/export evidence and owner-review packages are saved alongside the review portal.

Owner/native review remains required before any approval or scoped release. Real-phone native fullscreen and authenticated production progress are not certified by the loopback review. Native captions can cover lower animation cards; caption controls and the full text alternative are available. Pilot Supabase was not used for development/E2E; CI uses its disposable local stack.
