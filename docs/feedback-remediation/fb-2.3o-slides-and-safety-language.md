# FB-2.3o — standalone Slides and safety-report wording

Read-only pilot review on 27 October 2026 checked three `new` reports against their published Chapter I lessons. All three reports have no screenshot. The current safety lesson is `safety-identify` revision `0d3b81b9-ca07-4c79-94f6-8acc203ce911`, content hash `ac7ab4b403d1a7d18699b2be524b02381f018ea639ddc92a98fb9cb0fdbc408e`; the service-provider lesson is `bhw-service-provider` revision `ea27993d-d277-41ef-acb3-cb11d8bd47e5`, hash `b25a8e88e561ffe1c0a4c7c0aa77bbdc5c2fd56f9f39535b26fa79300654eb68`.

| Feedback | Current evidence | Finding |
| --- | --- | --- |
| `f7ed309c-f91a-41f8-a1b3-1f799c58b845` | Selector points to the first service-provider Slide paragraph. It gives three complete sentences about Aling Nena, Riza and the midwife. Later Slides give actions and a summary; one intentionally labels a list “Mga halimbawa.” | No incomplete sentence or unusable standalone Slide was reproduced at the selected location. Keep open for a specific current Slide that needs more context. |
| `097e8bcc-b1d5-4dd6-8199-e5d16614ff39` | Report suggests “pag-iwas” in place of “PAGLAYO,” but identifies only a Slide span and has no screenshot. Current safety text says “Ilayo muna ang tao sa basang bahagi mula sa ligtas na puwesto”; the check's correct report likewise uses “ilayo muna ang tao.” No standalone “paglayo” noun is present in the published lesson. | “Ilayo” states the immediate action around a wet floor; “pag-iwas” is broader and does not identify who should be moved or from where. No blanket replacement. Keep open for an exact current sentence. |
| `641b9e80-7dbe-4f5e-946c-f90c299da12c` | Selector and captured label identify the first, correct check choice in both Read and Slides: “Basang pasukan, panganib madulas; ilayo muna ang tao at ipatama sa responsableng staff.” The phrase “panganib madulas” is still in the published revision. | Confirmed awkward Filipino phrasing. Prepare the exact new-version choice below; do not edit the pinned approved package in place. |

## Proposed versioned correction for review

Replace **only** the Filipino text of the first (correct) `check` option in both `lesson.json` and `slides.json` for `safety-identify` with:

> “Basang sahig sa pasukan; maaaring madulas ang tao. Mula sa ligtas na puwesto, ilayo muna sila sa basang bahagi at ipaayos ito sa responsableng staff.”

The first clause identifies the location and risk; the second names an immediate action, a safe position and the responsible staff. Preserve the English choice, prompt, other two choices, correct-option index `0`, feedback explanations, media and audio. A new published lesson revision must preserve existing enrollment pins, completions and historical scores. The acceptance check is that new enrollments see the exact new choice in both Read and Slides, while existing pinned enrollments continue seeing their assigned revision. No live feedback status or reply changes are proposed.

The current `docs/lesson-181-owner-approval.json` authorizes a package with exact source hashes, and `scripts/tests/lesson-181-release.test.mjs` checks that approval. This proposed wording is outside that approval. Publish only after the exact text is approved as a new version and the release/continuity checks pass.

## Review receipt — 27 October 2026

[PR #408](https://github.com/jongsky25/BHW-Connect-Phase-2/pull/408) merged at `0c7719d89060e8951b65f6273fd2127f47233f22`. [CI run 40456877845](https://github.com/jongsky25/BHW-Connect-Phase-2/actions/runs/40456877845) passed its change gate; application checks and E2E were correctly skipped for the documentation-only change. The Vercel PR check passed. The 214-ID tracker retained unique IDs and `git diff --check` passed. Production public smoke returned `/login` 200, `/sw.js` 200 and a signed-out safety lesson redirect to `/login` (307). This does not verify an authenticated production lesson view or publish the proposed new wording.
