# Reference Manual lesson completion

Implemented against main `93fa455` on 25 September 2026, addressing the remaining learner-flow items in content-assessment-2026-09.md Phase 0.

- A new completion requires being on the final section/slide and attempting every check in the selected modality. Either Read or Slides is sufficient; the first answer need not be correct.
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
