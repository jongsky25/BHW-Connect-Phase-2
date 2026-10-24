# FB-3.3b — visible lesson hierarchy and chapter context

The owner directed implementation, testing, merge and live publication of the
next heading/wayfinding slice. The four relevant original reports were checked
read-only against the pilot on 24 October 2026; all remain `new`.

| Report | Scope and disposition |
| --- | --- |
| `da776b71-4996-4498-95f4-187052b280ed` | Emphasize lesson titles: stronger bold page headings inside a lightly tinted, bordered context block; the reader's existing lesson label also gains emphasis. |
| `79778c0e-c6bb-45d9-a449-c3f9250e29e4` | Larger/bolder lesson titles: consistent responsive page-title styling and a larger reader label, preserving the user's text-size setting. |
| `45487cf0-a461-476b-a4ab-415d07c8110b` | Indicate the chapter: visible chapter number/title and subchapter links immediately above the page title, independent of breadcrumb scrolling. |
| `2f1f2eca-6a10-4c5b-a8cd-775d88103a83` | Font/background suggestion: the heading treatment addresses part of the visual hierarchy concern; illustration coverage and the broader lesson visual design remain separate. |

## Current evidence and implementation

Existing route H1s were already semibold; this was not a missing-heading bug.
The general training route included chapter numbering in its horizontally
scrolling breadcrumb. Assessor personal study used the chapter's title in that
breadcrumb without an explicit numeric label. Neither supplied a consistently
visible chapter/subchapter block at a lesson's title. The shared reader repeated
the lesson title and position in an unstyled paragraph.

A shared server component now presents chapter number/title and subchapter
context on lesson and subchapter pages in both general training and assessor
personal study. Chapter numbers come from the delivery chapter's stored
zero-based position, as in the existing chapter catalog. The assessor query now
selects that existing position field. Titles come from the current localized
published chapter/module/lesson metadata. The new component fetches nothing.
It preserves one H1, displays the full title with wrapping, and uses existing
light/dark color tokens and a restrained border/tint. Links return to the
appropriate general or personal-study outline. Breadcrumbs remain available.
The reader's existing position/title label receives a larger semibold style.
No new lesson sequence or denominator is introduced: existing reader numbering
continues to use its current route scope.

This is presentation and navigation context only. Lesson body, slides,
illustrations, narration, published revisions, assessment forms/keys,
prerequisites, progress and qualification rules are unchanged. No migration,
pilot fixture, learner-record update or feedback closure is part of the slice.
The KB module-numbering report and preferred-greeting request remain separate.

## Verification and release

Four route regression cases cover English/Filipino context, actual outline
links and a single H1 for BHW and assessor study. Existing route cases retain
coverage for role/preview gates, prerequisite checks, facilitator views,
progress and lesson navigation. The PR records focused and full CI results.

A browser case provisions a fictional Chapter 2 lesson in the disposable local
CI database, with explicit localhost/port checks around every SQL call. It
opens both general facilitator reading and assessor personal study, verifies
Chapter 2 and route-specific links, and checks long titles at 320/390/768px,
normal/XL text, English/Filipino and light/dark themes. It also runs axe on the
new context block. Temporary account preferences and a local legacy pretest
fixture stay in that isolated database. Fixture cleanup is transactional and
restores the temporarily disabled revision-immutability trigger before commit.
No write-based tests run against the pilot. Exact merge/deployment and public
login-gate verification are recorded in the PR; signed-in CI evidence is not
represented as an authenticated production-browser check.

All linked reports remain open for live review. Broader visual/illustration
requests are not claimed as fully delivered by this heading slice.
