# Live feedback backlog reconciliation — 27 October 2026

On owner instruction, the 177 live reports then marked `new` or `in_review` were compared with their original messages, report-level review packets, released fixes and current pilot state. The exact ID-level decisions are in [the reconciliation map](backlog-reconciliation-2026-10-27.csv). This map records the prior tracker disposition as evidence history; its decision column is the result of this review. The older triage CSV's `live_status_at_snapshot` remains the 23 October baseline.

The canonical Vercel alias served READY app commit `64e314204bbd5b11b1ba08aabd8f13bc6c6721d0`. Subsequent merges to this point changed documentation only and were skipped by the ignored-build step. Read-only pilot checks found the `elearning`, `assessor_flow_ui` and `chapter1_assessment_v2` flags enabled, and `chapter1-feedback-needlestick-context-v8` active for new Chapter I assessment enrollments. Released versioned content and the accepted shared-reader behavior are documented in the linked FB delivery packets. This is deployed-state verification, not an authenticated production learner journey.

Exactly 90 reports were marked `resolved` because the report's specific current-flow concern is addressed by a released UI, published content or replacement assessment item. Historical pinned forms, attempts and grades were not altered. Another 32 were marked `dismissed`: the current wording or behavior was already supported, no current defect was found, or the requested sequence/length/access policy was explicitly declined under the pilot decisions. The original messages remain in Spot Feedback. A guarded transaction required all 122 exact IDs to be `new` or `in_review` with no subsequent reply, then updated only status, `resolved_at` and null `resolved_by` at `2026-10-27 23:56:41.372088+00`. No application administrator was impersonated; no reply or notification was sent. Post-write verification found all 122 target statuses as intended and all 55 retained IDs still open.

The live queue now has 214 total: **50 `new`, 5 `in_review`, 94 `resolved`, 65 `dismissed`**. The 55 remaining open reports fall into these work/evidence groups; being open does not by itself prove a current defect.

| Remaining group | Count | Why it stays open |
| --- | ---: | --- |
| Exact item or sentence needed | 17 | Broad assessment/translation comments or an unlocated historical phrase do not identify another safe current edit. |
| Assessment scope or policy | 8 | Multi-part length/context concerns and pretest answer-key requests are not fully covered by the released changes or retained scoring policy. |
| Partial wording | 7 | A reader explanation or nearby note helps, but the requested source wording or broader clarity concern may still remain. |
| Visual/readability scope | 8 | The released visual or reading aid does not establish that every requested illustration, story, character or presentation concern is covered. |
| Clarification separate from scored item | 4 | Live `/content-clarifications` explains the topic, but the reporter's historical question or intent was not recovered or edited. These remain `in_review`. |
| Offline/connection support | 2 | Connection recovery improved; an offline version and broader access constraints remain. |
| Training-flow or access policy | 2 | Group facilitation and assessor guide-access requests require more than the released navigation help. |
| Unidentified historical blocker | 2 | “Cannot proceed” reports name no lesson, prerequisite or screenshot. |
| Explicit owner deferral | 2 | Historical progress mismatch and separate plant-identification request remain deferred. |
| Private screenshot | 1 | The unclear Next-lesson report's image still requires authorized visual review. |
| Plant-aid operational approval | 1 | The pilot preview is live; local clinical/training approval and a consultation route remain. |
| Continuous Slides narration | 1 | Read can continue by opt-in; full Slides narration remains manual. |

The reconciliation deliberately retains multi-issue reports when one part is still unaddressed. It does not claim every original reporter saw the current build, that every historical symptom was reproduced, or that the remaining 55 all need code changes. The first practical follow-up is to select one of the 17 item-specific evidence gaps or a confirmed partial feature, obtain its exact current context through the pilot, and fix only a reproducible problem.
