# Lesson 1.2.2 Gemini and illustration revision

Prepared 3 October 2026 (Asia/Manila). Target: `02-uhc-act/uhc-primary-care`.
Base audited: `d50fb0bb9e973e1d4ff5444e5408f38a0a47f8cd`; isolated branch `codex/lesson-122-gemini-review`.

## Scope and acceptance plan

Upgrade against released 1.1.6, preserving the primary-care journey, Vlanche and Mang Ernesto, required/position/objectives metadata, all six Read and slide IDs, and progress identity. On 3 October 2026 the owner approved the revised package and explicitly requested live publication. Approval covers the YAKAP word-pronunciation correction, Read narration, illustration, posters and videos reviewed at e0c10d4025f3788db17852da9092dc95613e6dfc. Main was synchronized through 932a060a before final release checks.

| Area | Audit finding | Implementation and verification |
| --- | --- | --- |
| Content | Six bilingual screens, aligned slides/takeaways, distinct check already present | Retain authored learner wording; check source claims, parity and stable IDs |
| Read | Twelve Edge tracks | Generate twelve Gemini 3.8 Flash TTS/Kore tracks; shared expressive style participates in content hash; measured sentence timings; explicit and default dry runs |
| Illustration | Reused 1.2.1 art | Generate original health-team conversation; integrate in viewer, assets and Remotion; verify all three faces remain visible |
| Video | Two expressive Gemini videos, six timed beats | Retain authored scripts; regenerate audio with the shared YAKAP word pronunciation, measured timings, exact VTT and summary posters; verify H.264/AAC and every beat |
| Controls | Read, Slides, on-demand story and full screen present | Actual-component language selection, single player/unmount, audio highlighting, scroll/return and completion without video |
| Facilitation | Twelve ordered sections and observable criteria present | Refresh source/review notes; retain role-play and separate practical observation from online completion |
| Release | Prior media approved | Owner-approved illustration/video assets; exact-commit CI, scoped loader and production gates before publication |

## Six-screen storyboard

1. `bridge`: Ernesto asks where to start; connect the selected four changes to the prior inclusion lesson.
2. `outpatient`: distinguish outpatient care and confirm the applicable benefit, service, provider and process.
3. `provider`: ask about his selected clinic, obtain current choices, and respect his decision.
4. `referral`: clinician decides; health team confirms local pathway/contact; BHW supports instructions.
5. `local`: Vlanche records clinic/selection, benefit/access and referral instructions if needed; unknown details go to the midwife/RHU.
6. `check`: apply these steps to Ernesto's uncertainty; plausible alternatives wrongly remove choice or make a clinical decision.

Read delivery: conversational Filipino/Philippine English, curious Ernesto, calm supportive Vlanche, varied pitch/pace and emphasis, pauses for practical checks, clear clinician/BHW boundary, exact authored spoken words. The shared `PRIMARY_CARE_STORY_STYLES` copies the already-reviewed video directions exactly. Existing authored video beats remain question, four-changes, outpatient, provider, referral and next-step; video audio and timings are regenerated for the shared YAKAP word pronunciation correction.

## Source audit — checked 3 October 2026

Detailed links, pages, claim coverage and retrieval limits: `docs/lesson-122-source-audit.json`.

- BHW manual printed p.5/PDF p.13 lists nine changes. The subchapter selects inclusion, outpatient, provider and referral. Printed p.50/PDF p.65 reserves full patient navigation to the doctor/nurse/midwife and recognizes local protocols.
- RA 11223 sections 4(l), 5, 6(c)-(d) and 18 cover inclusion, primary care coordination, choice and networks. The PhilHealth PDF timed out; the statute text was checked at Lawphil. The lesson makes no universal provider/service/free-care promise.
- PhilHealth Circular 2025-0017 PDF pp.1–6 and 9 covers selection, first encounter and empanelment. The YAKAP announcement (25 July 2025) supports primary/outpatient benefits without serving as a fixed current entitlement list.
- Advisories 2026-0003 p.1 (resident rights), 2026-0023 pp.1–3 (fixed-clinic and mobile/telemedicine limits), and 2026-0029 p.1 (digital YES, signed 5 May 2026) reinforce resident choice and obtaining current local instructions. No provider administration sequence is added to the learner script.
- The DOH NOH PDF returned 403. Its exact pages were not reverified. The network/navigation claim was checked instead against the official DOH UHC implementation release of 24 January 2023 and the UHC Act; the source URL/title now identify that evidence.

## Illustration and review status

Original built-in imagegen generation: 3 October 2026. Identity/style reference: `/training/bhw-1-2/vlanche-ernesto-7e4e35141628.png`.
New path: `/training/bhw-1-2/primary-care-next-step-a67521f903c0.png`.
SHA-256: `a67521f903c040e83eccc4be8a6c97a4b5eaac37887ccbd2950b5eb705d67cb3`.

