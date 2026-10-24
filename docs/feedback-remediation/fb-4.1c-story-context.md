# FB-4.1c — case context and a literal story transcript

The owner directed comparison of the Empathy and clear explanations story,
captions and questions, followed by a focused fix, tests, merge and live release.
Reports `74fc1ea8-8f4b-476f-81f2-22717abb68c1` and
`db4911a0-799a-4d5f-9540-c3890d24310e` were checked read-only on 24 October
2026; both remain `new`. No messages or feedback-status updates were sent.

## Comparison and confirmed gap

Current published lesson `912955af-f6fa-4f74-a2dd-a66a0effe87c` uses revision
`ed417073-edc6-43c8-aa94-7d6dbe8f83d0`, content hash
`5aad3a1519e0c686325b22752d3ecacf62e2b3403ee7c4c64e279b3dec925b82`.
Its approved Read text gives all four people's situations. The six-beat
English/Filipino narration scripts match the selected published WebVTT files
exactly, but are condensed:

| Person | Read context | Recording/caption finding |
| --- | --- | --- |
| Liza | Childcare makes attending difficult; asking about scheduling is not a booked appointment. | Childcare concern and no appointment are already stated. The historical report does not prove this current Liza context is absent. |
| Jo | Worried about something heard about family planning; wants her own choice. | Says hear Jo's concern and respect choice, without identifying family planning or the concern. |
| Ben | Has felt low for several weeks and wants someone to talk to. | Says listen without diagnosis, without stating what Ben has described. |
| Ramon | Wants to cut down smoking; stress is a barrier. | Says hear Ramon's goal and do not choose medicine, without naming smoking or the goal. |

The final Read/check body already explains Liza's unconfirmed appointment and
misunderstanding. Its three choices and rationales remain valid. The story's
ending also demonstrates clarification and recheck. There is no evidence here
of a scoring error or an incorrect answer key.

A separate text-access defect is confirmed: the story player's **Steps as
text** fallback showed only the asset's short six-beat alt summary, not the
actual narration. The second report selected a details summary without its
text, so this is a useful bounded improvement rather than proof of the exact
historical placement symptom.

## Delivered live-review behavior

Selecting Narrated story shows a **Before you watch / Bago manood** panel
above the player. It identifies Gibs as the BHW in fictional situations and
uses approved Read excerpts to introduce Liza, Jo, Ben and Ramon. Ellipses
explicitly mark the omitted sentence between Ramon's two quoted excerpts.
The panel explains that the video is short and Read has the full explanations.

For this verified story, **Story transcript / Teksto ng pagsasalaysay**
replaces the generic Steps as text summary. Opening it shows the exact six
caption/narration paragraphs, including the existing ending, in the selected
language. It is a transcript of the recording, not a full Read transcript.
Original video caption tracks, poster selection, AI-illustration disclosure,
alt text, playback controls and optional story-to-question handoff remain.
The same player content serves inline and fullscreen training/assessor study.

The supplement is bound to the audited lesson key, complete revision content
hash, featured asset ID and exact selected video/caption paths and hashes.
Excerpts must still exist in the corresponding Read sections. Any mismatch
omits the supplement and retains the previous player fallback, rather than
showing stale context beside changed media. Other lessons and translations
receive no guessed transcript or context.

This increment supplies visible context beside the unchanged condensed
recording. It does not claim to add spoken lines, regenerate media, move all
text alternatives to Read, or resolve every concern in the reports. Authored
lesson source, selected media, narration timing, private guides, assessment
items/keys, scores, completion rules, progress APIs and database schema remain
unchanged. An exact shared-reader successor preserves the complete prior
source for historical guards without changing old approval hashes.

## Verification and release

Unit checks bind every excerpt to approved Read and every transcript paragraph
to both the selected caption bytes and narration script. They verify unchanged
video hashes, bilingual story-only context, actual caption text, inline and
fullscreen rendering, one player, no autoplay or read-only progress writes,
and refusal after lesson, revision, video, caption, asset or excerpt drift.
Existing reader, completion, media-label and historical checks remain.

The disposable fixture retains Chapter 2 heading checks and adds the exact
authored story payload under temporary Chapter 1/module 1.6 identities.
For this reader journey, qualification/rollout flags are snapshotted, temporarily
disabled in the disposable database and restored in cleanup; a supported legacy
pretest receipt admits the assessor. Qualification/rollout flows keep their
separate suites. Browser coverage checks both languages and training/
assessor study, context and the six-paragraph transcript, one non-autoplaying
captioned player, native fullscreen, 320px/XL light/dark accessibility, and the
existing layout/zoom/mode-continuity checks. No write-based test touches the
pilot. The PR records final CI, merge SHA, exact production readiness and
public smoke checks. Both reports stay open for live comments and any later
spoken-story or text-placement revision. Training owner is Ray Justin Ventura.
