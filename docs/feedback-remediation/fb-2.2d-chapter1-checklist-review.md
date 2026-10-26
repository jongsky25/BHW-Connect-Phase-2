# FB-2.2d — Chapter I checklist feedback and current stock question

Reviewed 26 October 2026 against the six original pilot reports, the live assessment flags and forms, and the published Chapter I resource-audit lesson. All six reports came from the assessor Chapter I diagnostic pretest; none has a screenshot. They identify the same legacy item at course-test position 36: “A new checklist has nobody assigned to follow it. What is missing?” Its Filipino correct option says “Napagkasunduang owner, kapalit at review date.” The item does not name the checklist or explain “owner,” “replacement” and the review date. The complaints have merit for that historical item.

| Feedback ID | Report-specific evidence |
| --- | --- |
| `9c7f6b4e-2740-4950-a232-5767569841fc` | Quotes the unclear Filipino correct option. |
| `cd728cf7-8d3c-4319-bb19-fad6f8ffe6d5` | Asks which checklist the stem means. |
| `ce82730e-50f3-4882-8905-c6ca08e8da06` | Calls the item confusing and selects its “smaller font” distractor. |
| `6d64fda8-449c-49ac-b293-a8d90923fee0` | Says the checklist description is incomplete and selects the “more copies” distractor. |
| `4cdaf441-227a-4dc1-87ca-6d6e1a8a035a` | Requests clearer grammar and selects that same distractor. |
| `cbcbb541-d7ac-41f3-8fed-06ca838ccb11` | Requests more context and quotes the Filipino correct option. |

The legacy `course_test_questions` row remains stored with its original key for historical attempts. The live `chapter1_assessment_v2` flag is enabled for both BHW and assessor roles, with no disabled roles. The assessor Chapter I exam route uses the shared assessment while this flag is on. The active shared release is `chapter1-feedback-gifts-lactation-v4`, with live content hash `8dd4439dbb737ad5c0b0b0436c9d37695a8b57728a773870c6cad32f5593ba77` matching the checked-in artifact. Its pretest and posttest forms contain neither the checklist stem nor its quoted option. Their resource section uses scenario-specific stock, safety and service-quality questions at T28–T30. These six old comments therefore do not justify rewriting a key or adding the old checklist item to the current form. Keep the reports open for pilot confirmation; no feedback status or reply was changed.

## Separate current question found during review

The active **pretest T28** asks, in English, “A stock list shows ten teaching leaflets, but some copies cannot be found and others are outdated. What is the usable count?” The Filipino stem similarly asks for the count. No number of missing or outdated copies is given, and all three choices are actions, not counts. Its stored answer `o1` is the supported action: reconcile the register with physically available, current and usable stock. The [published resource-audit lesson](../../content/training/day1-basic-competencies/modules/09-sustainable-practices/lessons/resources-audit/read.en.md) likewise teaches verification before counting or ordering. The current posttest T28 already asks for an action and needs no change.

Proposed **pretest T28 stem only**, for editorial approval:

> **English:** A stock list shows ten teaching leaflets, but some copies cannot be found and others are outdated. What should the BHW do before deciding how many usable copies remain?
>
> **Filipino:** Sampung leaflet ang nasa stock list, ngunit may hindi makita at may luma na. Ano ang dapat gawin ng BHW bago magpasya kung ilan ang magagamit?

Retain all three current bilingual options, their order, the `o1` correct-option ID, rationales and T28 lesson source. This asks the process the choices actually test; it does not imply a count can be calculated from missing facts. If approved, issue a new item identity and an immutable successor release for **new enrollments only**. Existing enrolled learners keep their pinned release in both phases; open drafts, submitted snapshots, answer keys and scores remain intact. Do not publish by editing the active form in place. No new assessment release or live change is made in this review packet.
