# Lesson 1.1.4 — Cebuano and Hiligaynon review

The owner approved both language packages and requested merging and deployment on 3 October 2026. Approved packages are available to learners and staff when the complete published source matches.

The packages include all six Read sections, objectives and takeaways, six slides, the formative question, options and feedback, image descriptions, learner controls, and the six-beat animated Service Provider story. Source section IDs and answer order are preserved. The original correct answer is at index 2. Filipino and English content and progress remain on their existing revisions.

The translations preserve the BHW's role within the primary care team, listening and clarifying a resident's need, acting within training, local policy and supervision, seeking guidance when unsure, explaining the next step and following the health team's follow-up instructions. Examples of initial services remain examples; the lesson does not teach measurement, first aid or treatment. It retains the instruction to follow applicable local referral and emergency procedures without implying one universal route. No clinical advice or new treatment instructions are added. Names and English role and health-service terms remain recognizable.

Gemini generates reading audio and story narration using `gemini-3.8-flash-tts`, voice `Kore`. Speech prompts request natural Cebuano or Hiligaynon pronunciation and intonation, conversational teaching pace and exact reading of the authored text. Audio, video, captions and on-screen labels match the selected language. Credentials and temporary caches stay outside Git.

Each approved package is bound to the complete source text and available to learners and staff. Source changes hide stale translations. This draft includes no database migration or content load.

Owner approval covers the translated content and narration. No separate native-speaker certification is claimed. Translation build, narration, preview and finalization scripts accept `--lesson 1.1.4 --language ceb` or `hil`.

Validation: all 61 relevant local tests passed, including matching-source access, staff draft access, learner exclusion, original answer index 2, Read/slide navigation, feedback and matching media. The existing whole-course narration check initially hit its 60-second limit during synthesis and passed unchanged on an isolated rerun in 19 seconds. App and Remotion typechecks and changed-file lint passed. Reading audio totals about 225 seconds in Cebuano and 229 seconds in Hiligaynon.

Both videos rendered at 854 × 480, about 66 seconds in Cebuano and 65 seconds in Hiligaynon. Audio/video/caption hashes, reading timings, six caption cues and video size budgets passed. Both portable review exports contain six Read sections and six slides, matching embedded and separate captions, and all required local media. Browser checks covered all Read sections and slides, incorrect/correct feedback, reading audio and video playback, matching caption tracks, language switching, full-screen opening/closing and Hiligaynon landscape orientation. Both languages fit a 390-pixel mobile viewport without horizontal overflow. No browser console errors were captured. Production signed-in smoke remains pending; no authenticated production session is available in this workspace.
