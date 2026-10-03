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

Checked the repository's page-labelled source transcriptions: manual printed p.5/PDF p.13 lists board, skills and promotion; printed pp.3–4/PDF pp.11–12 describes barangay HEPO and team participation; printed p.7/PDF p.15 identifies technical supervision and communicating concerns. Facilitator printed p.14/PDF p.21 explicitly names identifying opportunities, discussing/developing ideas with others and integrating change; PDF p.20 supports educator/organizer practice. Original PDFs were not found in the supplied source material. Current official DOH integration and health-promotion document pages repeatedly returned 403/502; search-index text was treated as a retrieval lead only. No visual PDF or exact current DOH policy-page verification is claimed.

RA 11223 sections 19–20 and 30 checked at Lawphil; RA 7160 section 102 checked separately. These support distinct system governance and local board functions, not a universal resident-to-board chain. Detailed URLs, passages, checked dates and retrieval limits are recorded in `lesson-123-source-audit.json`.

## Release and review gates

Acceptance requires immutable identity and all concepts retained; final aligned bilingual content and criteria; original inspected image; twelve Gemini Read tracks; two timed AAC narrated animations with VTT/posters; preservation of historical/sibling media; appropriate local tests/build/UI checks and final-head CI/Remotion artifacts; a self-contained owner-review package and attached draft PR. No merge or publication before explicit owner approval of this new package. After approval, fresh one-lesson Linux dry run, exact merged production deployment, scoped publication and live mapping/media/sibling checks are mandatory.

## Completed draft verification

Reconciled main `06b95501dfa3b96aaa294d91472f08081b888ca8` additively, including its Cebuano/Hiligaynon media and Remotion registrations. Only the target narration entry changes; no historical public audio/image/video deletion. Original metadata, lesson identity, section-5/slide-section-5 and all four concept IDs remain. Resume regression retains the old anchor and completion follows the unchanged lesson ID; no production progress writes or backfill.

Media run 37131717052 generated all twelve Read tracks and both six-beat stories using existing repository Gemini configuration, model gemini-3.8-flash-tts, voice Kore. Explicit and default scoped narration dry runs both render zero tracks; target manifest voice IDs, current hashes and actual file bytes checked. A copy/style change still selects Gemini and invalidates only affected cache inputs. All historical module audio pruned by synthesis cleanup was restored. Detailed provenance and measured durations are in lesson-123-media-generation.json.

Actual ffprobe/ffmpeg verification: all twelve MP3s and both shipped MP4s decoded, every Read heading/body/takeaway zone and every story beat has audible PCM. Shipped stories are 854x480 H.264 plus AAC, under 90 seconds, with measured captions and final summary posters. Both six-frame contact sheets were visually inspected: topic-specific animated role/note/message/question cards, all three faces visible in original art, readable labels and practical summary. This is not a static image under continuous audio.

Model-mediated listening run 37132755039 reviewed actual MP3/MP4 bytes without an expected transcript. All fourteen reports are retained in lesson-123-automated-listening.json; no clipped word endings or distracting dead air were reported. Most Read delivery was assessed clear and purposeful. The videos were assessed moderately clear with restrained variation. Several tracks render Vlanche with a localized B/soft-V onset; HEPO varies between spelled letters and an acronym word. These are disclosed listening-review observations for the owner, not human listening or SME approval. YAKAP does not occur in this authored lesson; shared pronunciation tests still run. The one-time external listening helper was removed after use: it is not an application request path or a new permanent lint exception.

Actual ReferenceLessons component fixture at localhost 3123: both languages at 1280x900, 390x844, 844x390 and 768x1024. All 96 Read/Slides positions checked for horizontal overflow and contained art. All twelve Read files played and highlighted; the final check intentionally unlocks its summary/audio after any answer. Incorrect/correct feedback, completion without video, fullscreen scrolling/navigation/close, language-matched story/captions, one mounted player and unmount on returning to Read passed. Browser reported no page errors. Navigation/resume/completion callbacks are explicitly local stubs, not authenticated production tests. Detailed callback/viewport evidence is in lesson-123-browser-checks.json.

Local normal Turbopack production build, typecheck, Remotion lint/typecheck and six target regressions passed. Final repository CI/E2E and both Remotion shards/artifacts must pass on the final reviewed head; their final run evidence is delivered with the owner package rather than asserting an earlier head passed. The initial pre-media CI stale-audio failure resolved with real tracks. A later lint failure in the temporary audio-review helper was resolved by removing that helper; no lint rule was weakened.

Bilingual facilitation follows the fixed twelve-part outline. A single observation indicator maps to immutable objective index 0 (schema prohibits duplicate objective indexes) and combines factual/confidential summary, checked message/understanding, local contact/authority and follow-up. Online completion explicitly does not establish practical competence. Independent clinical/policy SME review remains unclaimed.

Owner package includes a standalone HTML with embedded actual component/media and labeled callback stubs, all final MP3s/timings, both MP4s/VTTs/posters, original illustration/prompt, authored bilingual learner/facilitator files, representative screenshots and source/technical/listening evidence. All new assets stay draft. PR #239 remains draft, with no merge/deployment/publication or previous-owner-approval reuse.
