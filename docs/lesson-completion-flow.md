# Reference Manual lesson completion

Implemented against main `93fa455` on 25 September 2026, addressing the remaining learner-flow items in content-assessment-2026-09.md Phase 0.

- A new completion requires being on the final section/slide and attempting every check in the selected modality. Either Read or Slides is sufficient; the first answer need not be correct.
- The separate Video view is optional and does not gate completion. It remains available for replay in either language.
- Attempts stay visible across section and modality navigation and are scoped to lesson, revision, modality and section. Reload restores the existing server resume position, but checks must be attempted again. The interface explains this.
- Read takeaways and check-slide summaries appear after a response. Read practice precedes the takeaway. On check sections, narration unlocks after the response because the existing recording includes the takeaway; other sections retain their audio.
- Saved completion shows an explicit next-lesson link, or a return-to-list link for the last lesson. Existing route sibling navigation remains available. The route supplies the next published sibling without fetching its revision.
- Historical completions (including legacy equivalence) remain complete. Preview roles still cannot write progress. Failed completion can be retried without losing attempts.

This is a formative **UI progression rule**, not a new certification or anti-tampering boundary. The existing authenticated, role-scoped completion RPC is unchanged. Self-check responses are not persisted or scored; no schema migration, historical progress rewrite, assessment-bank change, or content revision is included.

## Verification

- Application suite: 50 files, 347 tests passed, including eight new completion tests. The route test additionally verifies the next-lesson URL passed to the viewer (18 navigation tests passed after that assertion).
- TypeScript and ESLint on changed implementation/test files passed.
- Chromium preview used the actual ReferenceLessons component and authored 1.1 lesson with browser-storage fixtures. Checked start/end gating, keyboard responses, hidden/revealed summary, save/continue, reload preservation, Filipino rendering and 360px layout. No browser exceptions, horizontal overflow or axe WCAG A/AA violations.
- The browser preview is not a live Supabase test. Signed-in BHW/pretest/posttest/certificate integration, actual screen-reader use and mobile-device audio still require release verification.

The older interrupted 1.2–1.5 content edits were not used: main already includes the subsequent corrections and publication record from PRs #99–#100.

## Chapter 1 narrated-story handoff (12 October 2026)

Chapter 1 learner, preview and assessor-study routes enable `storyQuestionHandoff` on the shared reader. Other chapters retain their existing flow.

- Ending a narrated story opens the first unanswered check in the current Read or Slides mode. “Continue to question” offers the same action before playback ends. Focus moves to the question after React commits the new page, including fullscreen remounts.
- After an answer and its feedback, “Next question” finds any remaining check. Once all checks are attempted, “Continue to lesson end” opens the final section if necessary. Watching never saves completion automatically.
- The existing completion controls, saved-state continuation and errors render inside the fullscreen reader. Failed completion retains answers for retry. Completed stories remain available for replay without automatic redirection.
- The three-check `resources-monitor` story unlock rule, optional video, preview restrictions, revision-scoped attempts and reload behavior remain unchanged. New controls have English, Filipino, Cebuano and Hiligaynon labels.

Verification: the six focused component/route suites pass (147 tests), along with TypeScript and lint on the changed files. `node scripts/story-question-browser-check.mjs` exercises authored single- and multiple-check lessons at desktop, mobile portrait and mobile landscape sizes, including fullscreen Read and Slides. It uses a generated short video to trigger a natural playback-ended event and simulates progress callbacks. Each journey saves once, focuses the question, exposes the next lesson, and passes checks for page errors, horizontal overflow and axe WCAG A/AA violations. This does not verify authenticated production saves or native iOS video fullscreen.
