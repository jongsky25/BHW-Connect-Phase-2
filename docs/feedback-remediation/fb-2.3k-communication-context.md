# FB-2.3k — Communication heading and Rosario context

Read-only pilot review on 27 October 2026 mapped two `new` reports to published Chapter I lesson `communication-clarify` (`aaa79e45-599a-44c8-b1ed-c0b6e1e13293`, revision `ea4bd53f-4833-4869-900a-27ff7d8db50c`, hash `26c6c781e7c76dfd4a911d20eafe49ff65d4e252224f8bcbf2544373ab4eaefe`). Both reports point to the same lesson and generic heading selector; neither has a screenshot. The exact quoted text identifies the relevant sections more reliably than the selector.

| Feedback | Finding | Change |
| --- | --- | --- |
| `b54209d3-cfd6-471d-94c5-2421698a7cc1` | The published Filipino `open-question` heading and matching Slide say “Bukas muna, saka linawin.” The report proposes “Maging bukas muna, hanapin ang linaw.” The published body explains an open invitation, but the short heading can also read as “tomorrow first.” | A bilingual note beside Read and Slides uses the proposed phrase and explains the sequence: invite the resident's own story, then clarify one detail. It distinguishes being open from tomorrow. |
| `db2c2cd7-9d9c-4be3-8c15-60c89d692bd8` | The `barriers` paragraph and Slides narration refer to Rosario in Module 7 before introducing her. Module 7's published `problem-causes` case explains that Rosario is a child in a historical ZFF case, with interacting poverty, misinformation and service gaps. The current Module 6 sentence assumes that context. | A bilingual note before the section previews who Rosario is and why the case is mentioned, while pointing learners to the fuller Module 7 story. It gives no clinical advice or invented case details. |

The notes require the exact published lesson hash, section ID and original heading or Rosario phrase. They appear in both languages and both lesson views. They do not rewrite immutable lesson text, narration, checks, assessment answers, enrollment pins, saved results or historical attempts. This is a contextual improvement, not a claim that the original heading or audio was re-recorded. Keep both reports open for authenticated pilot review; no live feedback status or reply was changed.

## Release receipt — 27 October 2026

[PR #401](https://github.com/jongsky25/BHW-Connect-Phase-2/pull/401) passed [CI run 40446934486](https://github.com/jongsky25/BHW-Connect-Phase-2/actions/runs/40446934486): repository checks and the disposable-Supabase browser suite. Local focused tests (14), full Vitest (314 files, 2,636 tests), typecheck, lint (zero errors, four existing warnings) and diff check passed. PR #401 merged at `583b2b4cc5fc3c07eda2dd71fdc06c89e980e069`.

Vercel production deployment `dpl_GRiy4i1LY1waGh7fiESzEyGnaK5E` is READY for that exact commit and owns `bhw-connect-phase-2.vercel.app`. Public smoke returned `/login` 200, `/sw.js` 200 and a signed-out lesson redirect to `/login` (307). This is not an authenticated production lesson observation. A subsequent read-only pilot query confirmed both original feedback statuses remain `new`.
