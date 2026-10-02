# Lesson 1.2.2 build and release review

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
