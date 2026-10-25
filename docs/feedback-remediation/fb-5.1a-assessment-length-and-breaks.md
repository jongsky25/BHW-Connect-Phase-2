# FB-5.1a — test length, overlap and optional breaks

The owner requested review of test-length feedback, question repetition and
progress guidance, followed by fixes with merit. Training owner remains Ray
Justin Ventura. This increment makes the current assessment easier to plan and
pause. It does not reduce the scored form or claim that 30 is an optimal length.
No feedback replies/status changes or user notifications.

## Reports and current evidence

Read-only pilot feedback and release checks on 25 October 2026 establish:

| Report | Concern and disposition |
| --- | --- |
| `12db9973-d584-4d1f-a278-4905ac4a8857` | Reports 42 questions in one sitting, no autosave, and insufficient context. Current shared assessment has 30 scenario-based items with saved drafts. Earlier resume fixes remain. Workload/pacing concern has merit; the exact historical 42-item attempt was not reconstructed. |
| `bce737d6-7d26-488f-aa0e-e351232f5774` | Too many/confusing questions and missing question numbers. Current form has visible numbering, saved progress and review; contextual concerns retain their separate review. New pacing guidance addresses workload planning. |
| `c0f4415f-25a6-41a7-830e-8102995fc081` | Too many questions, small text and mother-tongue access. FB-3.3f and FB-4.3 delivered readability/language availability; this slice addresses pacing. Formal additional-language assessment content remains unavailable. |
| `ecf63538-a9d4-450c-bd51-cb7831d5cdbf` | Test too long, reported on /feedback with no exact attempt identity. Current Chapter 1 pacing improvement is relevant, but does not establish resolution of every possible reported test. |
| `a1ba1b07-4322-4a66-9537-e3ac8555c6c2` | Internet access and competing responsibilities. Saved-draft break guidance helps scheduling; it is not an offline assessment feature or proof of the original connectivity issue. |
| `b7900504-80c4-48a6-943d-0e3beee64f7a` | Too many lessons. This is a curriculum-length concern, not evidence to delete exam questions. Keep separate. |

The other seven FB-5.1 assignments concern locks, mandatory answering, access,
facilitated learning or deadlines/refresher courses. They remain separate policy
requests. This increment adds no lock, deadline, timer or mandatory interaction.

[Read-only audit evidence](fb-5.1a-test-length-audit.json) records enabled shared
Chapter 1 flags, the active v4 hashes and all older enrollment-pinned forms.
Every stored form has 30 items. The 23 existing enrollments remain pinned to v1;
no enrollment was assigned to the active v4 at inspection. Neither assignment
counts nor draft status establish completion burden or fatigue causation.

Both live v4 hashes exactly match the approved local source. Each form has 30
unique item IDs and all T01–T30 coverage slots. Normalized complete stem equality
(case/punctuation/spacing insensitive) finds no duplicate in either language
within or between pre/post forms. This does not prove psychometric independence.
The highest within-form word overlap pairs were reviewed against their blueprint:
hazard control versus prompt exposure response; priority ranking versus resource
outcome review; referral-process verification versus authorizing a proposed
change. These are distinct decisions, not accidental repeated questions.

Stems plus every displayed alternative total 1,657 English / 1,817 Filipino words
in pretest and 1,631 / 1,811 in posttest. Reading load and field duties make the
fatigue concern plausible even without duplicate questions. Counts exclude UI
and explanations. They are not reading-time estimates. The blueprint explicitly
calls 30 a pilot constraint rather than a validated optimum; form comparability
is still unvalidated. Current evidence does not justify an arbitrary additional
cut or a claim that the issue is fully resolved. A shorter form would require
coverage selection, bilingual/content review and its own versioned release,
without changing in-progress or historical attempts.

## Confirmed pacing gap and delivered behavior

The approved assessment plan specifies three ten-question sections, optional
section breaks and untimed delivery. Existing screens showed section numbers
and a global saved-response count, but entry did not state the length and there
was no section-end pause guidance.

Entry/overview/recap now explain 30 questions in three sets of ten, no countdown,
and how Saved → Save and leave → Resume works. The guide remains available for
completed pilot reviewers. At questions 10 and 20 an optional pause panel shows
only persisted response counts for that set and links back to the chapter.
Next still continues normally; learners can leave after any question. Skipped
questions and unknown responses keep their existing semantics.

The pause link and existing Save and leave link share the same guard. While a
save is in flight or a change is unsaved, both block navigation and explain
retry/wait. Pausing adds no save/submission RPC and retains the existing saved
question; resume reopens that question with its responses. The panel does not
claim a set is complete from reaching its last question. No answers, keys or
instructional hints appear between baseline sections.

No question, choice, item count, order, score, threshold, completion gate,
release/enrollment pin, attempt snapshot, lesson/media byte or database schema
changes. No pilot write tests. Original feedback remains open for live comments.

## Verification and release boundary

Thirteen new component cases cover both languages, both pause points,
non-boundaries, persisted unknown/marked answers, pause/remount/resume, unchanged
Next payloads, no automatic save/submit, and blocked leaving during an in-flight
or failed save followed by retry recovery. Existing finish/resume cases pass.

The actual browser assessment journey pauses and resumes at both boundaries,
retains saved choices and still completes pretest/posttest review and submission.
The 32-case actual-component/CSS phone regression checks both new pause panels
in both languages/forms/themes at 320/390px default/XL, including link height and
no horizontal overflow. English/light and Filipino/dark XL entry/pause screenshots
were visually inspected. These browser checks use isolated RPC fixtures; existing
CI retains disposable-database assessment/save/settings journeys. Authenticated
production interaction is unavailable. Full CI and exact merged production
readiness/alias plus fresh read-only form bindings are recorded in the PR.
