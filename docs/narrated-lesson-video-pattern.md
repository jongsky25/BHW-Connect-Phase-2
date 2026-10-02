# Narrated lesson video pattern

Use this for Chapter I lessons after the 1.1.5 pilot. The learner's controls
are **Basahin · Slides · Video · Buong screen**. Video is a separate, optional
view and mounts only when selected. Full screen opens the selected view. Read
keeps its own section-level expressive narration; Slides keeps its own text.

## Authoring

1. Base a short video script on the approved lesson's objective, Read and
   Slides content, and sources. Use a small sequence of timed beats with
   distinct visual changes. Do not add clinical instructions or a universal
   local workflow that the lesson does not teach.
2. Render Filipino and English Gemini voiceovers separately. Keep voice style
   directions in speech metadata, with exact words in the script. Save each
   voice track and measured beat timings under `remotion/public/<story>/`.
3. Make one Remotion composition per language. Use the measured timings for
   scene pacing and a final summary frame for the poster. Render at 854×480,
   H.264 with audio and language-matched WebVTT captions using
   `npm run remotion:render -- <composition> <name> --public training/bhw-1-1 --with-audio --captions <story>/narration-<lang>.json`.
4. Add a featured asset in `lesson.json` with the poster `path`, SHA-256
   `content_hash`, bilingual alt and caption text, provenance, and
   `videos.fil` / `videos.en` paths, hashes, durations, and caption paths.
   Keep new media at `review_status: draft` until the owner reviews it. The
   loader does not promote draft media.
5. Leave the existing Read narration unchanged unless Read copy changes. A
   video script change requires new voice, timing, captions, video, and
   content-hashed public paths. Avoid replacing immutable media in place.

## Review and release

Listen to both language tracks and inspect motion, legibility, captions,
poster, mobile layout, and full-screen behavior. Check that the Video choice
is absent for lessons without a featured video and that completion still
requires finishing a featured clip. Record review in the lesson's layout
review document. After owner approval, mark the asset approved, merge the PR,
verify Vercel production, then use the scoped lesson loader dry run and
publish workflow for the one lesson. Preserve published metadata and progress.

Lesson 1.1.5 is the first released example in `remotion/src/records/`. Lesson
1.1.4 follows it in `remotion/src/service-provider/`; its bilingual video
was approved by the owner on 2026-10-02.
Lesson 1.1.3 uses the same pattern in `remotion/src/community-organizer/`;
its bilingual video was approved by the owner on 2026-10-02.
Lesson 1.1.2 follows in `remotion/src/health-educator/`; its new video remains
a review draft.
