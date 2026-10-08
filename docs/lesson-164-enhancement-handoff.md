# Lesson 1.6.4 enhancement handoff — Gibs

## Continue this individual draft

This handoff was requested by the owner after approving [PR #264](https://github.com/jongsky25/BHW-Connect-Phase-2/pull/264): “make handoffs to lessons 1.6.2 to 1.6.5 ... make their individual pr so that i can start a new chat for each”.
The implementation was merged as `15ea55f3da56ee232f53f804d84f4166884862df`; [PR #265](https://github.com/jongsky25/BHW-Connect-Phase-2/pull/265) records approval and publishes the five reviewed 1.6 revisions.
This branch starts independently from merged-main `27d4752324f4fd50183fcb60a408e537cc784ae4`. It contains this handoff only, not a new teaching enhancement.

Suggested next-chat instruction:

> Continue this PR on branch `codex/lesson-164-enhancement-handoff`. Implement the 1.6.4 enhancement using `docs/lesson-164-enhancement-handoff.md` and prepare the complete draft review package. Keep Gibs as the male BHW. Stop at draft review.

Implement the complete bilingual draft when asked to continue. The 1.6.1 approval does not approve future 1.6.4 teaching, new media or publication. Keep the PR draft until the owner approves its own exact package. Do not merge, publish, reset progress, change flags, apply migrations or bulk-load the module as part of draft preparation.

## Fixed baseline and scope

Work in `content/training/day1-basic-competencies/modules/06-komunikasyon/lessons/communication-record/`. Read [CLAUDE.md](../CLAUDE.md), [the session agreement](session-handoff.md), [the deploy runbook](deploy-runbook.md), and [the 1.6.1 review record](lesson-161-draft-review.md).
The approved baseline is pinned by [the owner approval receipt](https://github.com/jongsky25/BHW-Connect-Phase-2/blob/27d4752324f4fd50183fcb60a408e537cc784ae4/docs/lesson-161-owner-approval.json); its source and 63 selected-media hashes are evidence, not permission to overwrite them.
The release verification is at [the approved release run](https://github.com/jongsky25/BHW-Connect-Phase-2/actions/runs/37748318741).

| Preserve exactly | Baseline |
|---|---|
| Lesson | 1.6.4 · `communication-record` · `897c42a8-b21f-4da5-87a6-ac48bd5ce982` |
| Module | `06-komunikasyon` · `2f01456b-2a39-438e-993b-65482e7ca9bc` |
| Course | `73e0edda-6c28-420f-9c35-05a29563abd3` |
| Position / required | `3` / `true` |
| Titles | Suriin at itala ang impormasyon / Assess and record information |
| Read anchors in relative order | `sources`, `conflicting-accounts`, `practice`, `check` |
| Slide anchors in relative order | `slide-sources`, `slide-conflicting-accounts`, `slide-practice`, `slide-check` |
| Coverage obligations | `m6.assess` |
| Guided allocation | 90 minutes within the same combined 480-minute program |
| Observation | One indicator at `objective_index: 0`; all six bilingual level fields |
| Current voice | `gemini:gemini-3.8-flash-tts:Kore` in both languages |
| Existing art | Approved Gibs portrait on the opening Read/Slides position |
| Existing registry | All 76 compositions and their source/order |

Keep the complete manifest and both objective strings exactly:

- Filipino: “Mula sa dalawang magkaibang kuwento, gumawa ng tala na hiwalay ang sinabi, nakita at hindi pa natiyak, at tukuyin kung paano beripikahin ang kulang.”
- English: “From conflicting accounts, produce a record separating reports, observations and unconfirmed details, with a way to verify the gap.”

These seven approved baseline files are pinned below. Before editing, verify the hashes against the named main commit, snapshot all target files, complete current target narration selections/history, the UUID lock, shared source files, registry and every earlier public media byte. Keep a machine-readable baseline and a scoped proposal receipt with exact predecessor/successor hashes. Do not rewrite an earlier lesson's approval or proposal receipt.

| File under the lesson folder | SHA-256 |
|---|---|
| `lesson.json` | `b458750c08da76b6e6b52e5112302669cea70152689498f30ddf569403b3532f` |
| `read.fil.md` | `d60888baf3d0a8b0ebadd3d8184689356d8e6fc1eeae7073692d1a1c71a90ce9` |
| `read.en.md` | `c0fcc8a88eb01bde9d039b6926688b5d600f38301d977d02da8ff86c4a0245a1` |
| `slides.json` | `377d2184dcb2da26a56de5e1756301d08a42fae4814a21cf17d6c6fa42159c1f` |
| `competency.json` | `6a09475e441c3e8a84885650809263e9bb9309946bee570c45cf61116875bf3c` |
| `facilitator.fil.md` | `03d2a160e403aa48fb7efe1eb3201cf649ac586916b609c31982db0cd03887b4` |
| `facilitator.en.md` | `36fc65b18358cd580809e92317f40892e91232b39964ea98c69103ea2886e30b` |

Capture a fresh bounded, read-only published lesson/revision/private-guide snapshot through the loader admin when implementation starts. Keep authenticated evidence separate from offline browser fixtures and never query learner identities/progress for authoring.
The four other 1.6 lessons and previously released 1.5 lessons are protected. Do not turn a record into a diagnosis or investigation. Retain the gathering/listening setup briefly; detailed report recipients and delivery belong to 1.6.5.

## Six proposed paired screens

Preserve all substantive original anchors and coverage, adding only the explicitly new anchors. Keep their existing resume/concept meaning. Filipino comes first in everyday language; supply a full equivalent English version. Each screen needs a visible relevant illustration, complete Read text and full equivalent Slides narration (`narration_fil` / `narration_en`); display summaries may be shorter.

| Screen | Teaching action and ending | Visual direction |
|---|---|---|
| sources | Gibs separates what Liza said, what a neighbor reported, what he directly observed, and what remains unknown. An observation does not establish motive or a diagnosis. | Four labelled categories; fictional text is rendered accessibly outside the image. |
| relevant-detail (new) | Select only information needed for the authorized profile task. Explain purpose/use and preserve privacy without promising absolute secrecy. | A minimal fictional record with no real identifiers. |
| conflicting-accounts | Keep both accounts attributed rather than selecting the loudest person’s story. Liza can clarify/correct her own account; disagreement remains visible if unresolved. | Clearly separated source labels; no ‘lying’ or ‘noncompliant’ label. |
| verify-gap (new) | Choose a proportionate way to verify one missing detail with the appropriate person/source, and mark it unconfirmed until verified. Show an honest corrected note. | Before/after fictional notes retain provenance and uncertainty. |
| practice | Sort statements and produce a short record with a verification plan. Rotate interviewer/resident/observer roles; include a solo paper sorting task. | Printable source cards, observer checklist and a four-column recording aid. |
| check | Retain the conflicting-account decision. Present its picture first, explain all three proposed records after selection and show a revised attributed record. | The ending preserves reported/observed/unknown categories. |

Write the worked dialogue as an authoring adaptation, not a quotation attributed to DOH. The story should show a correction or uncertainty honestly and end with a useful, confirmed next step rather than an invented resolution.
A nod, silence or looking toward the door is an observation, never proof of agreement, refusal, distress or deception. Never ‘complete’ an official form by guessing. Verify privacy wording against the NPC IRR and actual local record-correction/retention/access procedure; do not invent a universal form or deletion rule.

Keep all three check choices understandable. Show the scene before the choice; show all three rationales and the resolved ending only after selection. Gate takeaway/summary audio until the check is answered. A picture, a voiceover or watching an optional story is not a required competency assessment.

## Gibs and Liza continuity

Gibs is a fictional male BHW throughout 1.6. Reuse the exact approved portrait `/training/bhw-1-6/gibs-portrait-0e78ae41b8ed.png` (SHA-256 `0e78ae41b8ede53907cf4807574edab773514eedd6e03324e36df4309dcf2b02`) as the identity reference; teal polo, navy trousers and closed clipboard.
Liza is the same fictional 29-year-old resident from 1.6.1, with yellow blouse and blue skirt. Preserve identities, appearance and names across this lesson. Inspect reference art before requesting edits. Generate distinct teaching actions, not crops or generic decorative panels. Keep actual private names, filled patient records and diagnostic imagery out of illustrations.
Use the built-in image generator for new scenes. Record output hashes, references, prompts, tool provenance (model undisclosed if unavailable), alt text and captions. New illustrations/story remain draft. Do not globally change Gibs's portrait or regenerate sibling lessons.

## Source and role audit

Start with the originals behind the retained transcriptions:

- [BHW Reference Manual](source-material/day1-basic-competencies/bhw-reference-manual.md), PDF 18–19: listening, respectful questions and clear communication. On page 18, cite the communication passage separately from preceding self-management material.
- Manual PDF 30: confidentiality and respect for differences.
- [DOH Facilitator Guide](source-material/day1-basic-competencies/facilitator-guide.md), PDF 28 / printed 21: gather, assess, record and present information, household role-play, and at least eight hours for the combined competency.
- [Day 1 presentation](source-material/day1-basic-competencies/day1-part1-presentation.md), slides 52–57: competency, communication demonstration and scenarios.
- The 1.6.1 audit retrieved original DOH files and inspected TESDA Barangay Health Services NC II Rev.01, promulgated 11 January 2019, PDF 26–28 / printed 22–24, unit 400311215. Verify the edition/catalogue again before calling it current.

Use [the 1.6.1 source audit](lesson-161-source-audit.json) and its retained original/page-image hashes as a starting point. Verify actual bytes when reusing audited excerpts and build a new claim-to-passage crosswalk for this lesson. Inspect additional relevant pages when the four existing citations do not support a claim. Do not treat source availability or a prior lesson's approval as verification of a new claim.
Record authored dialogue, triad allocation and screen timing as adaptations. Keep privacy wording tied to a current primary NPC source plus actual local procedure; no absolute secrecy, forced eye contact, inference of feelings from posture, unnecessary disclosure, invented referral number, diagnosis, treatment or dose. Keep urgent help from being delayed by an ordinary interview or report.

## Practice, private guide and observable evidence

Retain **90 guided minutes**. The lesson allocations remain `90 + 90 + 120 + 90 + 90 = 480`; the shared module's 480-minute outline is another view of the same program, not an extra eight hours. Measured self-study/audio time must be labelled separately; do not derive it from a guessed narration duration.
Proposed run sheet: 10 opening + 15 demonstration + 30 three-round triads + 20 record revision/verification + 10 debrief + 5 exit check = 90.

Prepare for 30 participants in ten triads, rotating BHW/resident-or-recipient/observer through all three rounds. The facilitator can directly sample triads 1–3 in round one, 4–6 in round two and 7–10 in round three. Label unsampled learner evidence not observed and arrange a later direct observation; peer feedback never becomes a facilitator grade or certification.
Use invented scenarios; no resident record, forced personal disclosure or upload. Provide solo, no-internet, no-projector, reading/language/accessibility alternatives without changing the task standard.

Observable target: The learner attributes each reported statement, distinguishes a direct observation from an inference, records the unresolved gap honestly, selects only relevant information, and names a suitable verification step.
Keep one indicator at `objective_index: 0`. Write all six bilingual level fields around directly observable performance; distinguish no evidence, supported attempt and independent demonstration. Completion and watching the story do not imply competence.

Keep all twelve private-guide headings in this order:
`purpose`, `time-materials`, `prepare`, `opening`, `steps`, `expected-answers`, `misconception`, `practice`, `answer-key`, `observe`, `support`, `sources-review`.
Supply the run sheet, exact demonstration and debrief prompts, expected answers, all check rationales, common errors, direct-observation sampling plan, retry process and pending local-policy review.
Produce bilingual A4-printable role cards, observer checklist and a one-page task aid. The cards must contain enough fictional facts to run the practice and preserve honest unknowns.

## Actual narration and optional illustrated story

Generate narration from the final paired Read/Slides text, including the new screens, in both languages with Gemini Kore. Keep one stable female narrator reading Gibs/Liza dialogue; Gibs being male does not require changing narrator voice or acting out speakers.
Preserve every earlier hashed public file, prior narration selection and full history. Scope style/provider/alias changes to this lesson. New speech aliases must be reviewed against the actual output; retain display names Gibs and Liza.
The 1.6.1 evidence contains repeated timbre concerns and conflicting full/excerpt judgments. Do not claim that another synthesis pass, a model's ‘steady’ verdict or a phonetic alias clears a human listening concern. Listen/review the actual new MP3s and decoded AAC; document unresolved concerns and owner listening status accurately.

Build an optional Filipino/English Remotion story with the six teaching beats and a real ending, measured from encoded audio samples. Append exactly two new compositions (`CommunicationRecordStoryFil` / `CommunicationRecordStoryEn`; 76 → 78 for this independent baseline), preserve all existing registry IDs/source/order, use the standard 854×480 H.264/AAC lesson format, final-frame posters, and six matched WebVTT beats with sufficient ending/post-roll. Run the full registry regression at the eventual final integrated head.
Use caption/beat boundaries from measured narration, not total-duration proportional guesses. Verify audio, timing, ending, captions and posters against the actual shipped files.
For the six-screen proposal, verify twelve target Read tracks plus two stories (fourteen full reviews and fifty-six focused excerpts: names, dialogue/meaning, negation and ending). Retain full and focused reviews of all target Read tracks and both decoded shipped stories, including exact excerpt byte hashes, prompt revision, raw requests/responses and failed/superseded attempts. Cached results are valid only for identical reviewed bytes or proven identical decoded PCM with correct provenance. Model review never substitutes for human approval.

## Complete draft review package and verification

Follow the working 1.6.1 actual-component fixture, media verification, browser, print and package scripts as examples; adapt them to this target rather than overwriting the 1.6.1 implementation.
The self-contained `lesson-1.6.4-gibs-review.html` must render the production components with only explicit save/auth fixtures. Embed every relevant image, MP3, MP4, poster and caption. Include private bilingual guides/rubric and printable material in the review ZIP; label it an offline fixture, not an authenticated production session.

Verify both languages, Read/Slides and desktop/390px mobile for every screen; images before checks; complete rationales/endings; gated summary audio; actual narration-zone highlighting; old anchors/concepts after revision changes; optional-story completion; unmuted ending/captions; fullscreen; one-player exclusivity; language/mode cleanup; overflow and console errors. Include actual case counts and screenshots.
Verify measured Read selections, story MP4/AAC, posters, caption timing, all earlier public bytes, old text → old narration selection, protected sibling source/mappings/history, registry preservation, complete manifests, one indicator and guide heading order.
Use the disposable local Supabase for development and normal E2E. Pilot reads must stay bounded to explicit baseline/release evidence. Do not use a learner progress reset or pilot E2E to make a preview work.

Freeze the final source, run normal CI and the entire Remotion registry at its exact SHA, and build the package only after all required checks pass. Include source-page images/hashes, scene/media provenance, full/focused/raw model evidence, browser receipts/screenshots, private guides, printables and an explicit pending human/SME status.
Verify ZIP safe unique members, CRC, every member size/SHA-256 and exact inline-media matches. Keep its integrity receipt outside the archive. Avoid duplicating a complete ZIP and all its inputs in one Actions artifact; keep each downloadable artifact below 512 MiB, splitting raw evidence into separately hash-pinned archives if needed.
Update this PR around the final implementation and attach its review artifact. Stop with a complete reviewable **draft** and report real limitations.

## Independent branch and later release

The other three handoff branches may continue concurrently in separate chats, but they do not delegate or approve changes in this one. Limit teaching/media edits to `communication-record`; shared narration/provider/UI/registry edits must be explicitly scoped and hash-reconciled. Preserve 1.6.1 and its owner receipt, exact earlier approved sources, every non-target revision pointer and all current public assets.
Keep the branch independent. If main advances, integrate it once before final review/merge and recapture/reconcile the final baseline, shared receipts and registry. The full-registry count must then reflect already merged sibling compositions rather than blindly assuming 78.
Do not loosen historical release tests. For necessary shared changes, use a bounded successor/predecessor bridge that first verifies actual proposed bytes and retained predecessor hashes, with tests of the new target and protected history.

After separate approval of this exact lesson package, follow [the controlled release](lesson-161-live-release.md) and the established loader:
`--mode lessons --modules 06-komunikasyon --lesson-keys communication-record`.
Dry-run first; verify the production deployment/media; publish only this lesson and compare bounded before/after rows. Keep all other published revision pointers, UUIDs, learner progress, assessments and flags unchanged. The five-lesson Gibs continuity release is scoped separately in PR #265; do not replay it or republish all five for each enhancement.
