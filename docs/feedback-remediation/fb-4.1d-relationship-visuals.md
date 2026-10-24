# FB-4.1d — relationship, listening and contact visuals

The owner directed implementation, testing, merge and live publication of
useful visuals in Four working relationships, followed by review of the image
relevance concern in Following up constructively. Reports
`c3c1c66d-89fb-4da3-be22-c92084d8db63` and
`488a0652-6c4c-4769-98e6-60615ee76c7a` were checked read-only on 24 October
2026; both remain `new`. No replies or status changes were sent.

## Confirmed coverage gap and delivered behavior

Four working relationships currently uses revision
`84fce3ac-a37b-4834-9685-ce3797cf0781`, content hash
`628855b587d64b7d244dd668fd6a6d46bc321e8d68d90fb105f3f504fef53aae`.
Six Read sections have six corresponding Slides. Only the opening and shared
support positions reference the Malou courtyard image; the other four have
no artwork and no special built-in scene in the reader.

The four positions now receive native-text diagrams in both formats:

| Position | Visual and meaning |
| --- | --- |
| Four relationships, different purposes | Four equal role cards with decorative icons, the original purpose lines and approved Read limits. No reporting hierarchy or official four-level chain of command is drawn. |
| Listen before assuming | Two cards contrast what Malou knows with the venue, designated contact and resident preference still to clarify. |
| Choose a contact for the concern | Two parallel concern/contact rows pair the original health and venue summary lines, with the original role-verification question and organizational-example boundary. No universal clinical referral sequence is introduced. |
| Explain and apply the relationships | Four practice prompt cards from the existing Read exercise, without matching them to contacts or displaying an answer choice, key or rationale. Existing response/feedback gates remain. |

The role and contact diagrams reflow their existing summary lines rather than
repeating those lines as a second set of plain cards. The other positions retain
their original summaries. Read bodies, practice choices, feedback and takeaways
are not edited. The first/shared-support images and optional video remain.
Consequently every slide has either its existing scene image or a new diagram.

All words in the diagrams' purposes, limits and practice prompts are traced to
the approved Read/Slides in `relationship-learning-visuals.json`; only short
presentation headings are new. Diagram selection is bound to the exact lesson
key, full revision content hash and existing position IDs. Unknown lessons,
changed revisions and unsupported positions get no inferred diagram. The
graphics are code-authored HTML/SVG with native text, not AI-generated artwork
or real-person photographs. Existing theme tokens, responsive cards and
decorative, hidden-from-accessibility icons retain usable text alternatives.

Inline/fullscreen use the same reader article. No authored source, media,
narration, timing, revision, assessment, grade, completion rule, progress API or
database schema changes. The shared-reader edit has an exact successor receipt
that reconstructs the complete prior source for historical checks; older
approval hashes remain unchanged.

## Following up constructively — requested next review

The current revision `4c527b6f-4221-437b-adba-3198ca8d6eee`, hash
`d3bec3edf82478df960cd7eb2942d8c57ef3b525683514784edb7d91cad4413d`,
uses one Demi/colleague scene throughout six Read/Slides sections. The actual
image `demi-follow-up-d1babc774185.png` was inspected: two fictional people
prepare a blank card and notebook in a planning corner. That fits the opening
follow-up preparation and its current alt text; it does not establish that a
status is approved or show a real application/official record.

The same image does not depict the later A/B/C question comparison, the
before/after response distinction or the next-contact note. Those are concrete
opportunities for section-specific learning diagrams. The original report has
no identifying screenshot, so its precise historical mismatch is unconfirmed.
This review does not claim that replacing a compatible opening scene is needed
or that the image concern is resolved. No change to this lesson is included in
the present release; the report stays open for the next focused visual increment.

## Verification and release

Tests bind purposes/limits/prompts to approved Read/Slides and ensure the
practice visual contains no answer choices or feedback. Reader checks cover
all four new diagrams in both languages, Read/Slides and inline/fullscreen,
unchanged original scene positions, summary reflow without duplicate purpose
lines, hidden pre-response feedback, explicit completion after a response and
no read-only progress calls. Historical source and lesson 1.5.1 preservation
checks remain in use.

A dedicated disposable Chapter 1/module 1.5 browser fixture covers training and
assessor personal study in English/Filipino. It checks all four diagrams in
Read/Slides, role/practice card counts, no pre-answer key/rationale, normal
navigation, 320px/XL light/dark accessibility and native fullscreen. Reader-only
flags are snapshotted, temporarily disabled for the supported legacy pretest
fixture and restored in cleanup; other suites retain qualification/rollout
coverage. No write-based test runs against the pilot. The release PR records
full CI, merge SHA, exact production readiness and public smoke evidence.
Both reports remain open for live comments or the specific follow-up above.
Training owner remains Ray Justin Ventura.
