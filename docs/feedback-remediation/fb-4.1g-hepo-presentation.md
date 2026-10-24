# FB-4.1g — BHW and HEPO presentation and reading guidance

Owner directed assessment of the other BHW/HEPO feedback and fixes where supported,
explicitly excluding the real-BHW photograph request because it was already done.
No photograph is replaced, requested or relabeled in this increment. Training
owner remains Ray Justin Ventura. No feedback reply or status write is sent.

## Review findings

Read-only pilot metadata on 24 October 2026 confirms `bhw-roles-hepo`, lesson
`7ec7a016-ddac-495e-a2df-f7aa135dfa9c`, published revision
`04a0fc9b-9dca-4b84-8504-533bd9785922`, full content hash
`88cf770c7b81b869cc73e684e2ee6eb2bdc105d189f76c2d7e4c406f61c69990`.
The authored lesson has five Read sections and five corresponding Slides. Its
slide layouts include scene, process, relationship map and decision, with A01,
A04, A02, A02 and no final image respectively. The current renderer instead
uses the same built-in story scene and story layout in both modes, suppressing
those slide assets. The only position label is a bare fraction. This gives
merit to the reported difficulty recognizing Slides, even though it does not
establish the exact reporter session from September.

| Feedback | Current evidence and disposition |
| --- | --- |
| `f9a4fd5b-44b7-4458-9246-97da738b2dc5` | Confirmed presentation/expectation gap. Use the authored slide layouts, assets and concise display text; add visible slide numbering and viewing guidance. |
| `588c9f46-afb7-4f45-9643-cd64a17bae39` | The lesson already has a specific overall objective, but sections do not state their learning focus. Add a short focus for each section/slide, including a neutral final practice instruction. |
| `b3f93679-5973-43fc-bb14-6b309c3779d4` | The quoted shortened Filipino sentence is still in the timed Read source. Add the requested complete explanation beside that paragraph. Do not silently replace timed text and make Listen disappear. The original source and recording remain for a separate coordinated text/audio revision if needed. |
| `37c71d1e-b16d-4b1e-9717-4422827be188`, `b14456f4-067f-4c9c-87ef-9e99d0dc20d9`, `73930e4d-5038-4a8a-a598-0c013b98d9c4`, `2ddfd162-adfc-4c52-9931-09a80df3478d` | English Read already spells out 8:00, 10:00 and 11:00 a.m. Filipino and slide displays benefit from explicit morning context. Add a Filipino Read clarification and fully qualified slide time labels. Recordings are not regenerated. |
| `28ba5e3f-9e71-4654-98d6-2962236e3a03` | Request for concrete examples has merit, but current Read and the six literal caption passages already describe Riza's health discussion, shared clean-up planning and helping Aling Nena contact the midwife. Preserve these concrete examples. No missing case or incorrect claim was found; no new program-specific medical instruction is invented. |
| `8f542eb0-9432-4b7c-9664-3972f1a51b13` | Mixed praise and broad clarity concern. Viewing instructions, learning focus and the Filipino explanation address concrete issues; do not claim all material is now simple or the report fully resolved. |
| `2f1f2eca-6a10-4c5b-a8cd-775d88103a83` | Existing reading tools/themes remain. The authored summary cards and a distinct focus panel make the mode clearer. A contrast issue found in the target lesson's Read story shortcut is corrected using the ink theme token. No broad font/background redesign. |
| `9aade83c-24dc-4966-9995-ae9e9e1ed55f` | Read narration exists in the current manifest. Exact-text timing checks are retained; tests use the actual recordings' metadata and ensure Listen remains available in both languages. This does not prove playback in the historical reporter's browser. |
| `471c4f96-1a5e-4ec9-9e2e-1f838164e13c` | Owner says photograph work was already done and directs skipping it. No action or further collection. |

Other comments submitted from this route concern language options, assessment
navigation, course length, refresher courses, connectivity and daily/time limits.
They keep their existing assignments; a lesson presentation review does not
change those separate product/assessment policies or remove approved content.

## Delivered behavior and boundaries

For the exact reviewed English/Filipino lesson revision, Slides uses its authored
presentation rather than the Read story template. Inline pages display the
existing section-specific schematic at a bounded height beside the original
summary cards, giving the text more space. Full
screen uses the existing fitted-page reader, zoom and orientation controls; this
lesson opens in the current device orientation and its mode buttons wrap to avoid
clipped controls on narrow screens.
Read keeps its Riza scene and original timed paragraphs/audio. The optional
narrated story remains a separate mode; its duplicate promotional shortcut is
removed from Slides only. Existing pictures and provenance labels remain.

A header identifies Slide N of 5 or Section N of 5 and states the learning focus.
The first slide explains that one summary page is shown at a time, Previous/Next
change slides, Full screen opens the presenter, Read has the full explanation
and the narrated story is optional. Later slides keep the concise count/focus.
The role-map focus retains the approved boundary: a learning visual is not an
official organization chart or appointment. The final focus names no answer,
correct role or rationale. Assessment choices, feedback and completion gates
are unchanged; answers remain scoped to their existing modality/position keys.

The Filipino first-section clarification gives explicit morning times and the
fuller sentence requested by the reporter. Original Read text, exact narration
matching and recordings are preserved; no stale speech is forced onto edited
text. Slide labels add a.m./ng umaga without changing the example's events.
No new curriculum revision, media generation/publication, progress API, grade,
database schema or pilot mutation. Cebuano/Hiligaynon, other revisions, other
lessons and unknown sections retain their approved presentation.

The necessary shared-reader edit has nine exact replacement groups in
`fb-4.1g-reader-preservation.json`, reconstructing the entire predecessor at
`c9926025e154afabff31b476dbbe9f36a0a4abfb`. Historical checks normalize this
new layer before the prior relationship layer. Earlier whole-reader tests now
use that exact predecessor view rather than assuming no future authorized
change. No earlier receipt or approved source/media hash is rewritten.

## Verification

Focused tests cover both languages and inline/fullscreen modes, all five
positions and original assets/layouts, visible guidance/focus, explicit times,
Read scene, separate optional story and return to Slides, same-position format
switching, existing per-modality response state, pre-response feedback gate,
explicit completion, read-only callbacks and revision/unknown-section guards.
Tests using the actual narration manifest ensure the first Read section retains
its audio in both languages. Translation and historical preservation suites
remain in use. Offline browser review uses the actual shared reader/application
CSS with only navigation/image framework shims and local public assets; it covers
all slides plus fitted fullscreen in both languages, light/dark themes and
320/1280px XL combinations. All 64 combinations passed overflow and axe checks;
full-screen controls were also checked to stay inside the viewport. Screenshots
were inspected after the orientation, wrapping and schematic-height corrections.

A disposable Chapter 1/module 1.1 browser fixture covers general training and
assessor study, all five Slides, Read/Slides continuity, original assets,
light/dark accessibility, native fullscreen, unexposed self-check feedback and
optional story separation. It refuses pilot URLs and restores temporary legacy
fixture flags in cleanup. No authenticated pilot session is available; production
verification checks exact deployment identity, public routes/assets and read-only
revision metadata, while authenticated flows run in disposable CI. The release
PR records final counts and production receipts. Reports remain open for live
comments or their explicitly documented limits above.
