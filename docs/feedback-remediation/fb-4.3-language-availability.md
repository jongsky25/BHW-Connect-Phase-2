# FB-4.3 — language availability

Training owner: Ray Justin Ventura. This increment addresses language reports
`51e38cc3-d694-4cae-9715-b7e570fb52f9` and
`f3f4bfe3-3367-4c98-8f4e-11df358a750e`, and only the mother-tongue portion of
`c0f4415f-25a6-41a7-830e-8102995fc081`. Its font-size and question-count concerns
remain open. Feedback statuses and replies are unchanged.

## Evidence and behavior

Read-only pilot audit on 25 October 2026 confirmed that assessor study omitted
the shared reader's translations property. All 20 existing Cebuano/Hiligaynon
packages for ten lessons are approved and match the complete published source
signature. The general training route already passed these packages. Assessor
study now uses the same catalogue and exact-version/review guards.

Both routes display an explicit language panel. Available approved languages can
be selected in Read, Slides and fullscreen; returning to the base app language
works. English/Filipino remain selectable through Settings. Lessons without an
approved matching translation show the languages awaiting review, without fake
options. Existing staff draft previews remain labelled as drafts.

The ten covered lesson keys are bhw-roles-hepo, bhw-health-educator,
bhw-community-organizer, bhw-service-provider, bhw-records,
bhw-roles-application, uhc-coverage, uhc-primary-care, uhc-local-system and
uhc-improvement. See [coverage evidence](fb-4.3-language-coverage.json).

Formal chapter assessments support English and Filipino. Their entry screens now
say so explicitly and link to Settings before an attempt starts. Cebuano and
Hiligaynon chapter-assessment translations are unavailable; selecting a lesson
translation does not translate assessment questions. Active attempts, question
DTOs, scoring, answer keys, progression and completion gates are unchanged.
No teaching, translation, narration or media bytes were rewritten.

## Verification and boundary

The [public media audit](fb-4.3-media-audit.json) verifies all 176 unique assets
with HTTP 200, expected content type and exact SHA-256. These include 116 section
recordings, 20 videos, 20 captions and 20 posters. Local checks bind recordings
to translated words and the packages to current source. The complete previous
reader is reconstructed through five exact replacement groups; historical
content/media preservation remains enforced.

Component tests exercise approved and missing/stale/draft language paths, both
base languages, both reading formats, inline/fullscreen selection, original
self-checks and unchanged assessment start/resume behavior. Route tests verify
published assessor-study catalogue loading. Two disposable-local browser cases
cover translated HEPO and untranslated Define the problem through both training
routes, actual audio/video playback, captions, fullscreen switching and formal
assessment entry. Fixture writes refuse non-local databases before account
creation; no pilot write tests are used.

Offline actual-reader/application-CSS review passed 16 combinations of two
lessons, English/Filipino, light/dark and 320/1280px at XL text. It verified real
recording playback, native fullscreen switching and base-language return.
Language/assessment panels had zero axe violations and no horizontal overflow;
fullscreen dialog overflow was checked on the translated lesson. Mobile Filipino
dark fullscreen was visually inspected. Framework navigation/image components
were shimmed; local media implements HTTP ranges. These are not authenticated
production tests. Final CI and exact production commit/alias evidence belong in
the release PR. Keep reports open for live review comments.
