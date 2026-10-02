# Lesson 1.1.5 build and review

Lesson: `bhw-records` — **Mga talaan at impormasyon / Records and Information**.

## Source and learning target

The [BHW Reference Manual](source-material/day1-basic-competencies/bhw-reference-manual.md) (PDF p. 12) distinguishes household profiles, group master lists, records and registries of people served, and government, DOH, or local forms assigned by a nurse, midwife, or doctor. The [Day 1 presentation](source-material/day1-basic-competencies/day1-part1-presentation.md) (PDF pp. 5 and 12) connects collection and care of household records to the BHW role and work-related documents. This lesson asks learners to choose a record for a stated question, check uncertainty, and confirm the recipient and local handoff route. It does not teach filling every field or set a universal procedure.

| Screen | Learner action | Source concept |
| --- | --- | --- |
| After the visit | Ask what information is needed and why | `m1.provider.records` |
| What describes the household? | Distinguish a household profile from service evidence | `m1.provider.documents` |
| Who belongs to the group? | Identify what a master list answers | `m1.provider.documents` |
| Who received a service? | Choose a registry and flag an unclear entry | `m1.provider.documents` |
| Clarify before handing it over | Verify the request, recipient, and approved route | `m1.provider.documents`, `m1.competency` |
| Apply your learning | Make the complete record and handoff decision | All three |

## Illustration, narration, and integration

The large type story layout used in lessons 1.1.1–1.1.4 now covers 1.1.5 in Read, Slides, and the full-screen presenter. The new image is `public/training/bhw-1-1/records-2a1725eaf243.png` (SHA-256 `2a1725eaf243727724b6ff37c0f35437506f01ca753da7f648fdcd12b2b43fcc`). It was generated for this lesson on 2026-10-02 using the existing fictional Marites and midwife image as a character and style reference. It shows blank folders at a health station, with no legible fields, names, logos, or patient data. It illustrates a discussion, not an official form or an actual health record. The existing A06 schematic remains in the authored assets as a fallback for other layouts; the story layout conveys record distinctions in native text.

Watch now contains a six-beat Remotion animation about choosing among four record types and checking an uncertain entry before handoff. Filipino and English versions have separately synthesized Gemini expressive narration, matching WebVTT captions, and a bilingual poster. The video uses fictional examples and does not depict actual records. Read narration for all six screens and both languages was also regenerated with Gemini expressive speech in place of the previous Edge voice tracks. `remotion/src/records/narration.ts` is the video script; `remotion/public/records/narration-*.json` records beat timing. The lesson asset manifest selects the correct video and captions by language.

## Review points

- Confirm the local forms, recipient, storage, and submission route with the supervising midwife or health team. The fictional “recipient: midwife” example is specific to the lesson scenario.
- Review the Filipino and English Read and Slides copy, final check, and facilitator activity with BHWs and a local subject-matter reviewer. The distinction between a group list and a service registry should remain clear.
- Check the narrow phone and landscape layouts, full-screen presenter, image crop, choice buttons, and feedback.
- Listen to the Read and video narration in both languages. The Read narration manifest must match the final lesson text exactly; copy changes require affected tracks to be rendered again. Video script changes require regenerating the corresponding audio, timing, captions, and video.
- Keep fictional examples free of real personal details and review status in authoring material, not learner-facing copy.

## Release authorization — 2026-10-02

The owner approved the completed 1.1.5 content, expressive Read narration, and Filipino and English animated videos, and reported that experts had reviewed them. This approval covers the exact authored lesson revision hash `c97510da1f3e5bdd6b9e11e8472636d7cf61d1e5f49bb3ab90723079acdf7591`. The `records-story` asset is marked approved; its media hashes and script are unchanged from the reviewed draft. The owner also authorized merging, production deployment, and publication of this lesson to the live pilot course. The technical release and live verification are recorded separately from this approval.
