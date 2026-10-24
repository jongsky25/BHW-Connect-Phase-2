# FB-3.3a — mobile header and search

The owner directed review of all 11 FB-3.3 assignments, followed by a cohesive
fix, tests, merge and live publication. All 11 original messages, routes and
statuses were checked read-only against the pilot on 24 October 2026. Each is
still `new`; publication does not automatically close feedback.

## Review of the 11 assignments

| Report | Finding and disposition |
| --- | --- |
| `235690d2-36d3-4ced-b06c-7adddca964d3` | Mobile header/tabs alignment: delivered consistent control alignment and touch targets in this slice; keep open for live confirmation. |
| `8af22059-6f9f-4089-9c4a-55f2984f3654` | Compressed header, search and logo alignment: delivered icon-only mobile search, separated mobile control groups, flexible brand text and a search panel anchored to its trigger. Original private screenshot was not accessed; current source/layout evidence is used instead of claiming an exact screenshot match. |
| `de954595-e20f-4326-8b81-90410664521c` | Broad unfriendly-options/icons concern: header controls benefit from this slice, but the report names no particular lesson control. Retain for lesson-control review rather than claim complete resolution. |
| `da776b71-4996-4498-95f4-187052b280ed` | Emphasize lesson headings: next lesson-hierarchy slice. |
| `79778c0e-c6bb-45d9-a449-c3f9250e29e4` | Larger/bolder lesson titles: next lesson-hierarchy slice. |
| `2f1f2eca-6a10-4c5b-a8cd-775d88103a83` | More engaging font/background visuals: review with lesson hierarchy, preserving readability and contrast. |
| `40aa8a6e-5a25-44d8-9a54-20c0c3f25d2e` | Font, wordiness and illustrations: typography can be reviewed with hierarchy; content rewriting and illustration coverage also belong to FB-2/FB-4. No claim that header work solves them. |
| `45487cf0-a461-476b-a4ab-415d07c8110b` | Indicate chapter: inspect current lesson context labels in the next hierarchy/wayfinding slice. |
| `388f5589-510a-4c38-a78d-51f4316e8c95` | KB module numbering: verify the KB-to-course mapping before adding sequence labels; do not invent a chapter/module count. |
| `de0665b6-a86a-4c84-9237-8cfc8f3c7d02` | Show all destinations/choices: the existing drawer already enumerates role/flag-allowed destinations; review home-page descriptions separately before claiming the original request is met. |
| `465fa19e-06bc-4004-afaf-36581b308286` | Preferred greeting/name: separate preference increment; do not guess a given name by splitting stored full names. |

## Confirmed current gaps and delivered behavior

Search, notification and account triggers used different control heights.
The search button had only text padding; the notification link was sized by a
24px icon plus padding; the account button was sized by its 36px avatar. They
now have at least 44px touch targets at the standard text size and grow with
the existing display text setting. Desktop text navigation retains its design.

Mobile search now uses a recognizable magnifier with a translated accessible
name; the desktop retains its visible label. The phone header places search
on the left of the action row, with notifications and account together on the
right, aligned vertically. Branding remains visible and can wrap at narrow
widths with enlarged text instead of forcing controls out of bounds.

The old mobile search panel used a fixed `top-28`, unrelated to the actual
header/trigger height, and its small-tablet positioning used a fixed negative
left offset. It now anchors below the search button, bounds its width to the
viewport, limits its height and scrolls its contents. It includes an explicit
English/Filipino close control. Close and Escape restore focus to search;
using another control dismisses search while retaining that control's focus.
Existing suggestions, keyboard selection and full-results navigation remain.

No database migration, content/release edits, learning-policy changes, or
learner-record mutations are part of this increment. Navigation destinations
retain their existing role and feature-flag checks. The signed-out header keeps
its language control and does not expose signed-in search or feature links.

## Verification and release

Local offline Chromium inspection uses rendered header markup and the compiled
application stylesheet at 320, 390, 768 and 1280px in English/Filipino, normal
and XL text (16 combinations). This checks layout without connecting to the
pilot or claiming an authenticated production journey. Focus/dismissal unit
cases cover both languages, alongside the existing search-selection and
header/account/navigation cases.

A new disposable-backend browser journey verifies the actual signed-in header
at those widths/scales/languages, control bounds and targets, panel placement,
close/focus behavior and mobile course-menu access. It provisions its own
throwaway BHW and changes only that local account's language; stable fixture
preferences and pilot records are untouched. Existing light/dark header/drawer
accessibility tests remain part of CI. The PR records final tests, merge SHA,
production readiness and live route checks. Reports remain open for comments.
