# FB-2.2k — late September Chapter I pretest scenarios

Read-only pilot review on 27 October 2026 checked four `new` assessor pretest reports from 29 September. They have no screenshots. Their fieldset selectors identify positions in the historical 40-item `course_test_questions_current` bank, before the shared Chapter I assessment was introduced. The `chapter1_assessment_v2` flag is enabled; the active immutable `chapter1-feedback-communication-clarify-v7` pretest has 30 items, form hash `c3f51074c76be424d65540acdd944dc84c9c042dd2ae78f3beab3e7a4c9a16e4`, and release hash `5658f71c8a502a3110f91b0080b28cdb245a55ab9e1ddc586242a4bf835c3142`.

| Feedback | Historical anchor and merit | Active-form finding |
| --- | --- | --- |
| `f343f0a5-3e20-4847-9582-3e9ae47b0d61` | Fieldset 31 is legacy position 30, ID `361cacb6-0353-40b4-a818-fc7e479d3e02`: “There is no proper sharps container for a planned task. What should happen?” It already has a short situation. The request for scenarios before questions is a reasonable general preference, but does not identify missing facts in this item. | Active pretest T25 instead gives a BHW with gloves and an avoidable splash hazard, then asks for a safer plan. It contains a situation and does not serve the old sharps-container question. No new content is supported by this anchor. |
| `d67c359c-2369-4c68-9502-1622d0069533` | Fieldset 32 is legacy position 31, ID `9e2b71b5-0311-415b-8ff7-7a41738d6cae`: “After a needlestick, what is needed even without symptoms?” The suggestion “After a needlestick **injury**” makes the event clearer. | Active pretest T27 still asks generically about a “possible work-related exposure” with no symptoms. Its mapped `safety-demonstrate` lesson explicitly teaches response to an actual needlestick, including immediate local action, reporting and medical evaluation. A concrete injury stem would better identify the tested event without changing the key or broadening medical advice. Propose exact copy below. |
| `e8dca81a-6e21-4311-bae7-353c56883a2d` | Fieldset 37 is legacy position 36, ID `c5a14a40-d855-4979-b798-59efdff1b86f`: “A new checklist has nobody assigned to follow it. What is missing?” The report requests a more understandable or relatable situation but gives no preferred phrase or missing fact. | Neither active pretest nor posttest has that checklist stem. There is no current item to safely rewrite from this report alone. Keep open for an exact live example. |
| `a7a4fde8-b87f-4375-85dd-dde91f2caafd` | Fieldset 38 is legacy position 37, ID `58bf8c51-6e85-43a2-a563-cfc48bfb8834`: “Paper use fell but so did session numbers. What should be checked?” It does not explain the paper or sessions. This supports the historical context concern also reviewed in [FB-2.2g](fb-2.2g-chapter1-resource-and-recording-review.md). | Active pretest T30 now names a health station, fewer supplies and fewer people served, and asks what to check before claiming improvement. Its exact bilingual stem was released in v6 and remains in v7. No additional T30 change is warranted. |

The currently published `safety-demonstrate` revision `e49db378-2531-4995-b4c8-c76d9a81ebec`, hash `840e76b360589850e5ac2050f26abba66bc69cb571b407f9afc9e026c7c999fb`, contains the needlestick example. The T27 blueprint target is to recognize immediate reporting/evaluation and avoid delays after a simulated exposure. The observed practical demonstration remains separate from this formal question.

## Exact T27 stem proposed for review

Replace only the active **pretest T27** stem:

> **Current English:** A BHW has a possible work-related exposure but no symptoms. What is the prompt response?
>
> **Proposed English:** After a needlestick injury from a used needle at the health station, a BHW has no symptoms. What should the BHW do immediately?
>
> **Current Filipino:** May posibleng exposure ang BHW sa trabaho ngunit walang sintomas. Ano ang agarang tugon?
>
> **Proposed Filipino:** Pagkatapos matusok ng ginamit na karayom sa health station, wala pang sintomas ang BHW. Ano ang dapat niyang gawin agad?

Keep all three choice labels and order, `o1` correct answer, distractor rationales, correct rationale, safety source, reviewer requirement and target unchanged. The current correct choice is “Follow the immediate local response, report promptly, and seek the required evaluation.” / “Sundin ang agarang lokal na hakbang, mag-ulat kaagad, at magpatingin para sa kinakailangang pagsusuri.” The other choices wait for symptoms or completed forms; those remain wrong for the specified incident. The published lesson supplies the specific immediate response, while the formal item's action stays scoped to the local process and medical evaluation.

The [pinned proposal](proposals/fb-2.2k-needlestick-context.json) identifies the active v7 release/hash and T27 item and reserves a new immutable item ID for a possible v8 release. The current item requires safety/privacy review, so the new stem needs exact owner review before publication. If approved, change only one of 60 form items for **new enrollments**; keep the other 59 form items, 48 checkpoints, 42 curriculum pins, keys, all prior releases and historical answers/scores unchanged. All 23 current Chapter I enrollments are still pinned to v1. Do not claim cross-release score comparability. This packet changes no live assessment copy, feedback status or reply. Keep all four original reports open for authenticated pilot comments.
