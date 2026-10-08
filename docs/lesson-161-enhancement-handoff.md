# Lesson 1.6.1 enhancement handoff

Prepared 8 October 2026 for the next implementation session. Repository baseline:
`1b090f4859b8362c016f8331428ccb202c2c54e4` on `main`, which includes the approved lesson 1.5.5 changes in
[PR #263](https://github.com/jongsky25/BHW-Connect-Phase-2/pull/263) and the live
release of lesson 1.5.6 in [PR #262](https://github.com/jongsky25/BHW-Connect-Phase-2/pull/262).

Enhance **Makinig nang may respeto / Listen with respect** into an illustrated,
bilingual lesson that demonstrates respectful listening through Mila and Liza’s
household conversation. Prepare a complete draft and review package. This handoff
does not authorize implementation, publication, or reuse of the approval for 1.5.6;
the next implementation request authorizes development, and this lesson’s final
package requires its own release approval.

## Current lesson and fixed identities

The target is
`content/training/day1-basic-competencies/modules/06-komunikasyon/lessons/communication-listen/`.
It currently has five equivalent Read positions and five Slides positions, ten
Gemini narration tracks, one scenario check, one observation indicator, complete
bilingual facilitator guides, and no lesson assets or featured story video.
Slides currently have no explicit `narration_fil` / `narration_en` fields.

| Preserve | Current value |
|---|---|
| Module key and UUID | `06-komunikasyon` · `2f01456b-2a39-438e-993b-65482e7ca9bc` |
| Lesson key and UUID | `communication-listen` · `cf61d502-a8ca-407c-a2f7-9282b879b550` |
| Course UUID | `73e0edda-6c28-420f-9c35-05a29563abd3` |
| Position and requiredness | `position: 0` · `required: true` |
| Read anchors | `liza`, `listen`, `profile`, `practice`, `check` |
| Slides anchors | `slide-liza`, `slide-listen`, `slide-profile`, `slide-practice`, `slide-check` |
| Concept coverage | `m6.gather`, `m6.empathy`, `m6.profile` |
| Indicator | One indicator at `objective_index: 0`, with six bilingual level fields |
| Current narration voice | `gemini:gemini-3.8-flash-tts:Kore` in both languages |

Preserve the complete manifest, including both titles and the single objective:
“In a simulated household interview, ask permission, establish a comfortable
setting and summarize the concern without blame.” Keep its existing Filipino
equivalent exactly. The objective is already a practical task; strengthen the
worked example and observation evidence rather than rewriting its identity.

Keep Mila and Liza, who already connect the lessons throughout 1.6. Liza is 29;
the fictional barrier is childcare and difficulty attending health-center visits.
Her silence and looking toward the door are cues to ask about comfort, not proof
of deception, depression, abuse, or refusal of care.

These are repository observations. Capture fresh, bounded published lesson and
revision snapshots when implementation begins; this handoff did not query the
live database or establish which revision is currently published.

## Teaching scope and six proposed screens

Retain the five substantive anchors in their relative order. Add one new
`permission` / `slide-permission` position after `liza`. Each screen must make
sense alone, use a visible illustration, and supply full equivalent narration
in Filipino and English. Short Slides display text is separate from narration.

| Position | What the learner sees and does | Visual treatment |
|---|---|---|
| `liza` | Meet Mila and Liza during a household profile. Notice the neighbor answering and Liza’s short replies. Ask what Mila should check before continuing. | Establish the people, profile task, and crowded setting without exposing filled personal records. |
| `permission` new | Explain the purpose and intended use of the conversation; ask permission, preferred language, place, and whether Liza wants a support person present. Allow a pause or another time. | Show Mila offering choices and Liza making the choice; avoid a forced move or expulsion of the neighbor. |
| `listen` | Use one open invitation, put the phone away, allow a pause, and acknowledge Liza’s account without blame or a promise to solve everything. | A calmer conversation at a comfortable level; demonstrate listening rather than generic icons. |
| `profile` | Work through a short summary and Liza’s confirmation or correction. Explain that an authorized profile needs relevant, accurate answers, not guesses or unnecessary detail. | A fictional note or dialogue with the concern and confirmation clearly distinguished. |
| `practice` | Rehearse permission → setting and language → listen → summarize and check. Identify one helpful phrase, then repeat a rushed or missed step. | Printable role cards and an observer checklist; include a solo equivalent. |
| `check` | Decide what to do when the neighbor answers for Liza. Explain all three options, then resolve the scene with Liza speaking for herself and Mila confirming her concern. | The relevant scene appears before answering; feedback and takeaway appear after the choice. |

Write Filipino first in everyday language, with a full English equivalent.
Example dialogue to refine during authoring: “Saan po kayo komportableng
makipag-usap?” and “Tama po ba ang pagkaintindi ko: mahirap pumunta kapag walang
magbabantay sa anak ninyo?” Make the summary a question that Liza can correct.
Show the ending; do not imply that Mila has arranged childcare or guaranteed an
appointment.

Keep detailed question clarification in 1.6.2, teach-back in 1.6.3, information
assessment and recording in 1.6.4, and formal handoff in 1.6.5. This lesson needs
only the amount of each that supports a respectful listening encounter.

## Source audit and role boundaries

Start with the original sources behind the existing transcriptions:

- [Reference Manual](source-material/day1-basic-competencies/bhw-reference-manual.md), PDF pages 18–19: comfortable setting, attentive listening, pauses, empathy, respectful words, and open questions. Page 18 also contains preceding self-management material; cite the communication passage specifically.
- The same manual, PDF page 30: confidentiality and respect for differences. This is a supplementary privacy source, not the main listening passage.
- [Facilitator Guide](source-material/day1-basic-competencies/facilitator-guide.md), PDF page 28, printed page 21: gather, assess, record and present information; household role-play; **at least eight hours for the combined competency**.
- [Presentation](source-material/day1-basic-competencies/day1-part1-presentation.md), slides 52–57: competency context, demonstration, listening, empathy, open questions, and practice scenarios.

Retrieve the originals through the available source files or retained review
artifacts. Inspect the relevant page images, record file/page hashes and a
claim-to-passage crosswalk, and distinguish source instructions from authored
dialogue and practice adaptations. Earlier 1.5 source audits do not verify these
1.6 passages. Verify the TESDA edition and relevant competency pages before
calling them current; the earlier releases did not establish the latest edition.

Retain the existing adaptation that eye contact must be comfortable and never
forced. Do not teach a glance, silence, nod, or body posture as a diagnosis or a
certain explanation of someone’s feelings. Support preferred language and
accessible participation without changing the task standard.

Explain necessary, authorized information use without promising absolute
secrecy. Verify any legal privacy wording against a current primary source and
local procedure. Asking permission for an ordinary interview must not become a
prerequisite that delays urgent assistance. Keep any urgent-help boundary brief
and locally verifiable; add no diagnosis, treatment, dose, invented emergency
number, or universal clinical procedure.

## Facilitated practice and timing

Keep the target’s **90-minute** guided allocation. The current five lesson guides
sum to `90 + 90 + 120 + 90 + 90 = 480` minutes. The shared module guide also
totals 480 minutes, using a different session-level breakdown. Treat these as
two views of the same eight-hour program, not additive training time. Neither
the source nor a short video establishes an official minimum of 90 minutes for
this individual lesson.

A proposed target run sheet is: opening and choice of setting 10 minutes;
worked listening demonstration 15; triad practice and role rotation 30;
observer feedback and repeated attempts 20; scenario decision and debrief 10;
transfer action 5. Total: 90 minutes.

For 30 participants, use ten triads with Mila, Liza, and observer roles. Rotate
roles, so everyone practices the BHW role. Name which triads the assessor samples
in each round and record who still needs direct observation. Peer feedback does
not establish an assessor rating for an unobserved participant.

Retain one indicator with all bilingual level texts. Align it with the visible
actions: permission; setting and language choice; an uninterrupted account;
paraphrase; and an accuracy check. Any rubric refinement must remain at objective
index 0 and describe observable performance rather than a quiz result.

Ship the fictional role cards, observer checklist, and a one-page listening aid
named in the guides. Include no-projector, no-internet, and solo alternatives.
Use fictional details throughout practice. A field transfer action can rehearse
the same opening at the next authorized visit, without requiring the learner to
upload a resident’s private account.

Keep the loader’s twelve required guide sections in order: `purpose`,
`time-materials`, `prepare`, `opening`, `steps`, `expected-answers`,
`misconception`, `practice`, `answer-key`, `observe`, `support`, `sources-review`.
Use the last section for concise facilitator-useful references; keep author
discussions, model reports, unresolved review notes, and draft stamps in the
separate review evidence.

Measure the final self-study estimate from the actual text, checks, narration,
and intended practice. State guided practice separately. Do not copy 1.5.6’s
8–11-minute estimate into this lesson automatically.

## Illustration narration and story

Create a consistent fictional Mila/Liza scene set that shows the decisions in
the table. Use an establishing view and meaningful changes in setting, posture,
dialogue, or focus; six crops alone should not substitute for demonstrating the
listening sequence. Give each screen an appropriate asset reference, bilingual
alt text, takeaway caption, and provenance. No real patient images or records.

Generate twelve actual Gemini Read tracks for the proposed six screens. Preserve
Kore, with one steady adult woman narrator and natural Philippine English and
Filipino. Review Mila/Liza pronunciation, negation, complete instructions,
pauses, and speaker consistency. Add the target’s provider/style handling so
the new `permission` section resolves to Gemini by default; otherwise the
current planner defaults an unrecognized new section to Edge. Leave other
lessons’ style inputs unchanged.

Each slide’s `narration_fil` / `narration_en` must equal its paired Read body.
Measure encoded audio durations and timing zones for headings, body, and
takeaways. Retain all ten current selected tracks, their complete old mapping,
and existing history so the old published revision still selects its own audio.
Do not let a scoped narration run prune any earlier public file.

Add an optional six-beat narrated story in both languages using
[the current video pattern](narrated-lesson-video-pattern.md): 854×480 H.264,
actual AAC sound, measured pacing, final-frame posters, and matching WebVTT
captions. Suggested IDs are `CommunicationListenStoryFil` and
`CommunicationListenStoryEn`. Append only these two compositions to the fresh
main registry; this handoff’s baseline has 74 compositions, so that baseline
would become 76. Store committed inputs under `remotion/public/communication-listen/`
and the implementation under `remotion/src/communication-listen/`.

The story illustrates the approved lesson, has a complete ending, and remains
optional for completion. Read, Slides, story, and fullscreen must use the
existing controls with only one active audio/video player. Changing language,
view, section, or lesson pauses previous playback. Muted regression renders do
not prove that the shipped videos contain working narration.

## File scope and preservation

Suggested branch: `codex/lesson-161-mila-proposal`, based on fresh `main`.
Follow [CLAUDE.md](../CLAUDE.md) and [the session agreement](session-handoff.md).

Primary changes are the seven files in the target lesson directory, new target
illustrations/audio/video/captions, target Remotion inputs and compositions,
target narration selection/history, and scoped `lesson-161-*` review scripts,
evidence, tests, and CI. Use existing player behavior; change shared UI only
where necessary for this lesson’s image visibility or measured time wording,
with regressions for released lessons.

Preserve the complete UUID lock, all four sibling lesson directories, module
manifest/objectives, QA entries, assessments, other indicators, every earlier
public byte, non-target narration, and prior approval receipts. Preserve the
approved 1.5.1–1.5.6 packages, including the newly merged 1.5.5. Publishing
1.6.1 must retain every other lesson’s published revision pointer.

Shared 1.6 teaching edits, if needed, are limited to target-owned passages:
“Why is Liza quiet?”, “Listen before giving advice”, and “Household profiling
with a purpose” in both shared `lesson.*.md` files. Preserve the intervening
1.6.2–1.6.5 passages and the shared whole-conversation activity. A corresponding
target guide line may be reconciled, but do not rewrite the whole module or
change its time allocation. Declare each shared-file exception explicitly.

Capture source/media hashes, the UUID lock, complete old target narration,
non-target mappings/history, registry source/order, and bounded published
lesson/revision/private-guide rows before changing content. Historical guards
must verify retained predecessors and exact successors; never skip a guard,
loosen a hash check broadly, or rewrite an earlier receipt to obtain green CI.

Use local/disposable Supabase for development and E2E. Pilot reads are only the
bounded baseline or deliberate release checks. Keep authenticated evidence
separate from offline fixture evidence, and never export learner identities or
progress for this content review.

## Review package and completion criteria

Deliver a draft PR, a self-contained `lesson-1.6.1-mila-review.html`, a review ZIP,
verification JSON, and a package-integrity JSON with file sizes, SHA-256 hashes,
safe unique ZIP members, CRC checks, and exact inline-media/source byte matches.
Include the final guides, printable kit, indicator, source audit, initial and
corrected audio evidence, original model responses, and measured media timings.
Record human listening and policy review as actual statuses; model analysis is
supporting evidence, not a human sign-off. Keep credentials and browser sessions
out of the package.

Verify both languages at desktop and 390px mobile width, in Read and Slides,
including these outcomes:

- All six screens show a relevant picture before answering; summary and feedback remain gated by the answer.
- Every option has a clear rationale in both languages, with a visible written result.
- Read/Slides narration text and heading/body/takeaway highlighting agree with the actual recordings.
- All five old anchors resume to the correct substantive content; completion still works without watching the story.
- Both shipped stories play unmuted, have all six captioned beats, and finish the final instruction.
- Images, labels, captions, fullscreen, view/language changes, and player exclusivity work on a phone.
- Target identity, concept coverage, guide structure, indicator, old audio selection, protected sources, and public bytes pass their checks.
- Build, lint, typecheck, normal unit/E2E CI, and the complete Remotion regression pass at the final draft SHA. The previous full-library run took about 24 minutes; allow for it rather than omitting it.

Use [the content style guide](training-content-style-guide.md) and
[the capacity-building standard](capacity-building-content-standard.md) as review
references. The latter explicitly remains **proposed**, with proposed automated
enforcement; do not turn this lesson enhancement into a platform/schema rewrite
to implement that entire standard.

Stop at a complete, reviewable draft. After separate approval of its exact
package, follow the scoped release pattern in
`.github/workflows/lesson156-preflight.yml`,
`.github/workflows/lesson156-release.yml`, and
`scripts/lesson-156-release-snapshot.mjs`, adapting the target and protected
lesson set to 1.6.1. Verify the merged production SHA and public media bytes,
dry-run the established loader with `--modules 06-komunikasyon --lesson-keys
communication-listen`, publish only that target, and compare the before/after
published records. Do not reset progress, bulk-publish the module, or apply
unrelated migrations.
