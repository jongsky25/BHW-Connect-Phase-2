# FB-5.2c — focused reading and a lesson outline

Feedback `efdf3000-7998-4cd2-8d76-4258c175131b` suggests a Deepstash-like reading platform at the assessor study page for **UHC purpose and coverage**:

> There's a really good knowledge doom scrolling platform called \"Deepstash\" with similar aim of our BHW Reference Manual Self-Paced Training.

## Merit assessment

This is a design suggestion, not a reproducible claim that an existing feature fails. Review the underlying need for approachable, focused reading rather than treating the named product as a specification. No external Deepstash usability study or evidence of learning improvement is claimed.

The read-only pilot audit found the current UHC revision `5d28c239-c4a2-4cda-a719-e8959a19ae91`, hash `4b82aa20c75ff944adf326932408fd64ca126ac0dea951d53da264f00a639326`. The local validated authored lesson produces the same content hash. See [the audit](fb-5.2c-reading-audit.json).

Existing support already includes:

- One section per page: five teaching sections with 62–89 English words / 72–86 Filipino words in their bodies, then a practice check.
- Concise Slides paired with Read, section takeaways, approved narration, an optional narrated story, comfortable paragraph layout and a fullscreen reader.
- Previous/Next, a numeric position at the bottom and saved section resume.

There is no evidence here justifying further shortening, curriculum reduction, an endless feed, automatic advance or generated summaries. The owner previously declined the separate too-many-lessons report; that disposition stays unchanged.

**Supported gap:** the inline reader offered no list of current lesson headings. Users had to page through sections to discover the arc or revisit a named topic. A heading-only outline makes the existing small sections easier to understand and revisit, without rewriting teaching or exposing check answers.

## Increment

- A collapsed **Sections in this lesson / Mga bahagi ng araling ito** outline appears between inline mode controls and the current content in Read and Slides. It shows position/count, numbered authored headings, the current section and practice-check labels. Position is explicitly distinguished from completion.
- Selecting a heading closes the outline, focuses the actual section heading and uses the existing `move` → debounced `save` path. Current-section selection focuses it without issuing a redundant write. Expanding/collapsing the outline itself never saves or completes anything.
- The shared reader supports both BHW and assessor study; existing ManualLesson callbacks retain the respective course/assessor RPCs and exact revision/position bindings. Read-only preview remains free of progress/completion writes.
- Headings come from the current Read/Slides items, including selected approved Cebuano/Hiligaynon translations. Interface labels are English/Filipino with explicit language markup; translated heading spans retain their own language.
- Checks still require a response at every required check, and completion still requires the end. Selecting the last heading cannot bypass this. No answers, takeaways, feedback or correct-option metadata are added to the outline. Existing answer retention, mode pairing, completion and fullscreen behavior remain.
- Inline only: the outline is hidden while the fullscreen reader or video is open; fitted/story presentation and its pager are unchanged. No persistent preferences or new resume modality were introduced.
- Full-page phone axe review additionally found a contrast ratio of **3.38:1** on the UHC story CTA in the light theme. Its text now uses the existing ink colour for this lesson only. Button action, artwork, narration and other lessons' CTA styling remain unchanged.

The complete preceding reader is reconstructed through three exact replacement groups in [the preservation receipt](fb-5.2c-reader-preservation.json). The existing FB-4.3 helper normalizes this successor before applying its unchanged historical receipt. Prior receipts, teaching, questions, scoring, translations, audio/video/assets and curriculum length are unchanged. The new normalizer memoizes only a SHA-256-verified exact reconstruction; every invocation still rereads and compares all disk bytes, returns a fresh predecessor copy, and leaves unknown input untouched for the existing downstream rejection guards. Cache-poisoning and disposable subprocess disk-mutation regressions retain those integrity guarantees. This avoids repeated reconstruction causing historical-check timeouts; no timeout was raised or assertion removed.

## Verification

- **87 focused checks in eight files** cover outline navigation in both languages/formats, every-check completion gating with attempted answers retained, debounced position writes, no save for the current section, read-only preview, language markup, unavailable/single-section outlines, actual approved Cebuano/Hiligaynon heading navigation, existing mode continuity, shared reader/assessor callbacks, completion and exact preceding-source reconstruction.
- The 11 historical checks that timed out on the first full CI were re-exercised in a 12-file / 48-test focused run after the exact-byte memoization fix; all passed in 52.93 seconds locally. Full CI remains the release gate.
- `scripts/lesson-outline-browser.mjs`: **8 actual-component loopback browser cases**, BHW/assessor × English/Filipino × light/dark at 320px/XL. Uses the unchanged authored UHC lesson, verifies its validated content hash against the read-only pilot audit, and renders ManualLesson, ReferenceLessons and application CSS. Keyboard opens the native outline; selected section has visible highlight; section focus and 3-second debounced HTTP persistence work; reload resumes; switching to Slides keeps the section; the final check gates completion; completion and resume use the correct existing RPC names; fullscreen retains its previous pager/content.
- All eight initial expanded-outline full-page axe scans pass; no horizontal page overflow or page errors. Phone screenshots inspected across both languages/themes and training contexts.
- The HTTP fixture is disposable and local, not Supabase: it verifies UI/wrapper request dispatch and retention, not database authorization. The full CI browser suite separately retains the existing disposable-Supabase authorization, training, assessment and save/resume coverage. No authenticated production lesson interaction or production write is claimed.
- Full CI and exact merged production deployment/alias receipts are recorded in the release PR. Original feedback remains unchanged and open for live comments; repository disposition is partial fix pending live review. Training owner remains Ray Justin Ventura.
