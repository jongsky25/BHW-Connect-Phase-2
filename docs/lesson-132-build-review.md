# Lesson 1.3.2 build and owner review

Prepared 3 October 2026, Asia/Manila. Target: `03-polisiya-bhs/bhs-support-environment`.
Audited main: `7ce98d683d551e9afb13a86acb198d5a4b810409`. Isolated branch: `codex/lesson-132-story-gemini`.
Status: implementation in progress; new package is draft. No owner or independent clinical/policy SME approval is claimed.

## Gap and verification plan

| Area | Already present | Needs changing | Verification |
| --- | --- | --- | --- |
| Learner content | One bilingual section, two required concepts | Six-screen Mimi story; applied check and aligned slides | Source audit, bilingual parity, role boundaries |
| Identity/progress | Stable lesson key, immutable manifest and `section-3`/`slide-section-3` | Add five stable IDs after original screen | Resume by section/slide ID; completion stays keyed to lesson UUID; no database reset/backfill |
| Read audio | Two Gemini/Kore tracks | Twelve expressive current tracks and shared style | Actual voice IDs, file hashes, measured zones, zero-render reruns |
| Art/video | Generic SVG with contradictory approved/draft metadata | Original Mimi illustration; two six-beat narrated animations | Draft provenance, face/hand inspection, H.264/AAC, non-silence, timing/VTT parity |
| Facilitation | Inherited notes | Ordered bilingual practice and concrete observation criteria | Parent-support and non-clinical-waste role-plays; separate practical observation |
| Release | Existing workflow | Draft PR and complete owner package | Local/CI/E2E and both Remotion shards; explicit new-package approval before release |

## Six-screen bilingual storyboard

1. `section-3` / `slide-section-3`: **Suportadong BHS / A supportive BHS**. Mimi welcomes a parent; breastfeeding support and avoidable waste remain distinct topics within a respectful, safe setting.
2. `facility-roles`: **Pasilidad at papel / Facilities and roles**. Explain checked lactation-station requirements and institutional responsibility. Mimi confirms what is locally available rather than promising a facility.
3. `listen-connect`: **Makinig at iugnay / Listen and connect**. Ask about the parent's request, protect privacy and choice, and help connect to locally confirmed trained support. No clinical feeding advice.
4. `unnecessary-plastic`: **Hindi kailangang plastic / Unnecessary plastic**. Explain the circular's verified scope and phased policy without claiming all plastic is illegal everywhere.
5. `safe-alternative`: **Ligtas na alternatibo / A safe alternative**. Discuss a non-clinical reusable option with the supervisor. Preserve necessary/sterile materials and staff-led infection-control and waste protocols.
6. `check`: **Pasya ni Mimi / Mimi's decision**. Choose respectful, locally confirmed support plus safe non-clinical waste reduction; explain why promises, imposed choices and removing/reusing clinical supplies fail.

Original first IDs remain at index zero. Its former check moves to the final screen and becomes a distinct scenario check. No original concept is removed. The viewer resolves a saved stable ID against the current revision, falling back to the first item only if absent; preserving the original IDs preserves the old resume location. Completed lesson rows use the lesson UUID independently of revision. Persisted authenticated behavior still requires verification; no equivalence or reset is authorized.

## Illustration and narration plan

Original landscape Mimi/parent/infant scene, all clothed and all faces visible, discreet support seating and a separate non-clinical reusable lunch container. No branding, clinical procedure, personal forms, official facility promise or exposed feeding. No approved Mimi image/mapping exists in audited main; use the handoff's proposed lavender-polo/navy-trouser character design as draft owner-review material.

Read and video share `BHS_SUPPORT_ENVIRONMENT_STORY_STYLES`: conversational Filipino and Philippine English, curious parent, calm attentive Mimi, purposeful emphasis and pauses around privacy, local confirmation, institution/BHW roles and clinical safety. Gemini `gemini-3.8-flash-tts`, Kore. Display/timing/captions retain authored wording; shared pronunciation normalization runs at synthesis. YAKAP is not needed in this topic and will not be introduced.

Animated beats: welcome → facility/BHW responsibilities → respectful support connection → avoidable waste → supervisor-confirmed safe alternative → two-topic summary. Each beat needs distinct motion/graphics and measured audio boundaries. Register compositions only after required files exist.

## Acceptance and evidence

Preserve immutable titles/objectives/position/required/key, required concepts and historical media. Align six Read screens, slides, takeaways, check, scripts, facilitator activities and objective-index-zero observation criteria. Verify twelve current Gemini tracks, both AAC narrated animations, exact VTT timing, contained face-visible illustration and posters; default/explicit reruns render zero. Verify actual-component controls at desktop, phone, landscape and tablet, optional-video completion, one language-correct player and full-screen return. Run typecheck/lint/build, focused regressions, E2E and both Remotion shards. Record all limitations; owner review and clinical/policy SME review are separate.

