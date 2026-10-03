# Lesson 1.1.1 language pilots

The owner approved both language pilots and requested merge on 3 October 2026.
Both packages are `approved`. Learners and staff can select Bisaya (Cebuano,
`ceb`) and Hiligaynon (Ilonggo, `hil`) when the complete published source lesson
matches the translation snapshot.

Each pilot covers the objective, five Read sections and takeaways, five slides,
practice prompt/options/feedback, image descriptions, lesson controls, and six
animated story beats. Official English role names remain as taught in the
source. IDs, correct-answer positions, source revisions, and the supported
Filipino/English progress language are preserved.

## Media review, 3 October 2026

Gemini `gemini-3.8-flash-tts`, voice `Kore`, generated each language's five
reading tracks and separate story narration. Delivery instructions request
the respective language. Hiligaynon instructions explicitly request Ilonggo
pronunciation, word stress, and gently melodic intonation without switching
to Cebuano or Tagalog. Instructions are speech metadata, not spoken text.

- Cebuano: approximately 221 seconds of reading, 95-second animated video.
- Hiligaynon: approximately 215 seconds of reading, 91-second animated video.
- Both videos use the original animation scenes at 854×480 with matched
  WebVTT captions and a localized summary poster.
- Automated transcription recognized Hiligaynon in all five reading tracks
  and the story. This is a transcription spot check, not native-speaker approval.
- App and Remotion typechecks and changed-file lint passed. All 165 focused
  lesson/narration tests passed with one worker; the first parallel run hit
  worker/test timeouts while the video renderer was running.
- Browser review loaded all Hiligaynon reading tracks, navigated all slides
  and practice feedback, played the video, checked its `hil` caption language,
  and switched directly to Cebuano media. No page errors or mobile horizontal
  overflow were found at 390×844. Desktop Read, mobile Slides, and the video
  summary poster were visually inspected.
- Portable HTML reviews embed their captions as a Blob to support direct
  local-file opening. The Hiligaynon export played with six loaded caption
  cues and no console errors.

## Repeat the scoped workflow

Use `--language ceb` or `--language hil`; omitting it retains Cebuano as default.
Keep the API key outside the repository. Narration caches completed utterances
under ignored `.preview/` so interrupted runs can resume.

```sh
node scripts/lesson-translation-build.mjs --language hil
node scripts/lesson-translation-narrate.mjs --language hil # dry run
node scripts/lesson-translation-narrate.mjs --language hil --apply
npm run remotion:render -- RolesHepoStoryHil roles-hepo-riza-gemini-hil --public training/bhw-1-1 --with-audio --captions roles-hepo/narration-hil.json
node scripts/lesson-translation-finalize.mjs <output-directory> --language hil
node scripts/lesson-translation-preview.mjs --language hil
```

These scripts do not access the database or publish lesson content. The approved
packages are released through the repository's normal merge/deploy process. Any source-text change
hides the translation until its text and snapshot are reconciled.
