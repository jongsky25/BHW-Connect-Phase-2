# Chapter 1 Gemini narration restoration review

## Cause

PR #225 renamed the Chapter 1 character to BHW Riza. It also replaced the
approved Gemini story videos in lessons 1.1.1–1.1.5 with new Edge Read Aloud
renders, and its Read narration regeneration changed those five lessons to
Edge voices. The published revisions still point at those Edge videos. The
older Gemini videos remain in the repository but say Marites, so pointing the
Riza lessons at them would reintroduce a character mismatch.

## Correction for review

- Re-rendered all five Riza story scripts in Filipino and English with
  `gemini-3.8-flash-tts` / Kore. Each of the six scene utterances is synthesized
  separately and timed from the resulting audio.
- Re-rendered all 56 Read sections across those five lessons with Gemini in
  both languages. The narration manifest matches the current Read text.
- Generated one bilingual pair of content-hashed MP4s and WebVTT caption files
  per lesson. The owner reviewed and approved all five pairs on 2026-10-02.
- Kept the older content-hashed files for already-published revisions.
- Made the narrated story visible from the first Read screen and first slide;
  the Video view is labeled “Narrated story” / “Kuwentong may salaysay.”
- Added a regression test for the Gemini provider in both Read narration and
  the featured animations.

## Verification

All 10 new videos contain audible AAC audio. Each has six caption cues whose
text and timestamps match the six measured narration beats. SHA-256 hashes
match the asset manifest. The Read narration dry run reports zero stale
sections after regeneration. The focused lesson viewer, source validation,
narration, and Gemini continuity tests pass.

The separate lesson 1.2.2 presentation correction uses the existing approved
Vlanche and Mang Ernesto illustration in Read and Slides, links to its already
approved Gemini narrated story, and removes duplicated numbers on its first
slide. It does not change the approved 1.2.2 media files.

## Release

The owner listened to the Filipino and English previews for lessons
1.1.1–1.1.5 and approved live deployment on 2026-10-02. The five featured
assets are marked `approved`. Run CI and a scoped loader dry run, publish only
those five lesson keys, and verify the live video paths and adjacent lesson
pointers.