Source audit and concrete implementation/check results will be appended after verification. Publication is not authorized until explicit approval of this revised package.

## Owner character-name update — 4 October 2026

The owner requested the BHW name **Mimi**. All learner/facilitator text, alt text, Gemini directions and animation scripts use Mimi. The illustration has no readable name; its appearance is retained. Its exact original generation prompt retains the historical proposed name Corazon and records the subsequent name change. No new media/content approval is implied.

## Completed draft implementation and verification — 4 October 2026

The immutable manifest and original first Read/slide IDs remain unchanged. Six bilingual screens and separate slide summaries cover the two policies distinctly, with topic-specific application feedback. Mimi's story illustration is integrated with contained framing; a stable featured story asset selects one language-correct optional player. Bilingual facilitator notes follow the fixed twelve-section order; practical observation indicators remain mapped to objective index zero. Online completion does not stand in for observed competence. No database/progress edits, merge or publication were performed.

Original source PDFs and checked excerpts are documented in lesson-132-source-audit.json. The retrieved facilitator mirror is printed p.15 / PDF p.24, equivalent to the repository extraction's PDF p.22 passage. Statutory claims use verified RA10028 text; unavailable implementing-rule material contributes no new claims. DC2021-0486's phased scope and infection-control context are distinguished from the authored BHW safety safeguard. Current facility directives must be confirmed locally.

All twelve current Read tracks and both six-beat story recordings use Gemini gemini-3.8-flash-tts / Kore with the shared target style and measured speech boundaries. Existing repository Gemini configuration was used in scoped temporary build workflows; credentials were neither copied nor printed. Only this lesson's narration entry was imported, and historical/sibling audio retained. Both default and explicit dry runs render zero selected tracks; the default planner's generic log mentions Edge for other new lessons, but actual target voices, bytes, styles and cache behavior are checked directly.

The first story exceeded the duration budget and was shortened without stretching or clipping speech. Model-mediated audio review then flagged law-number pronunciation and inconsistent speaker delivery. Both Read and story audio were regenerated with explicit number and consistent narrator directions. Final encoded videos measure **73.578667 s Filipino** and **70.357333 s English**, 854×480 H.264 with AAC, exact timing-derived WebVTT and separate language posters. Current streams/hashes are in lesson-132-media-verification.json. Every Read zone and video beat is decoded for non-silence; source MP3s are retained with the captions/timings.

Listening evidence is **Gemini 3.8 Flash audio understanding**, not human listening or owner approval. Its latest report confirms intelligible scripts and corrected law-number readings, while flagging some possible voice-timbre shifts, pauses and minor word/morphology differences. These are disclosed owner-listening focuses in remotion/public/bhs-support-environment/audio-review.json; automated transcription is not proof of word-perfect speech. Grouped and digit-by-digit readings of the correct 10028 identifier are acceptable; no new YAKAP text is introduced. No independent policy/clinical SME approval is claimed.

Browser verification uses the actual ReferenceLessons component plus authored data at 1280×900, 390×844, 844×390 and 768×1024, in both languages. It checks all six Read screens and slides, incorrect/correct feedback, narration availability after the final answer, image loading, horizontal overflow, full-screen navigation/close, one on-demand language-correct video/captions/poster, real Read playback/highlighting, and completion without visiting the story. Next Image/Link/router adapters and resume/completion/navigation callbacks are explicitly local fixture stubs; authenticated production persistence is untested. The Image adapter mirrors fill positioning. The isolated final package server uses port **4132**; port3132 belongs to a separate lesson preview.

Local typecheck, lint, Remotion lint/typecheck and the documented Webpack production build are checked. The dependency junction outside this worktree requires the local Webpack fallback; normal production build and E2E remain required in CI. A broad Windows unit run had four timeouts under concurrent renders and four pre-existing loader/render test imports reporting Invalid or unexpected token; it is not reported as passing. Focused affected checks are rerun after final media import, and full Linux unit/E2E plus both unchanged Remotion shards must pass on the final PR head. The review package carries exact results and run/artifact links.

The React quality review is scoped to the viewer mapping, CSS and new animation. Existing accessible semantic buttons/dialogs, lazy single-player mounting and stable IDs are retained. Scene components stay at module scope with stable beat keys; measured metadata is required, with no silent missing-media fallback. No broad viewer refactor or unrelated lesson edits are included. New assets remain draft until this package receives explicit owner approval.
