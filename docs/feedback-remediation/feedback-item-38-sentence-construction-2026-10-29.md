# Feedback item 38 — primary-care question construction

Report `152c3c49-7c37-4aea-8057-9cf0a6bf4b70` says “Please check the sentence construction.” It was submitted on the assessor Chapter I pretest at `2026-09-29 03:08:23.089719+00`, selecting the first choice of fieldset 6 and capturing “The city or municipal health officer.” A fresh live read found `new`, no screenshot and no replies.

**Disposition: fixed/resolved by the existing shared Chapter I question replacement.** The selected answer is a grammatical noun phrase, but the same item's historical stem has the construction problem identified in [FB-2.2j](fb-2.2j-legacy-pretest-context-review.md). It is no longer in the active pretest. No evidence supports changing a current key or rewriting an unidentified additional phrase.

## Report-specific historical verification

The reporter's saved pretest attempt `39168dbd-172a-4737-8a09-911391301cca` started on 29 September at `03:04:05.922994+00` and was submitted at `03:53:32.284877+00`, spanning the report. Its frozen 38-question snapshot contains item `64b1bf1a-732a-4d9d-9913-83ea000347fb` at zero-based position 5. Its first option exactly matches the captured label. The English stem asks “As part of the primary care team, who is usually the first contact a health need in the community meets?” The Filipino counterpart also makes the health need the entity meeting someone. The wording obscures the intended person/service relationship.

Historical source commit `9319ba2961c2126f3a158c9c4f3fa4f1d4116dd1` maps the stored ordered questions to fieldsets and their options to labels in array order through `TestQuestionFields`. Timing, snapshot position and exact label therefore corroborate the report's item context. A later 14-question attempt started at `13:42:51+00`, after the report. No screenshot or historical authenticated screen was observed, and the report does not specify whether the author intended only the choice or the entire question.

## Current published evidence

The active live release is `chapter1-feedback-needlestick-context-v8`. Its 30-item pretest has hash `fb60dc95c5b451ef93b30454015b9f90bdcb4fd658a84e842f3bafeec726222e`. An exact structural comparison confirms live T06 (`9315efa0-794e-48df-ac72-324e5f7d9caa`) and the form hash match the reviewed source release.

Current T06 says “A resident needs a service outside the BHW’s knowledge of the local clinic schedule. What should happen first?” / “Kailangan ng residente ng serbisyong hindi alam ng BHW ang iskedyul sa lokal na klinika. Ano ang unang gagawin?” Its choices ask about verifying the current clinic/referral process, deciding from an old schedule, or promising acceptance/coverage without checking. Neither the old sentence nor the city/municipal-health-officer choice remains. The keyed `o1` calls for checking with the responsible health worker and explaining a verified next step. This is a contextual replacement of the identified historical wording; it does not claim every current sentence is optimal or that assessment comparability is validated.

Live `elearning`, `assessor_flow_ui` and `chapter1_assessment_v2` flags are enabled. The canonical alias resolves to READY deployment `dpl_G7cUWaThHChJrm7HuP8WvrL7cssH` at app commit `e5721d5d20371fb6a84af20881aa17ff200c1449`. This establishes deployed code provenance and live content, not an authenticated production learner journey. The earlier review-only instruction to retain this report for examples is superseded by the owner's current fix-or-decline instruction and this report-specific disposition.

No new learner release is needed. No question, key, historical attempt, score, enrollment pin or progress record changed for this disposition.

## Live disposition and counts

A guarded update changed only this report from `new` to `resolved` at `2026-10-29 05:01:35.521438+00`, requiring the exact message and captured label, no screenshot and no replies. `resolved_by` is null; no staff actor was impersonated and no reply or notification was sent.

The fresh post-update read found **214 total: 17 new, 1 in_review, 113 resolved, 83 dismissed**. **18 remain open live.** The fixed queue has **38/55 reviewed: 37 closed and 1 reviewed_open; 17 await review**. Item 34 remains `in_review` for private screenshot access; both owner-deferred reports remain `new`. All 18 open IDs belong to the baseline, with **0 outside-baseline open reports**. Stop after item 38; next pending item is 39 only on the owner's next instruction.
