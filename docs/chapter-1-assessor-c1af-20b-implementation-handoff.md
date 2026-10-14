# C1AF-20b implementation handoff — simulation parity

## Scope

This PR starts from C1AF-20 on `main` (`6accbb32`). It aligns the eleven fictional Maria checkpoints with the delivered Chapter 1 working flow. `chapter1Terms` is now the bilingual source for the real guide, observation, request, formal attempt, review and workspace labels displayed by the simulator. Both the saved runner and the local review storyboard show the matching surface, controls and record boundary at each checkpoint. The saved runner offers an explicit route to the real working area after its server receipt; the real page still checks current actor, scope and authority.

The server scenario remains `1.0.0`, with eleven checkpoint versions `1`. The underlying facts, correct choices, scoring, actor-bound receipt, and request protocol are unchanged. This is a presentation parity revision, not approval of a new decision rule. The old 06a local storyboard retains its `0.1.0-draft` authored source identifier. No migration, flag, content publication, contract approval, award conversion or cohort cutover is included.

## Checkpoint replay against delivered flow

| Checkpoint | Delivered surface and parity decision |
| --- | --- |
| `find-maria` | Chapter 1 working area: scoped roster and selected learner; the simulator opens only fictional Maria. |
| `prepare` | Published lesson: Prepare → Show BHW presentation → Prepare. The resident correction stays on the private role card. |
| `brief` | Run guide: a supported practice briefing, with no formal pass from participation. |
| `observe` | Observe a BHW: exact facts, prompt, sufficiency, rubric rating and private notes. Fictional checkboxes acknowledge supplied facts and never become an actual observation. |
| `feedback` | Private assessor notes, BHW feedback and next step remain distinct. The real release control is deliberate; the simulation sends nothing. |
| `missing` | Interrupted evidence remains unrated and gets a next observation action. |
| `readiness` | Workspace readiness checks learner prerequisites separately from assessor authority; a historical certificate alone is insufficient. |
| `arrange` | Request assessment → claim → save arrangement → explicit Start formal assessment; writes recheck current authority. |
| `formal` | Formal editor: fresh evidence, Save draft, review, Submit formal assessment; practice ratings are reference only. |
| `chapter-gap` | Final Chapter 1 review leaves missing 1.9 evidence pending and requires each approved component. |
| `final-review` | Real release is a server decision after rechecking all components. The separate Maria SAMPLE has no verification code, signature or QR. |

No production mutation component is mounted inside the simulator: those components own live Supabase RPCs and learner IDs. Sharing their presentation terms and exposing the real sequence keeps the training faithful without allowing fictional choices to call learner writes. The simulation runner still calls only its state and action RPCs. Saved status recovery retains unsaved local evidence; loss of authority is rechecked by the server on the next action. The real workspace transition is a normal protected route, never a transfer of fictional state.

## Verification and release boundary

Focused tests check all eleven adapters, bilingual labels, the receipt-only real-workspace link and unchanged simulation RPC behavior. The local storyboard browser walkthrough checks eleven scenes in both languages at phone/desktop widths and light/dark themes, with keyboard and accessibility checks. Disposable Supabase E2E now snapshots practice, requests, formal attempts, chapter reviews, assessments, certificates and notifications before and after simulation, in addition to candidate prerequisite records. The existing combined-award E2E proves a real authenticated candidate can complete simulation, receive one reviewed staff award under a **local synthetic approved contract**, then explicitly enter the real working area. The C1AF-19 database test separately proves the seeded BHW request → formal assessment → chapter review and single certificate path. These fixtures use synthetic approvals because the live Chapter 1 registry has no approved component mapping.

At approved merge, follow `docs/deploy-runbook.md`. This PR has no migration. Verify the production simulation remains unavailable while its control is off, the normal login/protected routes work, and the pilot's component registry and request/attempt/review tables stay empty. The global and cohort write gates and authority cutover remain off. Real staff and BHW end-to-end pilot activation still requires reviewed mappings/source revisions/rubric anchors, BHW test-release comparability, a further-practice record rule, and the direct legacy RPC exercise recorded in the C1AF-20 handoff. C1AF-21 is next: versioned overall three-chapter award eligibility and issuance.
