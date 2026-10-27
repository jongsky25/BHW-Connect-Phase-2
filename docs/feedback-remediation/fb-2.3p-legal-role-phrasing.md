# FB-2.3p — legal-role Filipino phrasing

Read-only pilot review on 27 October 2026 checked two `new` reports from the assessor view of `bhw-legal-role` (`cf99b391-efbf-4efd-9588-59a7136567fc`). Neither has a screenshot or saved selected text. The currently published revision is `5f9cb97b-9e02-4da5-abf2-c0f0d1e8d303`, hash `7a4880da236ea31a78647bb447ba6ff66eb7be701eb442059c3fabf77eddc57e`, created 5 October. Both reports predate it and match the first or second paragraph of the older `a8a58fd3-77d7-48ad-9723-f7c0b5c4d3e2` revision.

| Feedback | Original and current evidence | Finding |
| --- | --- | --- |
| `01879e00-63ca-4e99-ae9e-63b318f8b65f` — “Mag mukhang Mataray” | The old `section-1` story and Slide narration say “baka mukhang mataray ako kung magtatanong ako tungkol sa pera.” The current first section instead uses Demi's uncertainty about training and accreditation; no “mataray” wording appears in its Read or Slides. | The criticized phrase was removed in the published rewrite. No further correction is justified without a current sentence or example. |
| `fb16d427-95a4-446f-baa5-2b11374e5ca5` — “Or ‘Boluntaryo’” | The old `section-2` second paragraph says “boluntir” in quotation marks. Current `section-2` says “Boluntaryo siyang nagbibigay ng primary health care services…” and its Slide display says “Boluntaryong primary health care sa komunidad.” The current text uses the suggested Filipino term and no longer uses “boluntir.” | The terminology request is satisfied in the published revision. Preserve the RA 7883 definition and do not rewrite it again from a historical selector. |

The older immutable revisions remain in the database as history. This review changes no lesson, media, narration, answer key, version pointer, progress or assessment record. The original reports remain `new` for authenticated pilot comments; no live feedback status or reply was changed. Public signed-out lesson smoke cannot verify an authenticated reader journey.

## Review receipt — 27 October 2026

[PR #412](https://github.com/jongsky25/BHW-Connect-Phase-2/pull/412) passed [CI run 40465834820](https://github.com/jongsky25/BHW-Connect-Phase-2/actions/runs/40465834820): the documentation change gate passed, with application checks and E2E skipped as expected. The Vercel PR check passed. The tracker retained 214 unique IDs and `git diff --check` passed. PR #412 merged at `5f2467ca`.

The docs-only merge did not replace the READY production app deployment `dpl_Gt5hrc1k61RvBFDmpzneMvsYQ5fN` (`4bc353016d3b645bf98dc31a119a019ecc87d21f`), which still owns `bhw-connect-phase-2.vercel.app`. Public smoke returned `/login` 200 and a signed-out legal-role lesson redirect to `/login` (307). A subsequent read-only pilot query confirmed published revision `5f9cb97b-9e02-4da5-abf2-c0f0d1e8d303` and both original reports still `new`.
