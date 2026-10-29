# Feedback item 52 — unidentified next-lesson blocker

Report `9cd61e10-9b97-4941-bf57-241a4d0fde22` says “Cannot proceed to next lesson..”. It was submitted at `2026-09-29 06:43:49.225137+00` on `/feedback`, selecting `#main > div > div:nth-of-type(2) > p`. A fresh live read found `new`, no captured label, no screenshot and no replies. It identifies no lesson, destination, failed control, error or prerequisite state.

**Disposition: will_not_fix for an additional speculative navigation or progression change.** Report-specific historical records and logs do not establish a failed API request or identify the blocked browser action. Current code includes the released cross-subchapter navigation fix and save-error handling. Changing prerequisites, forcing completion, rewriting progress or adding another guessed navigation behavior would not be supported by this report. This is an explicit decline of an unidentified additional change, not a claim that the historical symptom was reproduced, disproved or fixed by the current release.

## Historical evidence recovered

The reporter is an active assessor. Read-only inspection found 49 saved lesson completions, 39 at or before the report. The nearest saved completion before submission is `safety-demonstrate` at `06:39:04.751621+00`; subsequent saves include `resources-audit` at `06:48:26.425658+00`, `resources-safe-change` at `06:49:22.337918+00` and `resources-monitor` at `06:50:24.329729+00`. Resume records corroborate study activity across those lessons. They show later progress, not which control failed or how the reporter continued. Current published revisions differ from the old Chapter I resume revisions; this does not establish a revision mismatch at the time of the report.

No audit event for this actor appears in the 30 minutes before or after submission. The nearby report context supplies only this `/feedback` report and the candidate duplicate submitted about nine seconds later. Preserve that relationship: **item 53, `b1e43e76-1ba8-422a-a86a-6682b4f23b11`, remains untouched and `new`**. It is not closed as a duplicate by this disposition.

Historical Supabase logs are available. After mapping the app user to its authentication subject, a bounded query for `2026-09-29T06:33:49Z`–`06:53:49Z` found only successful recorded edge API statuses for this reporter: 13 completion RPC requests and 25 resume RPC requests returned 204; lesson/revision/progress reads returned 200; the two feedback inserts returned 201. No recorded non-success API status appears in that actor-filtered window. This does not capture every browser interaction, missing link, client exception or network request that never reached the server. No cause can safely be attributed from those successes.

## Current release verification

The canonical alias resolves to READY deployment `dpl_7cAXHZNauogNZJ51zgAhQgppFm4F`, app commit `32359ba9f1e2ac2a805209e26f9cb3d51ee6bab3`. Live `elearning` and `assessor_flow_ui` flags are enabled with no disabled roles. The deployed commit contains both [PR #330](https://github.com/jongsky25/BHW-Connect-Phase-2/pull/330), which fixed continuation across subchapters, and [PR #372](https://github.com/jongsky25/BHW-Connect-Phase-2/pull/372), which added the [real-route regression journeys](fb-1.2c-lesson-navigation-verification.md).

The current assessor route chooses the next lesson from the chapter-wide published study entries; the BHW route likewise uses chapter-wide ordered non-quiz lessons. `ManualLesson` propagates completion RPC errors, and `ReferenceLessons` updates its completed state only after the save succeeds. Both routes, the completion wrapper, reader and study-selection helper are unchanged between the deployed commit and this review's source. Existing regression coverage includes save failure/retry, same-module and cross-subchapter continuation for both roles and languages. That historical CI coverage is not a newly run test or an authenticated production walkthrough.

No new application or learner-content publication is needed. No progress, resume, prerequisite, historical snapshot, assessment, score, qualification or certificate changed. Security/performance advisors were read as diagnostic context; their project-wide notices do not identify this reporter's failed action, and no policy or schema change is inferred. The current fix-or-decline instruction supersedes the older review-only direction to retain this report indefinitely for unspecified live comments.

## Live disposition and counts

A guarded update changed only this report from `new` to `dismissed` at `2026-10-29 10:53:57.883348+00`, requiring the exact message, route and selector, no screenshot and no replies. `resolved_by` is null; no staff actor was impersonated and no reply or notification was sent.

The fresh post-update read found **214 total: 3 new, 1 in_review, 117 resolved, 93 dismissed**. **4 reports remain open live.** The baseline queue has **52/55 reviewed: 51 closed and 1 reviewed_open; 3 await review**. Both owner-deferred reports remain `new`; item 34 remains `in_review` for private screenshot access. All four open IDs are in the baseline, with **0 outside-baseline open reports**. Stop after item 52; item 53 is next only on “next” or “do it.”
