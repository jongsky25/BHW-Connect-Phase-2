# Lesson 1.3.1: Mimi recognizes a company offer

Owner approved for live release, 4 October 2026, Asia/Manila. The character is **Mimi throughout authored module 1.3**, following the owner's latest instruction. That instruction supersedes the handoff's old name. The user instructed “approve and deploy” after reviewing package/head `864d89f2ef1d7d4a479faab575b2c442b1a919f2`. Exact package and media hashes are recorded in `lesson-131-owner-approval.json`. Approval edits and final release gates follow; no independent policy SME approval is recorded. Publication evidence will be saved separately.

## Scope and identity

The publishing scope remains `bhs-promotions` only. The all-1.3 rename affects sibling learner and facilitator content and six narration tracks; it does not authorize publishing those siblings. The lesson key, position, bilingual titles, original objectives, required status, original lesson UUID and concept IDs are retained. `section-1`, `section-2` and their slide IDs remain the first two screens. Historical media are retained. The original image-generation prompt retains its truthful previous character name with an explicit owner rename note.

The isolated branch is `codex/lesson-131-story-gemini`, PR https://github.com/jongsky25/BHW-Connect-Phase-2/pull/241. Latest main checked 4 October: `81a84f581a85657d61f119b329c34ac440f790c7`. Released lessons 1.2.3 and 1.2.4 are retained additively, including both new compositions, narration mappings, assets and source. Reviewed 1.3 media and narration entries remain byte-identical.

## Gap decisions and storyboard

The prior two-screen lesson is expanded into six equivalent Filipino/English Read screens and slides:

1. `section-1`: The visitor at the BHS. Mimi identifies an offer of samples, a tarpaulin and a gift, and pauses acceptance, display and distribution.
2. `section-2`: Two policy topics. Distinguish the Milk Code from the pharmaceutical order's scope for prescription products and medical devices.
3. `identify-offer`: Product, promotion, place/audience and inducement. Free does not mean authorized; prescription samples are not for public distribution.
4. `pause-route`: Give a brief respectful response and refer the details to the facility supervisor. Verify conditions and the stated scientific-convention exception; Mimi cannot invent an exception.
5. `independent-information`: Use approved health information, factual reporting without patient data, no feeding blame, and clinical referral to trained professionals.
6. `recognition-check`: Compare formula promotion tied to a gift with an anatomical model for a coordinated scientific activity whose conditions still need verification. Three plausible options require recognition, pause and referral.

Both `m3.milk-code` and `m3.pharma-ban` have aligned Read/Slides coverage and primary-source references. Detailed refusal role-play belongs to lesson 1.3.3. The fixed twelve-section facilitator outline includes the practical sequence, expected answers, misconception, role-play, support and concrete observable criteria. Online completion is distinct from demonstrated skill; competency objective index remains zero.

The primary-source audit is `lesson-131-source-audit.json`. It records the DOH BHW manual, EO 51, joint implementing provisions, the Supreme Court-related circular, the signed AO 2015-0053 scan and the official 2024 reiteration notice, with precise scope and retrieval limits. These are source checks, not SME approval.

## Original media and narration

Original built-in imagegen art was generated 3 October. Fictional Mimi is a Filipina around 50, with shoulder-length black hair, lavender polo and navy trousers. A respectful generic visitor carries a blank box and rolled sheet, with a blank gift bag. Both faces remain visible. No brand or clinical action is shown. The exact prompt, date and SHA-256 are preserved in `lesson.json`; target Read/Slides use contained art. Historical SVG media are retained.

Twelve target Read tracks and six affected sibling tracks use actual Gemini `gemini-3.8-flash-tts`, voice Kore, generated securely with the existing repository secret in GitHub Actions. No secret was placed in chat, files or Git. The target uses a shared expressive bilingual story style; default and explicit Gemini planning retain that provider. Text, style, model, pronunciation rules and file hashes participate in currency checks. The Filipino order-number screen has an explicit instruction to preserve both leading zeros in `2015-0053`, prompted by a model-review concern. YAKAP normalization remains unchanged; it is absent from this lesson.

Both registered Remotion compositions use actual six-beat narration and measured timing metadata, with H.264/AAC MP4s, WebVTT and language-specific posters. Filipino speech is 80.771 seconds; English is 80.274 seconds, with a short visual tail. The videos remain unchanged after their successful secure generation at `27bf5dd5`. Exact hashes and measured streams are in `lesson-131-media-generation.json` and `lesson-131-decoded-media-check.json`. Registration occurred only after required art, MP3 and timing files existed.

