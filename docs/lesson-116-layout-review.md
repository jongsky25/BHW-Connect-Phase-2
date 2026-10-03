# Lesson 1.1.6 build and review

Lesson: `bhw-roles-application` — **Gamitin ang mga tungkulin / Apply the Roles**.

## Source and learning target

The BHW Reference Manual (PDF pp. 11–12), Day 1 presentation (PDF pp. 5,
9–12), and Facilitator Guide (PDF pp. 19–20) support applying the three
roles, following a workplace instruction, and communicating relevant
information. The lesson uses a fictional standing-water observation and
the midwife's instruction to record, ask, and report remaining action.
It teaches no diagnosis, treatment, or universal local referral route.

| Screen | Learner action | Stable section ID |
| --- | --- | --- |
| One observation, three roles | Read and clarify the instruction; distinguish observation from assumption | `applied-observation` |
| Listen before explaining | Ask and listen, then use approved teaching material | `applied-education` |
| Invite people to take part | Invite partners and listen before agreement | `applied-organizing` |
| Guide and record the action | Confirm the contact and local route; record only actual action | `next-learning` |
| Observed, done, and needed | Give a short handover that matches the record and instruction | `handover` |
| Apply and explain the roles | Choose the complete response, then explain and demonstrate it | `check` |

The existing lesson key, title, objectives, required flag, and section/slide
IDs remain intact. The guide/record screen precedes the handover in this
revision. Both languages, takeaways, final check, feedback, facilitator
role-play, and observable competency criteria follow the same sequence.
The obsolete claim that Chapters II and III are unavailable is removed.
Online completion and observed practical competence remain separate.

## Illustration

`public/training/bhw-1-1/roles-application-328d2317d8fd.png` was generated
with the built-in imagegen tool on 2026-10-03. The existing community
organizer image was a fictional Riza/midwife character and style reference.
It depicts Riza giving a handover to the midwife using a blank notebook,
with an older resident listening. It contains no legible personal data,
logos, clinical procedures, or medication. Bilingual alt/caption text and
the full SHA-256 are recorded in `lesson.json`; narrow crops retain Riza
and the midwife. The existing A07/A02 schematics remain as fallbacks.

Final image prompt: create a warm, realistic landscape educational image
consistent with fictional Riza in a teal polo and the midwife in light
blue. At a shaded Philippine barangay health station veranda, Riza gives
a short handover using a blank notebook while an older resident listens.
Show modest houses, tropical plants, and a distant shallow puddle as an
environmental observation. Center the two health workers for narrow
phone crops. Use natural light and sound anatomy; include no text,
logos, patient data, medical procedures, medication, or watermark.

## Read narration and animated story

Six Read sections in Filipino and English use expressive Gemini TTS
(`gemini-3.8-flash-tts`, Kore), with measured sentence timings matching
the final words. The lesson-specific delivery style is part of the
audio content hash, so future text edits preserve that provider and
invalidate stale recordings.

`remotion/src/roles-application/narration.ts` authors six animated beats:
observation, educate, organize, provider, handover, and recap. The two
language compositions use separately generated Gemini voiceovers,
measured beat timings, moving scene/card transitions, and language-matched
WebVTT captions. Renders use 854×480 H.264 video and AAC narration, with
a bilingual summary poster. Original scripts, audio, and timings remain
in the repository. New public media have content-hashed paths.

The learner controls are Basahin, Slides, Kuwentong may salaysay, and
Buong screen. The first Read screen and first slide link to the video;
the video mounts only when chosen. Full screen presents the selected
view. Read retains its own narration. Reaching the end and answering
Read or Slides checks allows completion without watching the video.

## Review and release

The owner approved lesson 1.1.6 and instructed live publication on
2026-10-03. Approval covers the bilingual lesson copy, new illustration,
12 Gemini Read recordings, both narrated animations, and matching captions.
The two new assets are marked approved. The facilitator confirms local
contacts, record requirements, and route with the health team.

Release uses repository CI and a scoped loader dry run, then production
deployment and publication of only `bhw-roles-application`. Retain existing
published metadata, identity, and learner progress; verify the adjacent five
lessons' published pointers after publication.

## Implementation verification — 2026-10-03

- Production build (`npm run build -- --webpack`), TypeScript, repository
  ESLint, and the Remotion ESLint/TypeScript checks passed. Webpack was used
  because this isolated local checkout borrows installed dependencies through
  a directory junction, which Turbopack disallows outside its project root.
- All 110 focused tests passed, including reference source/coverage validation,
  narration matching, Gemini continuity, bilingual media hashes, and viewer
  behavior. The narration dry run requires zero new recordings. Only this
  lesson's narration manifest entry changed; older public recordings remain.
- Local browser checks covered all six Read sections in four language/viewport
  combinations (desktop, phone, tablet, and landscape), Read playback, image
  display, answer feedback, full-screen scrolling, and completion without
  watching the optional story. No page errors or horizontal overflow occurred.
- Both video language choices played successfully, loaded all six WebVTT
  cues, mounted one player in full screen, and unmounted it when returning to
  Read. Video duration is approximately 83.8 seconds in Filipino and 71.4
  seconds in English; renders contain H.264 video and AAC audio.
- Inspected the original image, a rendered story scene, summary poster, and
  desktop/phone/full-screen screenshots. Saved both narrated video previews,
  caption files, Read samples, all 12 Read tracks, and browser check reports
  for owner review. Owner approval and live release authorization were
  recorded on 2026-10-03.

Browser checks used the actual lesson component and authored lesson/media in
an isolated local fixture. Next image/link/navigation were adapted for the
fixture; resume and completion callbacks were local stubs. No authenticated
production session or database publication is claimed by these checks.
