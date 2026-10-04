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
