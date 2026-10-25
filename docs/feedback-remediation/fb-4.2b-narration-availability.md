# FB-4.2b — narrated lesson availability and finding Listen

The owner requested review/fixes for reports
`51a1027c-1896-4137-9c6f-b68bad6eae32` (missing narrated story),
`f0d7106c-326f-4f84-83be-bcf5faf9fec2` (missing Filipino story), and
`fd07531f-277e-4eab-b97e-4e31c0f67a0f` (missing Pakinggan).
Training owner remains Ray Justin Ventura. No feedback reply/status mutations.

## Current evidence

Read-only pilot metadata on 25 October 2026 binds the first two reports to
`problem-prioritize`, lesson `9b959b18-f9e4-4b2f-a7ef-569d5992963d`, revision
`41f73c43-9655-45d1-9a88-94772bc51f01`, hash
`ca5834ca03409c356d8f4b0b9d2a3187db7d3753f16e58cdaa24e2863c77c5f9`.
Its six illustrations are approved, but it has no featured video in either
language. This is a confirmed current media gap.

The Pakinggan report identifies `bhw-legal-role`, lesson
`cf99b391-efbf-4efd-9588-59a7136567fc`, revision
`5f9cb97b-9e02-4da5-abf2-c0f0d1e8d303`, hash
`7a4880da236ea31a78647bb447ba6ff66eb7be701eb442059c3fabf77eddc57e`.
Both languages already have a narrated story and six matching section recordings.
The current Prioritize lesson also has all six matching recordings per language;
its old incomplete-draft review predates the separately approved narration in
`docs/lesson-173-narration-approval.json`. Missing current Read audio is therefore
not reproduced. All 24 current section recording URLs return 200/audio with exact
manifest SHA-256 hashes. This does not reconstruct either historical session.

## Delivered behavior

Prioritize now has **Illustrated narrated lesson / Araling may larawan at
salaysay** in both languages. It is a derived video of the five teaching sections,
using the exact approved Carole illustrations and the separately approved Gemini
Kore Read recordings. No new words, generated voice or new instructional claim.
It is explicitly labelled an illustrated narrated lesson; it is not presented as
a newly animated short story or as a render of the pending six-beat story script.
English is about 8 minutes / 5.52 MB; Filipino about 8 minutes 43 seconds / 6.09 MB.

The final self-check's recording, question choices, answer feedback and takeaway
are excluded from both videos and transcripts. The existing video-end handoff
opens the original self-check; it does not submit an answer, record competence or
complete the lesson. Its full narration/summary unlocks only after response,
and completion still requires the existing explicit action. Practice instructions
and worked examples in the five teaching sections remain their approved words.

Videos have H.264/AAC, 854×480, mono 24 kHz audio, fast-start metadata, 78 measured
sentence caption cues each, the original first-scene poster and a text transcript
of the five approved teaching sections. Native controls, no autoplay/preload,
original symbolic-counter/card caption and accurate AI-illustration label remain.
All five scenes fit without cropping. The first Read/Slides screen explains
where Listen/full narration is located and that the self-check is separate.
Legal basis receives the same scoped audio discovery help; its existing video,
recordings and all teaching remain intact.

Selection requires the exact lesson key/hash, all five approved image identities,
and the five current-language recordings matching their current Read text.
A future authored featured asset takes priority. Translated variants, unknown
revisions, changed text/assets or missing tracks do not receive this derived
presentation. The complete previous reader is reconstructed with eight exact
replacement groups for historical guards. No old receipt or approval rewritten.

No lesson revision/guide/assessment/source change, migration, database publication,
new provider request, pilot write test, user message or feedback notification.
The four derived media files live under a new hash-named public directory; every
old media byte is retained. Prior speed/continuation behavior is unchanged.

## Verification and boundary

Source checks bind all ten recording files to the existing narration approval and
all five scenes to approved source. They verify the final-check exclusion,
caption counts, hashes and contiguous measured section boundaries. The older
whole-media preservation test excludes only these four explicitly bound additions
while still checking every preceding source/media byte.

`fb-4.2b-media-verification.json` records codec/dimension/rate checks, full audio
decode with non-silent RMS and peaks below 0 dBFS, fast-start layout, and SSIM over
0.97 for every actual encoded scene against its approved, aspect-fitted source.
Actual final-encode first/worked-score/practice frames were visually inspected.

Component tests use the actual reader in both languages, Read/Slides and
inline/fullscreen. They cover video/caption language selection, no autoplay,
AI attribution, transcript/check exclusion, original video-end handoff, hidden
pre-response check audio and explicit completion/read-only callbacks. Drift
refusal and Legal-basis recording access are covered. Disposable local CI tests
cover both lessons, both languages and general training/assessor study with real
section/video playback, captions, original check gates and explicit completion.
Pilot URLs are refused and temporary fixture flags restored.

Authenticated production access is unavailable. Final CI, offline browser review,
exact production commit/alias, public media smoke and fresh read-only bindings
are recorded in the release PR. Keep these reports open for live comments.

Offline actual-reader/application-CSS review passed eight combinations of
English/Filipino, light/dark and 320/1280px XL. Actual final MP4s played, all
five measured scene positions were seekable, and 78 caption cues loaded per
language. Native video completion handed off to the original locked self-check;
response unlocked the existing full narration. The new guide and video panel
had zero axe violations and no horizontal overflow. Screenshots of mobile
Filipino/dark and desktop English/light were inspected. Framework navigation
and image components were shimmed; local media serving implements HTTP ranges
like the deployed player. These checks are not authenticated production tests.

The new longer video-tab label wraps inside the fullscreen control group for
this derived presentation; other lesson controls keep their existing layout.

Additional native fullscreen browser review passed both languages at 320px XL: the
video controls fit, captions and all scene seeks worked, and actual playback end
opened the original question with its answer audio still locked until response.
