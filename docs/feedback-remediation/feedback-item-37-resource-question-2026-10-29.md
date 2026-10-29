# Feedback item 37 — unclear paper/session question

Report `0f36617f-9c01-46ed-a195-147b74699432` says “I cannot understand this question. This maybe rephrased, same with the tagalog version of the question.” It was filed on the assessor Chapter I pretest at `2026-09-29 03:32:40.559399+00`, selecting `fieldset:nth-of-type(38) > legend`. A fresh live read found `new`, no screenshot, no captured label and no replies.

**Disposition: fixed/resolved by the released resource-monitor question replacement.** This review recovered report-specific historical evidence beyond the earlier [FB-2.2g review](fb-2.2g-chapter1-resource-and-recording-review.md), which had only tentatively associated it with the nearby paper/session report.

## Recovered historical item

The reporter's saved assessor pretest attempt `ada4968d-4a96-4056-8521-e2a82b9ec063` started at `03:11:32.519118+00` and was submitted at `03:33:57.725041+00` on 29 September. It therefore spans the report timestamp. Its frozen snapshot has 38 questions; zero-based array position 37 is question `58bf8c51-6e85-43a2-a563-cfc48bfb8834`:

- English: “Paper use fell but so did session numbers. What should be checked?”
- Filipino: “Bumaba ang papel ngunit bumaba rin ang bilang ng sessions. Ano ang dapat suriin?”

The next pretest attempt started after the report at `07:57:10+00` and has only 14 questions. Historical source commit `9319ba2961c2126f3a158c9c4f3fa4f1d4116dd1` renders `attempt.questions` with `TestQuestionFields`; that component maps the ordered array directly to one fieldset and legend per question. The opening RPC snapshots questions in position order. The saved attempt's timing, length, frozen 38th question and captured DOM ordinal jointly identify the historical prompt; the finding does not rely solely on a nearby report's wording. No screenshot or historical browser session was available.

## Current published replacement

The active live release is `chapter1-feedback-needlestick-context-v8`; its 30-question pretest hash is `fb60dc95c5b451ef93b30454015b9f90bdcb4fd658a84e842f3bafeec726222e`, matching the reviewed source. Current pretest T30, item `a1c75b0b-afed-4cc1-8538-96f07beb5ef3`, reads:

- English: “A health station used fewer supplies this month but also served fewer people. What should the BHW do before claiming improved resource use?”
- Filipino: “Mas kaunting gamit ang nagamit ng health station ngayong buwan, ngunit mas kaunti rin ang napagsilbihan. Ano ang dapat gawin ng BHW bago sabihing bumuti ang paggamit ng mga gamit?”

This replaces the ambiguous paper/session terms with an explicit setting, supplies and people served. The [approved v6 publication](fb-2.2g-resource-monitor-publication.md), PR #381, changed the later stem to ask for the checking action supported by its retained key; that item remains in active v8. Its correct `o1` calls for comparing resource use against comparable workload and service quality. Historical snapshots, keys, pins and scores remain on their recorded versions. This addresses the identified context gap without claiming universal comprehension or validated comparability across releases.

The live `elearning`, `assessor_flow_ui` and `chapter1_assessment_v2` flags are enabled. The canonical alias resolves to READY deployment `dpl_G7cUWaThHChJrm7HuP8WvrL7cssH`, app commit `e5721d5d20371fb6a84af20881aa17ff200c1449`. These are deployed-source and database checks, not an authenticated production learner journey. No new assessment release is needed and no assessment, attempt, score, enrollment or progress record changed in this disposition.

## Live disposition and counts

A guarded update changed only this report from `new` to `resolved` at `2026-10-29 04:57:20.992866+00`, requiring its exact message and selector, no screenshot and no replies. `resolved_by` is null. No reply or notification was sent and no staff actor was impersonated.

The fresh post-update read found **214 total: 18 new, 1 in_review, 112 resolved, 83 dismissed**. **19 remain open live.** The fixed queue has **37/55 reviewed: 36 closed and 1 reviewed_open; 18 await review**. Item 34 remains `in_review` for private screenshot access; both owner-deferred reports remain `new`. All 19 open IDs belong to the baseline, with **0 outside-baseline open reports**. Stop after item 37; next pending item is 38 only on the owner's next instruction.
