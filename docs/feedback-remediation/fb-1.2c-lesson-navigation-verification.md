# FB-1.2c — remaining lesson-navigation verification

The owner directed an end-to-end check of answering, saving completion, moving to the next lesson, returning to earlier sections and crossing subchapters. This increment verifies existing navigation before inventing another interface change.

## Report-specific findings

A read-only pilot query on 26 October 2026 confirms all four reports are still `new`, without screenshots:

| Report | Current evidence and bounded disposition |
| --- | --- |
| `25c15e79-11ba-4bda-a873-c888fde12f67` | General difficulty finding controls on assessor Health Educator lesson `6aa6a9ec-b8fd-48ce-a874-6449ed3c2ce5`, key `bhw-health-educator`. Current published revision `c8e57cba-b0a6-4f7a-90a0-2c9d0888e7b9` has five Read sections and five Slides. Existing chapter/subchapter headings, Reading tools, section outline, personal progress links, completion guidance and next-lesson links address this area; the original ambiguous symptom is not independently reproducible from the message. |
| `31c467d3-04c0-4b18-9082-2543f633959c` | Difficulty navigating options/returning to earlier tabs on assessor Community Organizer lesson `24771587-9bd0-4f6c-acb0-ade791a24f45`, key `bhw-community-organizer`. Current revision `1647e366-8904-47b7-91e9-bf20422c5c8e` has six Read sections and six Slides. Previous/Next and view switching already retain same-view practice choices. Reload restores position, while unfinished practice answers deliberately need fresh attempts; FB-5.1e now explains that distinction. |
| `b1e43e76-1ba8-422a-a86a-6682b4f23b11` and candidate duplicate `9cd61e10-9b97-4941-bf57-241a4d0fde22` | Both say “Cannot proceed to next lesson” from `/feedback`, with no lesson, prerequisite or screenshot. The original blocked step remains unidentified. Retain both IDs and their candidate-duplicate relationship; a successful current journey cannot prove the historical issue resolved. |

FB-1.2a already fixed next-lesson links crossing subchapters in PR #330. Existing route tests cover publication/quiz gaps, final chapter lessons, current-revision progress, completed bookmarks and avoiding self-links. Current formative completion requires all checks in the chosen view and the final section, then a successful save. Read/Slides answers are separate and transient; viewing or browsing ahead is not completion. No new mandatory sequencing, playback rule or persisted-answer contract is introduced.

## Added regression journey

`e2e/lesson-progression.spec.ts` exercises the actual training pages, reader and persistence RPCs for **both assessor and BHW**, each in **English and Filipino at 320px/XL**. Three clearly fictional published lessons use the two reported manifest keys in module 0 and the next module's `uhc-coverage` key. They are isolated fixture content, not replacements for published pilot lessons or evidence of new content approval.

The journey checks:

- A skipped earlier check keeps completion disabled; Previous revisits and retains an attempted wrong answer, and Read/Slides do not borrow answers.
- An aborted completion request records no completion and exposes no saved-next-lesson link; retry records exactly one current-revision completion.
- Reload preserves completed status and the same-module next destination.
- The second lesson saves a Slides position through the real resume RPC. Reload restores that position but clears unfinished practice answers. Fresh attempts permit completion.
- Saved continuation crosses into the next subchapter. Browser Back and reopening from the lesson list retain the two saved completions. The third lesson stays unfinished, without an invented saved-next destination.
- Exam, qualification, award and certificate snapshots remain unchanged; the fixture stops before whole-course completion. No historical regrading or qualification is inferred from practice.

An unconditional localhost:54321 guard runs before account creation and all SQL. Each case owns its course, program, modules, lessons, revisions and study rows. Between languages, only those fixture study rows are reset. Feature-flag values and disabled-role lists are captured/restored; immutable revision cleanup is scoped to the fixture IDs inside the existing transactional trigger pattern. The reader is unmounted before cleanup. All mutation tests target disposable Supabase; the pilot is read-only.

## Validation and outcome limits

109 focused component/route tests pass. TypeScript and lint pass with four existing unrelated warnings. The new real-route journeys run in CI's disposable database with the complete browser suite; exact results and release receipts are recorded in the release PR. Local Docker image download exceeded the Docker daemon's storage allocation, so local database startup was stopped and the four downloaded task images removed. No local database or pilot write journey is claimed.

This increment adds verification and report dispositions, with no application change. Current support is recorded for live review; the two location-free historical blockers remain unidentified. Original live statuses stay `new`. All 214 tracker IDs and the two owner-deferred dispositions remain intact. Ray Justin Ventura remains training owner. Public release verification confirms the exact deployment and signed-out routes; it is not an authenticated production walkthrough.
