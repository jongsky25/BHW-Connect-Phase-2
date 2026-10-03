# Lesson 1.1.2 — Cebuano and Hiligaynon review

The owner approved both language packages and requested merge and deployment on 3 October 2026. Both packages are approved for learners and staff when the published source matches the complete translation snapshot. Lesson 1.1.1 remains approved and released in PR #233.

The packages include the full five-section Read text, objectives, takeaways, five slides, formative question, options and feedback, image descriptions, learner controls, and the six-beat animated Health Educator story. Source section IDs, answer order and the correct answer at index 0 are preserved. Filipino and English content and progress remain on their existing revisions.

Gemini generates section reading audio and story narration using `gemini-3.8-flash-tts`, voice `Kore`. The speech prompts request natural Cebuano or Hiligaynon pronunciation and intonation, a clear conversational teaching pace, and exact reading of the approved text. They retain the official English role name Health Educator. Audio and video are linked by language, with matching captions and translated on-screen labels.

Each package is bound to the complete source text. These owner-approved packages appear for learners and staff. Changes to the source text hide a stale translation. No database migration or content load is part of this draft.

Owner approval covers the translated content and narration. No separate native-speaker certification is claimed.

Rebuild the local package with `node scripts/lesson-translation-build.mjs --lesson 1.1.2 --language ceb` (or `hil`). Generate audio with `scripts/lesson-translation-narrate.mjs` and the same selectors. The portable review is exported by `scripts/lesson-translation-finalize.mjs` after the matching Remotion composition and captions have rendered. Gemini credentials stay outside the repository.