The completed-media build record preserves its historical partial-run error. `lesson-131-read-completion.json` records the later completion; `lesson-131-narration-audit.json` and the unchanged current-narration guard determine final currency. A benign sibling refusal paragraph was simplified consistently in displayed Read, Slides narration and the module source after a provider content-filter rejection, without changing its instruction.

## Verification and practical limits

- TypeScript and root ESLint passed locally. Remotion's `npm run lint` includes both ESLint and TypeScript and passed. There is no separate Remotion typecheck script.
- A local dependency junction causes Turbopack's external-path rejection. The documented Webpack fallback build passed. Normal Linux build/E2E and final-head CI are required independently.
- Lesson regressions check immutable metadata, old-screen resume, concept/source scope, bilingual checks, all-1.3 Mimi continuity, provider defaults and invalidation, original art, facilitation and actual script/timing/VTT/media hash parity.
- Final lesson/content/narration/provider/pronunciation checks passed: six suites, 87 tests. Viewer/completion/Read controls/navigation checks passed separately: four suites, 38 tests. Default and explicit Gemini dry runs request zero renders for all 18 affected tracks. Saved logs preserve earlier failures and must not be read as final-head results.
- The actual viewer component and authored data were exercised in a separate local fixture on port 3131. Its Next navigation/image adapters and resume/completion callbacks are explicitly stubs. This is not an authenticated production learner session. The in-app browser could not open this fixture; the agent-browser CLI provided the local browser checks.
- All six Read and Slides screens in both languages were checked at 1280x900, 390x844, 844x390 and 768x1024: 96 screen states, no horizontal overflow. Both faces are visible in the inspected original-art layouts. Wrong/correct feedback, completion, old-revision resume, full-screen Read/Slides orientation/navigation/close passed across those sizes.
- Actual Read transport checks cover all twelve tracks, one audio element, advancing playback and current narration zones. The check screen correctly locks its spoken answer until an answer is selected. No first-answer correctness requirement or video-watching requirement is added.
- Both language videos play with six caption cues, one video player in normal/full-screen mode, and unmount on return to Read/Slides, at all four sizes. Read/Slides completion was exercised without playing the story. Saved screenshot/DOM evidence labels its fixture limits.
- Decoded audio signal checks cover every Read zone and video beat, exact SHA-256 bytes, H.264/AAC streams and complete measured duration. Gemini analysis of actual MP3 bytes is model-mediated audio review, not human listening or approval. Its raw responses and hashes are retained. It reports audible speech and complete endings, with some subjective cadence/speaker-consistency concerns. The original possible order-number concern prompted a focused revision. The final recorded MP3 is transcribed with 2015-0053 and has no pronunciation or other concern in its model response. Model transcription is not authoritative word-for-word proof. The owner subsequently approved the complete delivered review package; this is recorded separately from model-mediated analysis.

Final-head CI/E2E and both Remotion shard statuses/artifacts are recorded separately in the owner package after the final source commit. They must pass on that exact head; older successful or cancelled runs are not substitutes. Release preparation captured a fresh read-only snapshot of all five published lesson identities/revisions/hashes. No learner progress write is authorized or performed.

The most recent successful main Remotion library run used 17.9 and 19.1 minutes on its two shards (run 37134196684). The expanded library retains both shards and all composition/size checks; the job budget was extended from 20 to 25 minutes during review, then reconciled with main’s measured 30-minute budget for the expanded library to allow the new stories and artifact uploads. This changes no review media.

## Owner review and release gates

The self-contained HTML and ZIP include the illustration/provenance, all target Read MP3s and timings, affected sibling recordings/content, both playable videos, captions, posters, animation source, source/audio audits, screenshots and verification logs. Open the HTML to review Filipino and English Read, Slides, story and facilitator notes. The immutable delivered package contains its original draft-review labels; approval is recorded separately and only the reviewed target assets are now marked approved in source.

Explicit approval of this revised package and its media hashes was received as “approve and deploy” on 4 October 2026 (Asia/Manila). The handoff states: "RELEASE ONLY AFTER THIS PACKAGE'S EXPLICIT OWNER APPROVAL". Approval of 1.2.2 is historical and does not cover this package. After approval, mark only reviewed target assets approved and rerun exact-head CI/E2E, both Remotion shards and the Linux one-lesson loader dry run. Capture fresh sibling published pointers/hashes, merge the expected reviewed head, verify that exact merged commit is READY and aliased in Vercel Production, then publish only `bhs-promotions`. Verify the published revision, unchanged immutable identity/sibling pointers and every referenced live media hash. Do not regenerate approved media or use an older deployment as evidence.
