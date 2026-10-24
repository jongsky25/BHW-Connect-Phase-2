# FB-3.3e — reading tools, spacing and visible zoom labels

The owner directed a focused lesson-control/readability improvement, testing,
merge and live publication. The three remaining FB-3.3 reports were checked
read-only against the pilot; all remain `new`.

| Report | Evidence and disposition |
| --- | --- |
| `de954595-e20f-4326-8b81-90410664521c` | Broad unfriendly-options/icons concern, with no exact control named. The lesson now offers bilingual control help, visibly named full-screen zoom actions and Fit to screen. This is a bounded usability improvement, not proof of the original ambiguous symptom's full resolution. |
| `2f1f2eca-6a10-4c5b-a8cd-775d88103a83` | Font/background engagement suggestion. The reported current BHW/HEPO lesson already has four assets and five Read sections. Existing heading emphasis is retained; regular Read pages gain a comfortable column/spacing option. Authored illustrated layouts remain intact. |
| `40aa8a6e-5a25-44d8-9a54-20c0c3f25d2e` | Wordiness/font/illustrations on a subchapter competency page. New lesson reading tools help when opening a lesson, but subchapter prose and illustration coverage remain separately scoped to FB-4.1/content review. No claim that this slice rewrites that pane. |

The lesson in the vague control report is currently As a Community Organizer,
with three assets and six Read sections. Existing assets and visible text labels
mean these historical reports do not justify replacing illustrations or adding
another independent reader. The current full-screen fitting toolbar did show
bare minus/plus symbols, despite having accessible labels; its Fit label also
left the action unexplained to sighted users.

## Delivered behavior

ManualLesson, used by BHW/general training reading and assessor personal study,
now wraps its existing reader in a small bilingual Reading tools panel. A
Comfortable/Standard toggle changes only local presentation on the current
page. Comfortable is the initial layout; Standard restores the original inline
Read width/spacing. A collapsed guide explains the existing Read/Slides,
Full screen/Close, orientation and Previous/Next/completion controls using their
actual labels. No new completion action or simulated progress is introduced.

A CSS module targets only regular inline Read articles that are direct children
of the reader's root section, explicitly excluding illustrated story articles.
Comfortable caps the column at 68ch, increases paragraph line height/spacing and
adds a restrained leading border using existing theme tokens. It preserves
font-size settings and the supported relaxed line height. No text is removed,
condensed, re-ordered or hidden. Slides, illustrated story layouts and the
full-screen fitted reader stay outside the selector. The panel explains this
scope so a layout choice is understandable on an illustrated page.

The full-screen fitting toolbar now displays Zoom out/Zoom in next to the
decorative minus/plus, and Fit to screen (Filipino: Liitan/Lakihan/I-akma sa
screen). The toolbar wraps and buttons have at least standard 44px targets.
Existing zoom range, step, fit/scroll reset and viewport measurement are retained.
The protected reference-lessons source is unchanged, as are lesson revisions,
text, media, narration timing, assessment gates, grading and progress RPCs.
No migration or pilot record update is part of this slice.

The wrapper keeps the same reader child identity while changing layout; toggling
or opening help does not remount/reset answers or invoke resume/completion APIs.
Layout choice is page-local, not an account/display preference or course grade.

## Verification and release

Focused tests cover bilingual layout/help, preserving a child answer through
layout changes, unchanged BHW/assessor/read-only/error persistence paths and no
RPC/refresh from the new controls. Existing fullscreen tests retain their zoom,
fit and story-layout checks with the new explicit Fit to screen label. Selected
historical preservation suites verify that their pinned reader source remains
unchanged.

The existing disposable Chapter 2 browser journey is extended for both training
reading and assessor study in English/Filipino. It measures comfortable versus
standard widths and unchanged article text, scans headings/tools in light/dark
themes and normal/XL text at 320/390/768px, opens the real fullscreen reader,
checks its unmodified article width rule and labeled wrapping zoom toolbar,
exercises zoom and fit reset, and confirms Slides remains outside the new CSS.
It retains the local-only fixture guard and transactional cleanup. No write-based
pilot browser test runs. The PR records full CI and exact merge/production
verification; all three reports remain open for live comments or their separate
content/illustration review.
