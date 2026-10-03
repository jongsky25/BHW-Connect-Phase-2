# Lesson 1.1.3 — Cebuano and Hiligaynon review

The owner approved both language packages and requested deployment on 3 October 2026. Both packages are approved for learners and staff when the complete published source matches the translation snapshot.

The packages include all six Read sections, objectives and takeaways, six slides, the formative question, options and feedback, image descriptions, learner controls, and the six-beat animated Community Organizer story. Source section IDs and answer order are preserved. The original correct answer is at index 2. Filipino and English content and progress remain on their existing revisions.

The translations retain the distinction between an observation and an unverified cause of illness. They preserve residents' participation, representation and reporting back in the local planning process, and the statement that a proposal's inclusion in planning does not guarantee funding. The official terms Community Organizer, barangay planning team for health, and Local Investment Plan for Health (LIPH) are retained.

Gemini generates section reading audio and story narration using `gemini-3.8-flash-tts`, voice `Kore`. Speech prompts request natural Cebuano or Hiligaynon pronunciation and intonation, a conversational teaching pace, and exact reading of the authored text. Story prompts ask for LIPH to be pronounced letter by letter. Audio, video, captions and on-screen labels are matched to the selected language.

Each package is bound to the complete source text. Owner-approved packages appear for learners and staff. Source changes hide a stale translation. This draft includes no database migration or content load.

Owner approval covers the translated content and narration. No separate native-speaker certification is claimed.

The translation build, narration, preview and finalization scripts accept `--lesson 1.1.3 --language ceb` (or `hil`). Registered Remotion compositions use the matching narration files, measured beat timings and captions. Gemini credentials and temporary caches stay outside Git.

Validation: 57 relevant local tests passed, including source binding, staff draft access, learner exclusion, all six Read and slide pages, original answer index 2, feedback and matching media. App and Remotion typechecks and changed-file lint passed. Both 854×480 videos rendered with audio; the readings total about 222 seconds in Cebuano and 215 seconds in Hiligaynon, and the videos are 84 and 83 seconds. Media hashes, measured reading durations, timing order, six caption cues per video and video size budgets passed. Portable review pages include all six Read sections and six slides, available local media and embedded captions.

Browser verification covered every Read section and slide in both languages, wrong and correct feedback, playable section audio and videos, matching caption language, no console errors and no horizontal overflow at 390px. These checks used the local lesson component preview without a database connection.
