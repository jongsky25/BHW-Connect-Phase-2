# Feedback item 36 — accreditation check distractors

Report `091f2171-3087-401a-862e-e9b6ea58c214` asks for questions that test acquired knowledge because the correct answer is too obvious. It anchors the historical Filipino choice “Pangakong hindi kailangan ang proseso” in assessor Chapter I lesson `bhw-accreditation` (`648d2168-74dd-4451-958c-e4e5d8724a17`). A fresh live read found `new`, no screenshot and no replies.

**Disposition: fixed/resolved by the existing FB-2.2l release.** The [earlier review](fb-2.2l-accreditation-check-review.md) traced the quoted choice to September revisions and confirmed that the then-current replacement still used stark distractors. The owner approved an exact bilingual revision to those two distractors and their feedback, including the corrected progress impact. [PR #428](https://github.com/jongsky25/BHW-Connect-Phase-2/pull/428) published that revision on 27 October; the [release receipt](fb-2.2l-accreditation-check-publication.md) records its CI, disposable database tests and live transaction.

## Fresh verification

The live published revision is `09b4c564-a5ac-4fc9-ab6f-c0dc9c448afa`, content hash `07130c07f192cd24b7101130b036c8da1c52d5c1a6aadf4d36e0987a7cc290cd`. An exact structural comparison of both live `accreditation-application-check` and `slide-accreditation-application-check` checks with `proposals/fb-2.2l-accreditation-check.json` passed. The content hash matches the approval record and the correct option remains index `0`.

The current Card B check asks the learner to distinguish a committee recommendation from a verified board decision. Its incorrect choices now propose (1) recording the recommendation as provisional accreditation or (2) inferring rejection from the absent attached decision. The bilingual feedback explains why neither inference is supported. The historical quoted choice is absent from the published lesson. This directly implements the approved distractor improvement without changing the correct principle or key. It does not establish that the three-choice formative check alone proves acquired competence or that its difficulty/discrimination has been statistically validated.

The canonical production alias resolves to READY deployment `dpl_G7cUWaThHChJrm7HuP8WvrL7cssH`, app commit `e5721d5d20371fb6a84af20881aa17ff200c1449`, which includes the released loader and reader. The original release receipt verifies exact PR #428 app deployment, the successor publication and preservation of historical records. Today's read verifies the current published content and deployment provenance, not an authenticated production learner journey.

No new lesson publication is needed: the owner-approved fix is already live. No lesson, answer key, formal assessment, score, attempt, enrollment or progress record changed for this disposition. The previous instruction to retain the report for pilot comments is superseded for this ID by the owner's current per-item completion instruction and this verified release-level disposition.

## Live disposition and counts

A guarded update changed only this report from `new` to `resolved` at `2026-10-29 04:43:43.414129+00`, requiring the exact original message, no screenshot and no replies. `resolved_by` is null; no staff actor was impersonated and no reply or notification was sent.

The fresh post-update read found **214 total: 19 new, 1 in_review, 111 resolved, 83 dismissed**. **20 remain open live.** The fixed queue has **36/55 reviewed: 35 closed and 1 reviewed_open; 19 await review**. Item 34 remains `in_review` for private screenshot access; both owner-deferred reports remain `new`. All 20 open IDs are in the baseline, with **0 outside-baseline open reports**. Stop after item 36; next pending item is 37 only on the owner's next instruction.