Vlanche, Ernesto and a midwife confirm the next step at a small table using a blank note. No clinic name, logo, personal information, medicine or clinical procedure. The blank note is a learning cue, not an empanelment form. Bilingual alt/caption and generation prompt are recorded in `lesson.json`. Read/Slides use a contained image to preserve all three faces in narrow and full-screen views. The video uses a single framed image and meaningful animated benefit/choice/referral graphics; it no longer uses separate character slices.

New image and revised videos/posters are `approved` by the owner on 3 October 2026. Regenerated Gemini scene audio and captions use fresh measured boundaries; earlier immutable public media remain available. Owner instruction: “approve the content and publish to live”. No independent policy/clinical SME review is claimed.

## Verification and review package

The local review fixture uses the actual component and authored lesson with Next image/link/navigation adapters. Navigation, resume and completion callbacks are local stubs. It establishes UI behavior and media playback, not authenticated production access or saved database progress. Final CI/E2E and both Remotion shards must pass for the reviewed head before any release.

## Completed local verification — 3 October 2026

- TypeScript, repository lint, Remotion lint/typecheck and production Webpack build passed. Normal Turbopack build rejected this Windows dependency junction outside its checkout root; the documented Webpack fallback passed. Normal production builds remain in CI.
- Nine focused suites / 134 tests passed: lesson 1.2.2 and 1.1.6, Gemini story continuity, reference content/narration/loader, provider/training validation and actual lesson viewer behavior. Both explicit Gemini and default narration dry runs selected twelve current tracks and rendered zero.
- Actual-component browser checks passed at 1280x900, 390x844, 844x390 and 768x1024: all six Read and Slides screens, no horizontal overflow, audio playback/highlighting, feedback, full-screen scrolling/navigation and completion without video. Filipino and English story playback used one player, correct six-cue VTT tracks, full-screen behavior and unmounted on returning to Read. Resume/completion/navigation are fixture stubs; persisted authenticated progress was not verified.
- Shipped videos: H.264 854x480 plus AAC; initial revision Filipino 76.288 s, English 83.221333 s (superseded by the YAKAP correction below), both under 90 s and 1.4 MB. Exact beat/script/VTT parity and content hashes passed. Decoded audio was non-silent in all twelve video beats and every Read timing zone. Schema duration fields are rounded integer seconds; media reports preserve exact measurements.
- Reviewed original image, desktop/phone/tablet/full-screen captures, both posters and six-frame contact sheets for each language. The fixture captures await image decoding. All three faces remain visible.
- Automated listening used Gemini 3.8 Flash audio understanding on all twelve Read tracks and both retained video audio tracks. This is model-mediated review, not human listening or owner approval. Reports found clear delivery overall, flagged Vlanche's initial V/B sound, the former letter-by-letter YAKAP pronunciation (corrected below) and one Filipino referral pause for owner review. Exact authored text is preserved in synthesis/timing inputs; automated transcription is not proof of word-perfect speech.
- Original identity/objectives, section/slide IDs, learner wording, practical criteria and published media retained. Narration manifest changes are scoped to this lesson; no media deletions. These implementation checks preceded owner approval. Live release is now authorized and requires the final release gates below.

Review outputs include both playable MP4s, VTT files, posters, illustration and exact prompt, twelve Read tracks with timing manifest, responsive screenshots, source audit and media/listening reports. CI/E2E and both Remotion shards are checked on the PR; the owner approved the package on 3 October 2026; fresh scoped publication gates remain required.

## Shared YAKAP pronunciation correction

The owner requested YAKAP to be pronounced as the Tagalog word for hug throughout audio narration. The shared rule now says **YAH-kap**, with first-syllable stress, in every narration language, and takes precedence over acronym spelling. It applies to Read/video speech and Gemini/Microsoft provider entry points. Displayed lesson text, authored timing text and captions retain YAKAP. Pronunciation metadata participates in content hashes only for affected audio; all unrelated legacy hashes remain stable.

Four Read tracks (outpatient/provider, Filipino/English) and both six-beat story audio tracks are regenerated. Their exact measured timings drive the new caption cues and video renders. Other Read audio and all historical public assets remain available. The owner approved the corrected previews on 3 October 2026; previous CI evidence for fcbe95ef is superseded for this changed head. Updated media/listening/browser/CI evidence is included in the review package.

