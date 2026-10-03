# Lesson 1.2.3 build and owner review

Prepared 3 October 2026, Asia/Manila. Target: `02-uhc-act/uhc-local-system`.
Base: `7ce98d683d551e9afb13a86acb198d5a4b810409`; isolated branch `codex/lesson-123-story-gemini`.
Implementation and a draft PR are authorized by the executed handoff. This package has no owner or independent policy/clinical SME approval. Release remains pending explicit review of its final media and content.

## Gap and acceptance plan

| Area | Already present | Needs changing | Verification |
| --- | --- | --- | --- |
| Identity | Immutable manifest, section-5, slide-section-5, four concept IDs | Expand to six screens, retain anchor at index 0 | Compare original manifest; inspect resume indexes and saved completion identity |
| Content | Board, skills, promotion, competency mentioned | Coherent community-question story; distinguish governance and local contact; meaningful check | Bilingual parity, primary sources, coverage/loader tests |
| Read audio | Two Edge tracks | Twelve expressive Gemini/Kore tracks and measured sentence timings | Actual voice IDs/MP3 bytes, non-silence, default/explicit zero-render reruns |
| Illustration | Generic process map with contradictory approval | Original Vlanche/Ernesto/midwife community-observation image; draft metadata | Identity, hands, faces, contained mobile/desktop framing and hashes |
| Animation | None | Two six-beat stories, measured audio, VTT and summary posters | H.264/AAC, each beat audible, script/timing/caption parity |
| Teaching | Generic check and facilitation | Resident-question role-play and observable criteria | Ordered facilitator outline; distinction from online completion |
| Controls/review | Shared viewer controls | Target art mapping and optional story | Actual component at four sizes, one player, highlighting, full-screen/return, optional-video completion |

## Six-screen bilingual storyboard

1. `section-5` / `slide-section-5`: **Paulit-ulit na tanong / A recurring question.** Mang Ernesto and other residents ask where to obtain current community health activity information. Vlanche listens, notices the repeated question and asks who can clarify it.
2. `local-system-board`: **Magkaibang papel / Distinct roles.** Provincial/city boards oversee UHC system integration; BHWs do not automatically sit on or direct them. Municipal and other local boards under RA 7160 have their own statutory functions; verify the local arrangement.
3. `local-system-observation`: **Malinaw na obserbasyon / A factual observation.** Describe what residents asked, when and what is uncertain, without personal health details. Ask the locally appropriate health-team contact who can confirm information and receive suggestions.
4. `local-system-promotion`: **Tumpak na mensahe / An accurate message.** Apply Module 1 barangay HEPO learning: listen, check current material with the team, explain simply, invite questions and check understanding. Avoid guessing activity times or announcing policy.
5. `local-system-feedback`: **Magsanay at mag-follow-up / Practice and follow up.** Vlanche rehearses her summary with the midwife, suggests clearer information, asks who may act, agrees how to follow up, and returns with confirmed information.
6. `local-system-check`: **Ikaw naman / Your turn.** Repeated conflicting resident questions: choose a factual, confidential summary plus a locally verified team question over unilateral policy, public resident details or an assumed board route. Feedback explains each boundary.

## Media plan

Original landscape image: Vlanche (Filipina about 40, short softly wavy black hair, teal polo, dark trousers), Ernesto (elderly Filipino, gray hair, cream collared shirt) and the midwife at the BHS examine a blank observation note. An unbranded community gathering cue distinguishes this from the primary-care consultation image. Keep all faces and natural hands visible; no legible records or real officials. References: released 1.2.1/1.2.2 fictional identities. New media start draft.

Read and animation share `LOCAL_SYSTEM_STORY_STYLES`: conversational Filipino/Philippine English; curious Ernesto, attentive Vlanche, calm midwife; varied pitch/pace with purposeful emphasis on factual observation, confidentiality, accurate messaging, role boundaries and follow-up. Model `gemini-3.8-flash-tts`, voice Kore; verify availability before synthesis. Preserve spoken normalization, hash participation and the shared YAKAP word exception; this lesson does not need YAKAP.

Six animated beats: recurring question → board/team roles → anonymous factual note → checked health-promotion message → team discussion/rehearsal → feedback and agreed next step. Use animated questions, role cards, note fields, message-check cues and follow-up states, with a contained original illustration. Each language's real audio sets scene boundaries; no speech stretching or clipping.

## Source audit plan and initial evidence

Checked the repository's page-labelled source transcriptions: manual printed p.5/PDF p.13 lists board, skills and promotion; printed pp.3–4/PDF pp.11–12 describes barangay HEPO and team participation; printed p.7/PDF p.15 identifies technical supervision and communicating concerns. Facilitator printed p.14/PDF p.21 explicitly names identifying opportunities, discussing/developing ideas with others and integrating change; PDF p.20 supports educator/organizer practice. Original PDFs and additional current DOH guidance are being sought; do not claim visual PDF verification until actually performed.

RA 11223 sections 19–20 and 30 checked at Lawphil; RA 7160 section 102 checked separately. These support distinct system governance and local board functions, not a universal resident-to-board chain. Detailed URLs, passages, checked dates and retrieval limits will be recorded in `lesson-123-source-audit.json`.

## Release and review gates

Acceptance requires immutable identity and all concepts retained; final aligned bilingual content and criteria; original inspected image; twelve Gemini Read tracks; two timed AAC narrated animations with VTT/posters; preservation of historical/sibling media; appropriate local tests/build/UI checks and final-head CI/Remotion artifacts; a self-contained owner-review package and attached draft PR. No merge or publication before explicit owner approval of this new package. After approval, fresh one-lesson Linux dry run, exact merged production deployment, scoped publication and live mapping/media/sibling checks are mandatory.
