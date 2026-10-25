# FB-4.1j — make Define the problem visibly text-bearing

Owner marked the Choose a safe change / Resource audit image checks done and
asked to proceed. This increment addresses the remaining presentation report
`243eed1e-025b-4413-baac-24176b4b6f20`: Slides appeared to be a picture rather
than a presentation with text. No screenshot accompanies the report. Training
owner remains Ray Justin Ventura. No feedback reply/status writes.

## Current evidence

Read-only metadata on 25 October 2026 confirms `problem-define`, lesson UUID
`cc8eee94-60a5-41b3-8a47-c6ae92903c07`, published revision
`0c0be4fe-b722-4119-87d0-808ba541cffd`, full content hash
`46822552eb9ec70ec86720a95715455a123c07cfbfd531f39a0354cface6fc99`.
Six authored slides already have concise summary text and distinct scene images.
The current renderer places a full-width image before the text, so a tall image
can dominate the viewport and put the summary below it. This supports improving
text visibility; it does not establish that current Slides has no text or
reproduce the exact historical reporter session.

Actual-reader review also found a current mobile defect on the Filipino practice
slide: the slash-separated phrase `pangyayari/pinagmulan/kulang` overflows its
caption and summary at 320px/XL. Wrapping is required without changing the text.

## Delivered behavior

The six exact reviewed static scene assets now have bounded display height and
object-contain sizing. The whole image remains visible without cropping; it no
longer consumes the width-proportional height of a large original PNG. This
asset presentation applies in both Read and Slides. Other static images and
videos keep their existing presentation unless already independently compact.
Asset replacement is not performed; IDs, paths, full media hashes and approval
status scope the sizing to these six scenes.

Slides has a visible bilingual Slide N of 6 marker. The first slide explains
Previous/Next, Full screen and Read's full explanation. The final slide asks for
a response before the existing summary/feedback is revealed; it gives no answer
choice, key or rationale. Read receives no slide guide. Selection requires the
exact lesson key/hash, recognized existing slide ID and six-position count.

The existing captions and original text summaries remain intact and become
visible alongside the smaller illustrations. Text in this lesson's article now
wraps long tokens, fixing the Filipino practice caption/summary overflow. This
rule is scoped by the existing lesson attribute and also protects the same text
in Read. No new teaching facts, source paraphrase, legal/clinical claims,
assessment changes, narration edits, progress writes or completion rules.
The optional story and original AI provenance labels remain.

The entire shared reader stays byte for byte unchanged from merge
`283e49e29e8d34d570b9c9d0d4549f4d4d509911`; existing visual routing delegates
to a small guide component. No new historical preservation exception, receipt
edit, authored source/media publication, migration or pilot mutation.

## Verification and review boundary

Source checks bind all six slide IDs and image identities to approved source and
retain the full shared reader plus authored lesson/media bytes. Reader tests
cover all six positions in English/Filipino, Read/Slides and inline/fullscreen,
original text summaries and bounded images, guide only in Slides, hidden
pre-response feedback, original choices, explicit completion, read-only callbacks
and refusal on lesson/revision/asset drift. Historical lesson 1.7.1 checks remain.

Offline browser review builds the actual shared reader and application CSS with
local public images and framework navigation/image shims. It checks all six
slides in both languages, light/dark themes and 320/1280px XL, actual loaded image
heights, original text summary presence, horizontal overflow and guide-region
accessibility. This scopes accessibility claims to the new guide, not all legacy
controls. The overflowing Filipino practice case is included. Screenshots are
inspected. All 48 combinations passed with loaded, bounded images, original
summary content, no horizontal overflow and no guide-region axe violations.

A disposable Chapter 1/module 1.7 browser fixture covers general training and
assessor study, six numbered slides, loaded images and computed bounds, original
summary text, mobile wrapping, first Read audio, same-position format switching,
light/dark guide accessibility, native fullscreen and original final check gates.
It refuses pilot URLs and restores temporary legacy fixture flags. No
write-based test runs against the pilot. Authenticated production access is
unavailable; authenticated flows run in disposable CI. The release PR records
final counts, exact deployment identity, public routes/media and read-only runtime
binding checks. Keep the original report open for live comments or the
historical-session boundary above.
