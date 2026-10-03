# Lesson 1.1.2 — Cebuano and Hiligaynon review

Both language packages are drafts for owner review. Lesson 1.1.1 was approved and released in PR #233; that approval does not apply to this lesson.

The packages include the full five-section Read text, objectives, takeaways, five slides, formative question, options and feedback, image descriptions, learner controls, and the six-beat animated Health Educator story. Source section IDs, answer order and the correct answer at index 0 are preserved. Filipino and English content and progress remain on their existing revisions.

Gemini generates section reading audio and story narration using `gemini-3.8-flash-tts`, voice `Kore`. The speech prompts request natural Cebuano or Hiligaynon pronunciation and intonation, a clear conversational teaching pace, and exact reading of the approved text. They retain the official English role name Health Educator. Audio and video are linked by language, with matching captions and translated on-screen labels.

Each package is bound to the complete source text. Draft packages appear in staff reviews only and remain unavailable to learners until the owner approves them. Changes to the source text hide a stale translation. No database migration or content load is part of this draft.

Owner review should check the meaning of the translations, natural word choice, pronunciation and pacing. No native-speaker certification is claimed.

Rebuild the local package with `node scripts/lesson-translation-build.mjs --lesson 1.1.2 --language ceb` (or `hil`). Generate audio with `scripts/lesson-translation-narrate.mjs` and the same selectors. The portable review is exported by `scripts/lesson-translation-finalize.mjs` after the matching Remotion composition and captions have rendered. Gemini credentials stay outside the repository.
