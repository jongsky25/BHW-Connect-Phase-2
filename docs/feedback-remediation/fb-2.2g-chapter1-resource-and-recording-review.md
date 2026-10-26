# FB-2.2g — Chapter I pretest wording review

Reviewed 26 October 2026 against five original pilot reports and the live Chapter I question banks. None has a screenshot. The live `chapter1_assessment_v2` flag is enabled for BHW and assessor roles with no disabled roles. The active shared release is `chapter1-feedback-stock-count-v5`, content hash `c8fcfee9dab193d4421fea7653fb9556b0394bed60b21897075791842442d6da`, matching the checked-in release. The older `course_test_questions` rows remain for historical evidence, but the enabled Chapter I route serves the shared assessment instead.

| Feedback ID | Historical item and current finding |
| --- | --- |
| `1dbf62f3-7d0b-4355-9ea9-0bb315ec3777` | Quotes “A resident says they attended but has no card. How should this be recorded?” and asks what card. Legacy position 22 is indeed incomplete. Current pretest T04 instead identifies a nurse, households taught, a registry entry and an unconfirmed date; no unspecified card appears. |
| `6faf23a0-0dd4-45ad-ac60-8a986ce98e86` | Asks what the resident attended, ten minutes after the first report on the same route. It does not quote an item, so pairing with position 22 is plausible but not certain. Current posttest T04 names a health-station session and an undated attendance entry. |
| `c537279a-bdc3-4d51-a7df-6b6b17eaa79a` | Quotes both languages of legacy position 37: “Paper use fell but so did session numbers. What should be checked?” It does not say what paper or sessions mean. |
| `0f36617f-9c01-46ed-a195-147b74699432` | Reports an unclear question in both languages ten seconds later on the same pretest page, without quoting it. It may refer to position 37, but the report alone does not establish that identity. |
| `428a414b-d259-436c-92d5-d55bf97c9436` | Asks what paper and sessions mean, one minute after the quoted report. This supports the same historical position 37 ambiguity. |

Legacy position 37 remains stored, as do its original key and historical attempts. The active v5 pretest T30 replaces that generic paper wording with a health-station situation: fewer supplies **and** fewer people served. Its paired posttest T30 asks about a resource change and uncertain follow-up quality. The published `resources-monitor` lesson discusses wrong-version reprints, comparable page denominators, session counts and service quality; it warns that lower totals alone do not prove improvement. The current items therefore address the historical missing context without reusing its wording.

There is one remaining current mismatch. V5 pretest T30 asks **“What can the BHW conclude?”**, while its keyed `o1` answer is an action: **“Compare use with comparable workload and service quality before claiming an improvement.”** The Filipino stem asks **“Ano ang maaaring ipasiya ng BHW?”**, while its keyed choice begins **“Ihambing ang paggamit…”**. The lesson and key support checking before drawing a conclusion, so the stem should ask for that action. No evidence here supports changing the key, options or posttest.

## Exact proposed pretest T30 copy

Current stem:

> **English:** A health station used fewer supplies this month but also served fewer people. What can the BHW conclude?
>
> **Filipino:** Mas kaunting gamit ang nagamit ng health station ngayong buwan ngunit mas kaunti rin ang napagsilbihan. Ano ang maaaring ipasiya ng BHW?

Proposed stem:

> **English:** A health station used fewer supplies this month but also served fewer people. What should the BHW do before claiming improved resource use?
>
> **Filipino:** Mas kaunting gamit ang nagamit ng health station ngayong buwan, ngunit mas kaunti rin ang napagsilbihan. Ano ang dapat gawin ng BHW bago sabihing bumuti ang paggamit ng mga gamit?

All three v5 choices, order and explanations would remain verbatim:

| Choice | English | Filipino |
| --- | --- | --- |
| `o3` | Ignore the possibility that reduced resources affected essential service. | Balewalain ang posibilidad na naapektuhan ng nabawasang rekurso ang mahalagang serbisyo. |
| **`o1` (correct)** | Compare use with comparable workload and service quality before claiming an improvement. | Ihambing ang paggamit sa maihahambing na dami ng gawain at kalidad ng serbisyo bago sabihing may pagbuti. |
| `o2` | Call lower total use proof of better efficiency by itself. | Ituring ang mas mababang kabuuang gamit bilang patunay ng mas mahusay na paggamit. |

The existing rationale also stays verbatim: “Resource results require comparable workload and a check that service was not harmed.” / “Kailangan sa pagsusuri ng rekurso ang maihahambing na gawain at pagtiyak na hindi napinsala ang serbisyo.”

[`proposal.json`](proposals/fb-2.2g-resource-monitor.json) pins the active v5 hash, current item ID, proposed new ID and both exact stems. If approved, publish as a new immutable v6 item for **new enrollments only**. Keep the other 59 form items, 48 checkpoint items, 42 curriculum pins, option IDs, correct key, rationales, legacy bank and existing scores unchanged. Existing enrollments and drafts finish on their pinned release. Do not claim score comparability across releases. No live assessment, feedback status or reply is changed by this review packet. The five reports remain open for authenticated pilot review.
