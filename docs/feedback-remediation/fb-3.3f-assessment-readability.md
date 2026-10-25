# FB-3.3f — assessment text and narrow-screen controls

The owner requested the fixes confirmed in the phone readability audit. Training
owner remains Ray Justin Ventura. Report `c0f4415f-25a6-41a7-830e-8102995fc081`
combines small assessment text, test length and language availability. This slice
addresses readability; FB-4.3 addressed language availability. Test length remains
open. No feedback reply/status update or user notification.

## Confirmed findings and changes

The audit used the actual components and application CSS with the production
assessment page spacing. It covered 96 combinations of English/Filipino,
pre/post forms, 320/360/390px, light/dark and all four supported text sizes.
Current approved v4 form text supplied the first question and the longest
question/choice cases in each form/language. Native size changes correctly
scaled text and preserved the selected answer.

At 320px XL the five-column review grid exceeded its container in eight cases.
The grid now fits as many minimum 2.75rem columns as its available width allows,
up to the existing ten-column capacity. Buttons fill their cells. Numbering,
answered status, review shortcuts, saved positions and submission guards remain.

The full font-size group exceeded its width in 44 cases, including Filipino at
320px default text. Quick display exceeded its width in 12 Filipino large/XL
cases, involving the long system-theme label. Shared segmented radio groups now
wrap, bound their width and retain a 2.75rem minimum target; selected options have
rounded corners on each row. Native radio semantics, keyboard selection,
accessible labels, disabled previews and the settings save hook are unchanged.
The quick size group intentionally retains its existing three options; XL is
still available in Settings.

Shared legacy exam question controls used 14px for both questions and choices.
They now match Chapter 1's default 20px question / 16px choice sizes. At XL they
become 25px / 20px. Relaxed line height and choice padding improve separation;
radio inputs cannot shrink alongside long text. The same renderer serves the
legacy BHW and assessor tests. A 14px font alone was not classified as a WCAG
violation; this is a supported readability improvement.

## Verification and release boundary

[Before/after evidence](fb-3.3f-readability-verification.json) records zero measured
question/choice, review, full font-control or quick-display overflow after the
fix in all 96 cases, eight clean targeted question-view axe scans and no browser
errors. English and Filipino mobile XL screenshots were visually inspected.

The new CI browser journey uses real components/CSS and local RPC fixtures in
32 combinations: both languages/forms/themes, 320/390px and default/XL. It
checks longest text, actual font sizes, native input widths, no page/panel
overflow, all 30 review buttons inside their grid with at least 44px targets,
retained selected answers, keyboard selection and disabled incomplete submission.
Font changes cannot call assessment RPCs. Four review/main axe scans cover mobile
XL. The isolated fixture refuses unhandled RPCs and never connects to Supabase.
Existing CI retains real disposable-database settings persistence and assessment
journeys. No new unit tests mirror CSS implementation.

The local audit uses a fallback browser font; it does not verify downloaded
production font files or authenticated pilot behavior. No assessment content,
question count, key, score, progression, saved history, schema, lesson/media or
shared-reader change. Full checks, merge and exact production commit/alias
verification are recorded in the release PR. Keep the mixed report open for its
remaining question-count concern and live review comments.