The pronunciation stress agrees with the [Tagalog dictionary entry](https://en.wiktionary.org/wiki/yakap), checked 3 October 2026. Regression coverage checks all four supported languages, provider payloads with custom styles, unchanged authored timing text, affected cache invalidation and stable unrelated hashes.

## Approved release baseline — 3 October 2026

Only `02-uhc-act/uhc-primary-care` may be promoted. Fresh database pointers captured before publication:

```json
[
  {
    "lesson_key": "uhc-coverage",
    "id": "9dfa3c3d-ec75-4143-8fa2-302e4273f829",
    "published_revision_id": "5d28c239-c4a2-4cda-a719-e8959a19ae91",
    "content_hash": "4b82aa20c75ff944adf326932408fd64ca126ac0dea951d53da264f00a639326"
  },
  {
    "lesson_key": "uhc-primary-care",
    "id": "e3abb325-3ccc-47e4-95de-94be7d9735ac",
    "published_revision_id": "596fb1bd-2895-4ebf-9ebd-eb7cbb232979",
    "content_hash": "1ed3abce1591670188f101dc3c56f0922504828c35651885c11b409a8fde554d"
  },
  {
    "lesson_key": "uhc-local-system",
    "id": "def4612a-a2af-4764-a735-7c2dec8a20c4",
    "published_revision_id": "ae2c2f10-95ac-435f-bf35-c425d20ec7d5",
    "content_hash": "1fe6aea29809dde3bd03a27f23b8abca91e385ae27a471f87f014bec5af9c9ab"
  },
  {
    "lesson_key": "uhc-improvement",
    "id": "d23d3ff0-64b0-4823-8c23-710b728a59d2",
    "published_revision_id": "06e30fd6-0dc5-441c-8835-443c31b274bc",
    "content_hash": "d22dae844a28d08ff70163f370cd898e172e0d354d26ba48e75223e1e8998c75"
  }
]
```

Final evidence must establish CI/E2E, both Remotion shard artifacts, a Linux scoped loader dry run, exact merged-commit Production readiness, and scoped publication with the other three pointers retained.

## Historical release record

The record below describes the earlier approved package. Its baseline revision IDs and approval must not be reused for this new release.

# Historical lesson 1.2.2 review — 2 October 2026

Lesson: `02-uhc-act/uhc-primary-care` — **Primary care and referral**.

## Content audit

The BHW Reference Manual (printed p. 5 / PDF p. 13) lists nine UHC changes. The subchapter visual selects four for the resident journey: PhilHealth inclusion, outpatient consultation, primary care provider, and referral. Lesson 1.2.1 teaches inclusion; 1.2.2 applies the remaining three. Integration of previously separate DOH programs remains context, rather than replacing one of the visual's four boxes. The manual's patient navigation section (printed p. 50 / PDF p. 65) reserves complete navigation to a doctor, nurse, or midwife and recognizes local referral protocols.

PhilHealth's YAKAP announcement and Circular 2025-0017 support the outpatient and resident-selected primary care clinic wording. RA 11223 and DOH's National Objectives for Health support the intended provider network and referral pathway. The story does not name a locally available clinic, guarantee a specific service or price, or make a clinical referral decision.

The old pending-source entries, repeated free-consultation question, and contradictory approved/unreviewed `practice-map` asset were replaced. The new check asks Vlanche to confirm clinic selection and outpatient steps, then obtain local referral instructions if a clinician recommends referral.

## Media and authorization

The original Remotion story reuses the approved fictional Vlanche and Mang Ernesto artwork from 1.2.1. Filipino and English narration was synthesized scene by scene with Gemini 3.8 Flash TTS, voice Kore. Audio sample counts set all six scene boundaries and VTT cues. The reviewed videos contain H.264 video and AAC narration; each scene has audible audio. The Filipino render is 76.29 seconds and the English render is 83.22 seconds. The asset hashes in `lesson.json` were validated against the files.

On 2026-10-02, the owner approved the two previews and requested live deployment. The story asset is marked `approved`; no independent policy or clinical SME approval is recorded. The lesson's original Filipino and English objective strings are preserved because the live loader treats lesson metadata as immutable. The revised specific learning targets are in Read, Slides, and facilitator guidance.

Approved revision hash from the Linux loader dry run: `a5d60864e73ab0047227a042cb3efed9eca4ea4f552c801e197e60daec05a28b`. Windows CRLF checkout of the facilitator Markdown yields a different local hash; the Linux loader hash is the publication target.

The revised Read sections have committed bilingual sentence narration in `narration.json` and `public/training/audio/02-uhc-act/uhc-primary-care/`. These use the established Read voice provider. The animated story videos use Gemini, as approved.

## Publication scope

Publish only `02-uhc-act/uhc-primary-care` after the final CI and scoped loader dry run. Baseline live published revision IDs before this release:

| Lesson | Published revision ID |
| --- | --- |
| `uhc-coverage` (1.2.1) | `5d28c239-c4a2-4cda-a719-e8959a19ae91` |
| `uhc-primary-care` (1.2.2) | `476e2606-00a7-4220-a53d-a19dd7890e8f` |
| `uhc-local-system` (1.2.3) | `ae2c2f10-95ac-435f-bf35-c425d20ec7d5` |
| `uhc-improvement` (1.2.4) | `06e30fd6-0dc5-441c-8835-443c31b274bc` |

Verify after publication that only 1.2.2's pointer changed, its published media paths match the approved manifest, and the production site serves both MP4 and VTT files.
