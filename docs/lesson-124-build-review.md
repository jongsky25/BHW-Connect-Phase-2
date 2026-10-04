# Lesson 1.2.4 — One practical improvement

Prepared 3 October 2026, Asia/Manila. Target: `02-uhc-act/uhc-improvement`.
Audited base: `7ce98d683d551e9afb13a86acb198d5a4b810409` (released 1.2.2 including shared YAKAP correction). Isolated branch: `codex/lesson-124-story-gemini`.

## Scope, gap audit and acceptance

| Area | Already present | Change and verification |
| --- | --- | --- |
| Identity | Published key, immutable title/objectives/required/position; two stable positions | Preserve exact metadata and UUID; verify old stable resume positions and completion identity across a new revision |
| Learning | Discuss first and choose a small step | Develop six bilingual screens, matching slides/takeaways, supported plan check and feedback |
| Narration | Four Edge tracks | Twelve expressive Gemini 3.8 Flash TTS/Kore tracks with measured zones; no silent substitute; default/explicit zero-render reruns |
| Art | Generic SVG with contradictory approved/draft record | Replace its teaching role with original topic art; preserve historical SVG bytes; new art remains draft |
| Video | No target composition or featured asset | Six purposefully changing beats per language, actual sample-derived timing, H.264/AAC, exact VTT and summary posters |
| Practice | Generic observation/check | Fixed twelve-part bilingual outline and observable plan/feedback criteria, separately recorded from online completion |
| Sources/review | Inherited p.21 audit pending | Actual PDF printed/page mapping, role limits, instructional-adaptation labels and concrete owner package |

Finish the draft PR and self-contained bilingual review package before requesting release approval. The prior 1.2.2 approval does not cover this package. No merge, production load, progress reset/backfill or publication is authorized until this new package has explicit owner approval.

## Six-screen bilingual storyboard and IDs

1. **Magmungkahi at pag-usapan muna / Propose it, and talk it through first** (`section-6`, position 0): Vlanche hears two different answers about whom residents should ask. Ernesto supplies a question. Describe evidence without blaming or claiming the whole system is broken.
2. **Ang unang maliit na hakbang / The first small step** (`section-7`, position 1): propose a short consistent message for scheduled visits next week. This is a proposal to refine, with information and authority still to check.
3. **Tiyakin ang datos at makinig / Confirm the facts and listen** (`improvement-confirm`, position 2): ask the midwife about current contact/message, existing arrangements and required agreement; hold back unconfirmed information.
4. **Gawing konkretong plano / Make the plan concrete** (`improvement-plan`, position 3): action, responsibility/permission, feasible time/materials and Friday review. The locally agreed example is fictional.
5. **Subukan at balikan ang nangyari / Try it and review what happened** (`improvement-feedback`, position 4): count whether people can name the contact and note remaining questions without personal details; review and refine, without guaranteed system/health impact.
6. **Piliin ang maisasagawang plano / Choose a workable plan** (`improvement-check`, position 5): select the confirmed, agreed, feasible plan with a review indicator. Plausible alternatives make an unsupported benefit promise, unilaterally change a service, or postpone all concrete planning.

The original IDs and their positions survive. The old generic check moves from `section-7` to a richer final application check with a new stable ID; original discussion/small-step coverage survives. Slides retain `slide-section-6` and `slide-section-7`, with added `slide-<named-id>` positions. Every screen retains `m2.competency`. The original PhilHealth reminder example is replaced by an information/contact example to avoid repeating 1.2.1 and claiming entitlement or clinic selection.

`lessonPosition` matches a saved stable position plus concept across revision changes, with concept/first-position fallback. Completion is keyed to lesson ID. No progress rows are changed by this work; regression checks exercise old positions and completion with a new revision. The application answer key remains revision-specific.

## Source audit

See `docs/lesson-124-source-audit.json` for original PDF hashes, URLs, exact passages, printed/PDF page mapping and retrieval limits. The original Guide was downloaded from the project's Drive source and checked against repository Markdown. Printed p.14 / PDF p.21 teaches workplace innovation, not entrepreneurial skills (printed p.15 / PDF p.22). Printed p.12 / PDF p.19 confirms the UHC mapping and three-hour module. No topic-specific improvement activity or evaluation rubric is printed on p.21. The planning exercise, scenario and practical rubric are instructional adaptations, not a copied DOH/TESDA assessment instrument.

The Reference Manual's role and UHC passages were checked against original PDFs. RA11223 principles are contextual. No benefit list, clinic selection, referral destination or YAKAP mention is needed in this lesson. Shared YAKAP pronunciation code remains unchanged and is covered by existing regressions.

## Original illustration and delivery plan

Built-in imagegen, generated 3 October 2026. Vlanche, midwife and Ernesto plan at an unbranded table with three blank cards; exact prompt, reference identities, SHA-256 and bilingual alt/caption are in `lesson.json`. Blank cards are learning cues. Faces and hands were inspected; contained framing preserves all participants in Read, Slides and video. Historical public art remains available. New art is draft; no owner or SME approval is claimed.

