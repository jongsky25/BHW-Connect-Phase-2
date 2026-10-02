# Lesson 1.2.1 build and review

Lesson: `uhc-coverage` — **Layunin at saklaw ng UHC / UHC purpose and coverage**.

## Character continuity

The fictional BHW in lessons 1.1.1–1.1.6 is **Riza**. The fictional BHW in lessons 1.2.1–1.2.4 is **Vlanche**. Mang Ernesto remains the resident in the UHC scenario. These are authored names, not a learner profile or a claim that one person experienced every example. Name changes affect spoken media and captions as well as Read, Slides, facilitator guides, tests, alt text, and posters; changing text alone is not sufficient.

## Source and learning target

The BHW Reference Manual (printed p. 5 / PDF p. 13) describes RA 11223's aim of affordable, quality access without financial hardship and lists PhilHealth coverage among the changes. RA 11223 §5 says every Filipino citizen is automatically included in the National Health Insurance Program. PhilHealth Circular 2025-0017 addresses the separate choice of a primary care clinic for a particular benefit. The new lesson asks a BHW to explain the law's aim and automatic inclusion, then identify what must be checked for Mang Ernesto's particular consultation. It does not promise a free visit or teach the primary care pathway reserved for 1.2.2.

| Screen | Learner action | Source concept |
| --- | --- | --- |
| Mang Ernesto's question | Listen before making a cost promise | `m2.enactment`, `m2.philhealth` |
| UHC's aim | Explain access and financial protection in ordinary language | `m2.enactment` |
| Automatically included | Distinguish population inclusion from a benefit decision | `m2.philhealth` |
| Included, but which service? | Reject the inference that every service is free everywhere | `m2.philhealth` |
| What Vlanche checks | Name benefit, provider/facility, and required steps | `m2.philhealth` |
| Answer the resident | Choose a useful reply without overpromising | Both |

## Presentation and media

The large type story layout now includes 1.2.1 in Read, Slides, and the full-screen presenter. The new fictional Vlanche–Ernesto illustration was generated with the built-in image tool on 2026-10-02. Its source asset is `public/training/bhw-1-2/vlanche-ernesto-7e4e35141628.png` (SHA-256 `7e4e351416282cb78a0d8b17c80fba7a4367291f9d46f2586baaa90cd66dcaea`). Prompt: an attentive Filipina BHW in a teal polo listening to an older male resident outside a Philippine barangay health station; warm editorial illustration; blank notebook; no readable text, logos, forms, clinical procedure, or claim that a service is free. The image is illustrative, not a real encounter.

The separately selected Video view has six timed beats in Filipino and English. Its script is `remotion/src/uhc-purpose/narration.ts`. Speech, beat timings, and language-specific captions are built from `remotion/public/uhc-purpose/`. Riza's existing five videos have also been revoiced and rendered with her name. The revised Read narration and new video narration use the repository's Edge Read Aloud voices because this workspace has no Gemini API key. The owner confirmed review, approval, and deployment of this named revision on 2026-10-02; the seven new or revised assets now have `review_status: approved`.

Video is an optional companion. Completion now depends on reaching the end and attempting the Read or Slides check; watching a featured video is not required. Existing learner completions and lesson keys remain intact. Earlier content-hashed Read audio and video files are retained for already-published revisions. The 1.2.1 manifest objective wording remains unchanged pending comparison with immutable pilot metadata.

## Approval and deployment checks

- The owner reviewed and approved this release on 2026-10-02. No separate PhilHealth, clinical, legal, translation, or accessibility approval is recorded by this note.
- Preserve the versioned Chapter I assessment bank. Its existing question retains its historical character name; this release changes the named lesson revisions, not the exam bank or assessor curriculum version.
- Confirm CI, run the scoped loader dry run, publish the intended lessons, and verify the live app in Filipino and English. Do not replace earlier content-hashed media in place.

The deployment outcome is recorded separately from this build note.

## Read narration follow-up

The original build used Edge Read Aloud for both the Read player and the animated video. PR #226 subsequently replaced the Filipino and English animated video narration with Gemini, but did not change the Read player's six section tracks in either language. That left an audible voice mismatch within lesson 1.2.1.

The follow-up Read tracks use Gemini `gemini-3.8-flash-tts`, voice `Kore`, with section-specific delivery guidance for the Vlanche–Mang Ernesto story. Each heading, sentence, and takeaway was synthesized separately; the Read manifest records the resulting audio timing and SHA-256. The approved video, lesson text, and learner check are unchanged. Review the new Filipino and English Read tracks before publishing this follow-up.
