# FB-2.2h — Chapter I communication pretest review

Reviewed 26 October 2026 against four original pilot reports, the live legacy bank, the active shared Chapter I v6 form and the currently published `communication-listen` and `communication-clarify` lessons. None of the four reports has a screenshot. The live shared release `chapter1-feedback-resource-monitor-v6` is active with content hash `493c7513d2fe99ac9071977e3af1bfcdd477cf143cb389eda46064aaed2aa645`; its pretest form hash is `7bd5bb315e851c4f03dc0adb9934b5982d629ff17ddd7a0737184dd4f9b11c25`. The published communication lesson revisions match the v6 curriculum pins. With `chapter1_assessment_v2` enabled, the old `course_test_questions` rows are historical rather than the questions served by the assessor Chapter I pretest route.

| Feedback ID | Report-specific finding |
| --- | --- |
| `b4ebb377-eabe-489d-89c4-58f458241532` | Quotes “a resident is quiet beside a neighbor.” Legacy position 20 gives little context and only asks about a private place. Current pretest T17 says a neighbor stands beside a quiet resident **during an interview** and asks the BHW to check whom the resident wants present and whether a private place would help. The currently published listening lesson supports permission and resident choice. No new T17 change is warranted from this report. |
| `c2c8d41f-b9b4-4581-8307-27c4c256e79d` | Quotes the legacy position 21 correct choice “What got in the way of attending?” and requests a more conversational BHW question. The active form no longer serves that item. Its pretest T18 tests neutral clarification of a resident’s “too late” remark, but asks “What should be asked?” while the keyed choice only says to ask a neutral question. That current choice does not model words the BHW could use. The published `communication-clarify` lesson gives short, neutral “What do you mean by …?” questions and says to listen without assuming a cause. A concrete bilingual choice is proposed below. |
| `15469fc4-9de1-4230-8ef8-4d8deddc62a9` | Points to “Discard the whole interview,” a deliberately poor distractor in legacy position 22 and asks for a proper scenario. The enabled v6 form contains no such option. Current pretest T04 identifies a nurse, teaching to households, an undated registry entry and the record action being tested; its distractors concern plausible but unsupported counting. No change to the legacy key or current T04 is warranted. |
| `e769dd5b-f6ae-4ec2-b161-5d98d7dca0af` | Says some answers seem too obvious, but gives no question identity or screenshot. Several current communication distractors are plainly unsafe, so the report has a reasonable assessment-quality concern. There are no v6 learner responses yet: all 23 existing Chapter I enrollments remain pinned to v1. Do not infer a particular key error or weaken safety choices from this nonspecific report. Keep it open for item-level pilot review. |

## Exact proposed pretest T18 choice

The current stem stays verbatim:

> **English:** A resident says the visit was “too late,” but the BHW does not know whether this means time or date. What should be asked?
>
> **Filipino:** Sinabi ng residente na “huli na” ang pagbisita, ngunit hindi alam ng BHW kung oras o petsa ang tinutukoy. Ano ang itatanong?

Replace only the label of the correct `o1` choice:

> **Current English:** Ask a neutral question about the specific point that is unclear and listen to the answer.
>
> **Proposed English:** Ask the resident, ‘What do you mean by “too late”?’ and listen to the answer.
>
> **Current Filipino:** Magtanong nang walang ipinapalagay tungkol sa partikular na hindi malinaw at pakinggan ang sagot.
>
> **Proposed Filipino:** Itanong sa residente, ‘Ano po ang ibig ninyong sabihin sa “huli na”?’ at pakinggan ang sagot.

The stem, option order and IDs, distractors, `o1` key, explanations, source and lesson target stay unchanged. The other two choices remain “Guess the cause and record it as the resident’s answer” / “Hulaan ang dahilan at itala iyon bilang sagot ng residente” and “Ask why the resident ignored the instructions” / “Itanong kung bakit binale-wala ng residente ang tagubilin.” The unchanged correct rationale is “Clarification checks an ambiguity without putting an unverified cause into the question” / “Nililinaw ang hindi tiyak nang hindi ipinapasok sa tanong ang hindi beripikadong dahilan.”

The [pinned proposal](proposals/fb-2.2h-communication-clarify.json) specifies v6’s hash, the current T18 item ID, proposed new item ID and exact replacement labels. If approved, publish one new immutable pretest item in v7 for **new enrollments only**. Existing enrollments and attempts stay pinned; all other 59 form items, 48 checkpoint items, 42 curriculum pins, posttest items, scoring keys and legacy rows remain unchanged. Do not claim cross-release score comparability. This review packet does not change live assessment copy, feedback status or replies. All four original reports remain open for authenticated pilot review.