Read and video share `UHC_IMPROVEMENT_STORY_STYLES`: conversational Filipino/Philippine English, curiosity at Ernesto's question, calm Vlanche/midwife discussion, purposeful pitch/pace/emphasis and pauses at proposal/agreement/feedback. Wording is normalized only through the shared pronunciation pipeline; style/model/voice/pronunciation participate in hashes. New sections of this target resolve to Gemini by default, preserving the story's provider when expanded.

Video beats: observed gap → first proposal → team/fact check → concrete plan → small trial → feedback/refinement. Animated planning cards change across the beats, with original contained art for opening and final summary. Register the two compositions only after real art/audio/timing files exist. Actual speech must fit the 90-second budget; never trim, stretch or clip it.

## Verification and owner review

The existing approved Gemini configuration was located securely in the previous release record and loaded directly into the generation process; no key is copied into this package. Twelve actual Gemini/Kore Read recordings exist. Both final explicit/default one-lesson dry runs render zero; actual voices, byte hashes and timings are checked rather than relying on the generic CLI provider banner. Only `uhc-improvement` changes in `narration.json`; every historical/neighboring public audio file is retained.

Original PDF render checks were completed on 3–4 October 2026. The local actual-component fixture checks all 96 Read/Slides screen states (two languages × two modes × six screens × four viewports), both application feedback states, full-screen close and optional-video completion. Desktop 1280×900, phone 390×844, landscape 844×390 and tablet 768×1024 show no horizontal overflow; contained art preserves all three faces. Old `section-7`/`slide-section-7` resume anchors survive. Navigation, resume and completion callbacks are explicitly stubs, and write no production learner data.

Typecheck and lint passed. Normal Windows Turbopack build failed because the external dependency junction points outside its filesystem root; the documented Webpack fallback passed. Relevant content, narration, provider, navigation, pronunciation and actual viewer regressions passed (108 tests). The first run of the all-module narration check hit its 60-second timeout during heavy simultaneous build/render activity; the unchanged test passed on rerun. An additional poster regression checks language-specific selection and historical fallback. The additive optional video `poster` field is validated and hashed by the existing content loader; old assets retain their default poster.

Read/video audio underwent model-mediated Gemini 3.8 Flash listening with no expected transcript supplied. This is not human listening or owner approval. The first English video review flagged an inconsistent name and limited expression; English Read/style and video performance directions were refined, recordings/timings regenerated together, and the final review reports natural, measured, engaging delivery with no clipped speech. The fictional name may sound like Blanche in the Philippine accent; visible text remains Vlanche. Raw transcripts/delivery assessments accompany the package. Technical evidence separately checks H.264/AAC, frame size/duration/size budgets, measured captions and decoded non-silent audio in every Read zone/video beat.

Both animations use sample-derived scene durations and an uncut spoken track, ending on a planning-cycle summary. Both language posters accompany the package and are selected with their corresponding video. All new art and video assets remain draft. The review ZIP includes offline bilingual previews, all Read recordings/timing manifest, both MP4/VTT/posters, original art/prompt, source/technical/listening evidence, facilitator guides, competency criteria and representative actual-component screenshots.

Final-head CI and both Remotion shard artifacts are recorded separately in the owner review evidence, with actual links/status rather than historical test counts. No publication is performed by this draft implementation. Authenticated production playback/resume/completion is not verified. Owner approval of this concrete package must precede approval metadata, fresh final release gates, exact-commit production deployment verification and one-lesson publication. No clinical/policy SME approval is claimed.

The first review head passed normal CI (142 suites / 1,325 unit tests and 80 E2E tests). Remotion shard 0 passed and uploaded its artifact; shard 1 reached `UhcImprovementStoryEn`, its last composition, then hit the existing 20-minute timeout. Run: https://github.com/jongsky25/BHW-Connect-Phase-2/actions/runs/37174658831. The library now contains 34 compositions. The job timeout increases to 30 minutes, retaining two shards, every composition, codec/size checks and artifact upload. Both shards and CI must pass again on the resulting review head. No media are regenerated by this timeout adjustment.

## Owner approval and release scope

On 4 October 2026 (Asia/Manila), the owner instructed: “approve 1.2.4 for live release”. Approval covers the complete package reviewed at `e8977cf37f05d86aa3e488ec37b0abcc5882dcff`, ZIP SHA-256 `675ce083e655ca3efdbf3f4dc05be02c71207ad47a66fa4be49d893f6b2b5135`, and the immutable media hashes in `docs/lesson-124-owner-approval.json`. Earlier draft statements describe the creation/review stage; this approval supersedes them. Only the target lesson’s new asset statuses, captions/provenance, facilitator review notes and approval records are updated. No media are regenerated. No independent clinical/policy SME approval is recorded. Final-head CI/E2E, both Remotion shard artifacts and a scoped Linux dry run must pass before merge; exact-commit READY production must precede publication of only `uhc-improvement`. The final log inventory corrects the timeout note’s earlier 32-count estimate to 34 compositions.
