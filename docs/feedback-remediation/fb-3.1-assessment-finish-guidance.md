# FB-3.1 — clear assessment review and finish steps

The owner approved the already-live FB-2.6 clarification increment and directed
continuation. The approval is recorded separately; PR #340 was already merged
as `2407f5667cdddc4fe224a7936e790bf019bdda16`. The next actionable slice is the
Chapter 1 assessment finish flow.

## Reports and reproduced gap

- `2c0f9bdd-16ea-4544-8f1a-0b2b933001dd`: users did not understand that review
  comes before submitting.
- `1464d4db-3cf8-4d1e-8a39-3b27d67c2146`: users could not find a done action
  or tell what to do after answering everything.

Both reports were checked read-only in the live feedback system and are still
new. Current source already has numbered/color-coded navigation, saved drafts,
review and submission confirmation. At the last question, however, Next was
disabled and Review all had the same secondary styling as the other buttons.
The entry and question view did not explain the full answer → review → submit
sequence. The review screen had a number grid but no direct missing/marked
question shortcuts.

## Changed behavior

The entry screen now gives three English/Filipino finish instructions, including
after completion so pilot reviewers can inspect them without a new attempt. The
question view repeats the sequence briefly, shows a saved-response progress
bar, and separates choice, unknown, unanswered and marked counts. Counts come
from persisted responses, not an unsaved optimistic selection.

At the last question, a clear handoff explains Review all and removes the dead
Next button. Review all becomes the primary action at the end or when every
response is saved. A failed pending change cannot claim that everything is
saved, and Review remains blocked until the change is successfully saved.

The review heading receives keyboard focus. Shortcuts navigate to the first
unanswered or marked question through the existing position-save path, retaining
resume semantics and mutation receipts. A failed jump stays on review and can
be retried. When all responses are saved, the screen explains the final submit
and confirmation step. Submit is visually primary but keeps its existing guards.

Unknown responses satisfy completeness, and review marks remain optional.
Learners can still move between questions; no mandatory sequential-answering
policy is introduced. Existing answer-key visibility, assessment identities,
scores, submission confirmation and historical records are unchanged.

## Verification and release

Seven new component cases cover completed-user guide access, both languages, final-question handoff, focus,
confirmation cancellation, the four response counts, unanswered/marked shortcuts,
failed navigation and unsaved final-question changes in both incomplete and
previously complete drafts. Existing navigation/resume cases remain passing.

The actual learner components also passed the isolated Chromium journey with
WCAG checks, introduction/resume, unknown and marked responses, incomplete
review, first-missing/marked navigation, last-question handoff, confirmation
cancellation and successful pre/post submission. RPCs in this harness use only
its local browser fixture. An E2E wrapper runs this same journey in CI; it never
targets the pilot database or sends artificial pilot responses.

After normal repository checks and CI, merge and verify the exact production
commit. The PR records final test results and deployment receipt. Both BHW and
assessor Chapter 1 assessments use this component. The next pilot review should
check whether learners now find the review/submit steps without prompting.
Report closure remains separate from implementation and owner approval.
