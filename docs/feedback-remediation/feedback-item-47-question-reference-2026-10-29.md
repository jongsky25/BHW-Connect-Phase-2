# Feedback item 47 — unidentified pretest question

Report `e852b163-e87b-473c-b220-da792d1168ef` says “Medjo magulo po ang question..hehehe ano po yung specific question?” It was submitted on the assessor Chapter I pretest at `2026-10-13 01:58:23.692852+00`, selecting `#main > main > section > h1`. A fresh live read found `new`, no captured heading text, no screenshot and no replies.

**Disposition: will_not_fix for an unidentified additional question rewrite.** The report supplies neither wording nor an ordinal, choice or requested replacement. Its generic heading selector does not identify a member of the stored form. Preserve the reviewed current questions and historical evidence rather than attribute the comment to an arbitrary item or change a key. This declines a speculative edit; it does not claim the reporter's confusion was reproduced or fixed.

## Historical evidence and limits

The reporter's shared pretest attempt `16532a2d-ef7d-45d8-8729-3019c0e04261` is pinned to `chapter1-2026-10-11-v1`. It started at `2026-10-13 01:35:06.804833+00` and was submitted at `02:17:55.145123+00`, spanning the report. The legacy assessor summary's 30-question pretest record at `02:17:55+00` corresponds to completion of the shared attempt; an earlier 38-question pretest was submitted on 12 October. These records identify the historical form, but not the question visible at the feedback timestamp.

The [earlier review](fb-2.2i-chapter1-transfer-check-review.md) described the h1 anchor as the page heading. This review does not rely on that interpretation: the shared reader can also render a focused question as an h1. With no text or question index captured, that tag alone cannot determine the intended stem. The currently persisted position after submission would not establish the position at the earlier report timestamp. No historical browser session or screenshot was observed.

## Current release and question identification

The live active release is `chapter1-feedback-needlestick-context-v8`, with 30 pretest items and stored form hash `fb60dc95c5b451ef93b30454015b9f90bdcb4fd658a84e842f3bafeec726222e`, matching the reviewed source form hash. The live `elearning`, `assessor_flow_ui` and `chapter1_assessment_v2` flags are enabled. The reporter's v1 pin is distinct from this release for new enrollments.

The deployed `chapter1-assessment.tsx` reader shows the section and “Question … of 30,” prefixes the focused stem with its number, includes that number in its accessible heading, and provides numbered jump controls plus Review all. This supports identifying a current question without rewriting its content. It does not establish which historical question the reporter meant or prove a particular wording defect was addressed. No report-specific scored item or key edit is supported.

The canonical alias resolves to READY deployment `dpl_7cAXHZNauogNZJ51zgAhQgppFm4F`, app commit `32359ba9f1e2ac2a805209e26f9cb3d51ee6bab3`. These are deployed-source and live database checks, not an authenticated production learner journey. No new learner publication is needed and no question, key, attempt, snapshot, score, enrollment pin or progress record changed. The current fix-or-decline instruction supersedes the prior review-only request to keep this ID open indefinitely for an item-specific example.

## Live disposition and counts

A guarded update changed only this report from `new` to `dismissed` at `2026-10-29 08:45:27.233276+00`, requiring its exact message and selector, no screenshot and no replies. `resolved_by` is null; no staff actor was impersonated and no reply or notification was sent.

The fresh post-update read found **214 total: 8 new, 1 in_review, 117 resolved, 88 dismissed**. **9 remain open live.** The fixed queue has **47/55 reviewed: 46 closed and 1 reviewed_open; 8 await review**. Item 34 remains `in_review` for private screenshot access; both owner-deferred reports remain `new`. All 9 open IDs belong to the baseline, with **0 outside-baseline open reports**. Stop after item 47; next pending item is 48 only on the owner's next instruction.
