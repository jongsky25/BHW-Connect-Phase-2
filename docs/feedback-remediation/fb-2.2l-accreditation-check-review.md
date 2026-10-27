# FB-2.2l — September pretest clarity and accreditation check

Read-only pilot review on 27 October 2026 examined two still-`new` reports. Neither has a screenshot. No Spot Feedback status or reply changed.

| Feedback ID | Original anchor | Current finding |
| --- | --- | --- |
| `e8ed36ad-f5c1-4d36-a579-178ad36621d8` | Assessor Chapter I pretest `#main`: “Some questions are confusing, it is better to make it simple concise and easy to understand.” | The message identifies no item, phrase, choice or score. It predates the enabled shared 30-item assessment. The active immutable v8 pretest has hash `fb60dc95c5b451ef93b30454015b9f90bdcb4fd658a84e842f3bafeec726222e`; earlier item-specific reviews changed several questions. No further formal item change can be tied to this report. Keep it open for an exact live example. |
| `091f2171-3087-401a-862e-e9b6ea58c214` | Assessor lesson `bhw-accreditation`, a formative-choice button labelled “Pangakong hindi kailangan ang proseso.” The reporter asks for questions that test acquired knowledge because the correct answer is too obvious. | The quoted choice belongs to the 24 September lesson revisions, not the current published revision. The current check uses Card B, a committee recommendation without a verified board decision. It immediately follows a worked Card B explanation and still has two stark distractors: automatic accreditation from a recommendation, or replacement by a certificate/title. The concern about weak discrimination persists, though no scoring/key error is established. |

The published accreditation lesson is revision `2d68608f-2912-4080-ab5e-4de2d073edc2`, content hash `16f8f729d3971969540d35f551cada4ee0d328ba35c003898812a5141d58d47f`. Its Read and Slides checks are identical, with answer index `0`. The lesson distinguishes committee support, the board's official decision and its record; its fictional cards do not establish anyone's status. The proposed change stays within that taught distinction and does not imply a local application, form, fee, deadline or approval.

## Exact check proposed for owner review

The [pinned proposal](proposals/fb-2.2l-accreditation-check.json) has SHA-256 `9abf700b63d2821d5bccb0490f147c68ca111fa740ea03409d7c45ad65c8e5ec`. Apply its complete `proposed_check` to the existing `accreditation-application-check` Read section and `slide-accreditation-application-check` Slide **only after exact wording approval**. The bilingual prompt and correct choice remain verbatim; the two incorrect choices and explanatory feedback change as follows. The answer index stays `0`.

| Choice | English | Filipino |
| --- | --- | --- |
| 0 — unchanged, correct | The recommendation is a supporting step. Ask the proper local contact whether the board has decided, where it can be verified and what comes next. | Pantulong ang rekomendasyon. Tiyakin sa tamang lokal na contact kung may pasya na ang board, saan ito makukumpirma at ano ang susunod na hakbang. |
| 1 — proposed | Record the committee recommendation as provisional accreditation while waiting for the board’s official decision. | Itala ang rekomendasyon ng komite bilang pansamantalang akreditasyon habang hinihintay ang opisyal na pasya ng board. |
| 2 — proposed | Because no board decision is attached to Card B, tell Demi the application was rejected and must be started again. | Dahil walang kalakip na pasya ng board sa Card B, sabihin kay Demi na tinanggihan ang aplikasyon at kailangan niyang magsimula muli. |

**Proposed English feedback:** First: correct. A committee recommendation is a supporting step; ask the proper local contact whether the board has made an official decision, where it can be verified and what comes next. Second: incorrect. A recommendation does not become provisional accreditation while a decision is unverified. Third: incorrect. A missing attached decision on the fictional card does not prove rejection or even establish that Demi has an application. Verify the official record and current local process first. Completing the online lesson does not grant accreditation.

**Proposed Filipino feedback:** Una: tama. Pantulong ang rekomendasyon ng komite; tiyakin sa tamang lokal na contact kung may opisyal na pasya ang board, saan ito makukumpirma at ano ang susunod na hakbang. Ikalawa: mali. Hindi nagiging pansamantalang akreditasyon ang rekomendasyon habang wala pang natiyak na pasya. Ikatlo: mali. Hindi patunay ng pagtanggi ang kawalan ng kalakip na pasya sa kathang-isip na card; hindi rin nito pinatutunayang may aplikasyon si Demi. Tiyakin muna ang opisyal na tala at kasalukuyang lokal na proseso. Hindi nagbibigay ng akreditasyon ang pagkumpleto sa online lesson.

This asks learners to reject two plausible but unsupported inferences from missing evidence. It retains the lesson's worked example, audio, teaching text, sources, formal Chapter I assessment forms, and observed practice. It does not claim a three-choice self-check alone proves applied competence.

## Publication boundary

Publishing a changed formative check requires a new immutable lesson revision. Read-only pilot counts at review time found 18 completions on the current revision and one on an older revision. Under the existing current-revision progress rule, those 18 would become historical for current progress until learners complete the successor; their rows are preserved. The active Chapter I v8 assessment pins the current accreditation revision and must remain immutable for enrolled learners; any later assessment release must account for the successor curriculum pin. Before publication, recheck completion and assessment baselines, bind the exact approved proposal and source hashes, test a guarded release in a disposable database, merge after CI, then verify production and pilot state. This review packet makes no live content or progress change.
