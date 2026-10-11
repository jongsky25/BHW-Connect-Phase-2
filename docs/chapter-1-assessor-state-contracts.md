# C1AF-03 — Draft catalog, registry and shared state contracts

Date: 10 October 2026. Dependencies: [flow contract](chapter-1-assessor-flow-contract.md) and [mapping audit](chapter-1-assessor-mapping-audit.md).
Status: local draft implementation complete. Semantic approval and registry activation remain blocked by the named review gates. No route, component, RPC or database consumes these new contracts yet.

## Delivered behavior

[flow-registry.ts](../src/lib/assessor/flow-registry.ts) supplies an authored catalog for Chapters 1–3. Chapter 1 has all 42 required lessons and a planned simulation prerequisite. Chapter 2 retains its 55-lesson inventory and existing exam/orientation baseline; its existing qualification implementation is unchanged. Chapter 3 has an explicit unavailable reason. All new combined-award requirements remain draft, with null approval decisions. The scenario version/checkpoint list remains unavailable until C1AF-06b supplies the reviewed exercise; these contracts do not manufacture a completion receipt.

The Chapter 1 registry consumes the C1AF-02 snapshot. It preserves 42 provisional criterion IDs across nine components, exact bilingual objectives/anchors, rubric source paths, LF-normalized fingerprints and explicit proposed legacy targets. Every criterion and component is unreviewed. Component criterion lists are proposed evidence groupings, not approved sufficiency rules. No local objective index is used to infer a module mapping. Repeated calls return isolated data so a caller's edits cannot approve or change the next read.

[flow.ts](../src/lib/assessor/flow.ts) provides these pure contracts:

| Function | Result and boundary |
| --- | --- |
| `chapterAvailability` | All requirement/review/publication blockers and missing content. Partial publication cannot reduce the authored denominator. |
| `assessorPreparation` | Preparation/lifecycle state, next action, all blockers and lesson counts. Revision-specific study, retained exam passes, current orientation passes and actor-bound ordered simulation receipts remain distinct prerequisites. |
| `chapterAwardValidity` | Missing, foreign, valid, suspended, revoked or update-required award. Exact actor/program-instance/chapter/version matching; no implicit version equivalence. |
| `assessorPermission` | Coarse permission/reason projection for private planning, candidate progress, staff issuance, official delivery, practice observation and formal claim/submission. Scope, assignment and learner readiness are independent from achievement. |
| `componentEvidence` | Unavailable, incomplete, needs practice or satisfied formal component. Each approved criterion needs version-matched, factual, sufficient formal evidence. Practice and history are not automatically reused. |
| `overallAwardReadiness` | Exactly three distinct valid compatible selected chapter awards, or explicit blockers. No reduced denominator, inferred conversion or added overall exam. |

An earned award remains visible during guidance replay or temporary missing publication; current official permission can still be denied. An account/preview restriction does not mutate its award. Suspension observed on submission denies the action even if a form opened while eligible. Suspended staff can continue allowed personal preparation without self-restoring their certificate.

Evidence sufficiency remains separate from performance. Missing/interrupted observations do not become `hindi_pa`. A single complete lesson observation cannot satisfy a component with other required criteria. The component resolver expects one selected current formal observation per criterion; ambiguous selections are rejected rather than silently choosing a latest/pass result. Linked attempt selection and any reviewed evidence-reuse policy belong to later assessment increments.

## Trusted-adapter and integration boundary

These functions are projections of trusted records, not security boundaries. A browser must never supply approval decisions, identity, a scope boolean, a scored pass or `serverValidated: true` to grant itself authority. The simulation receipt type identifies its authenticated owner, program instance, chapter, requirements version and ordered scenario checkpoints; C1AF-06b/07 must implement actual persistence and server validation. This increment neither authenticates receipts nor issues certificates.

Future server adapters must derive the actor from the authenticated account, load scoped records and validate publication/revision identity before creating this context. Orientation attempts must carry their own version. The permission projection is deliberately coarse: it does not prove attendance membership, session ownership, complete chapter-review evidence or transaction-level assignment. Later write RPCs must independently enforce those action-specific conditions, concurrency and persisted authority cutover. `issue_staff_award` allowing an already-valid award means idempotent retrieval/recovery, never a second award or status restoration.

Keep the audit-backed registry module out of client bundles. UI components should receive concise state summaries and needed display data from a server adapter. The existing `curriculum.ts`, `readiness.ts`, `learning.ts`, Chapter 2 pages and qualification RPCs are untouched. New code grants no current production authority.

Approval of a mapping must explicitly provide the accepted canonical criterion/version, exact sources, approving decision, sufficiency rule and historical-evidence policy. Do not mark the draft registry approved or repin old hashes to unblock a screen. Remaining review gates R01–R07 are in the original contract.

## Verification

Focused tests cover the three-chapter catalog, provisional provenance, mutable-data isolation, partial/ambiguous publication, lesson revisions, failed retries, each preparation stage, foreign owners/instances/chapters/versions, scoring safety/version, forged/out-of-order simulation receipts, certificate replay/lifecycle, actor/preview/scope/assignment restrictions, missing/practice/foreign formal evidence and distinct compatible overall source awards.

```sh
npx vitest run src/lib/assessor/flow.test.ts src/lib/assessor/readiness.test.ts src/lib/assessor/curriculum.test.ts src/lib/assessor/learning.test.ts scripts/tests/chapter1-assessor-audit.test.mjs scripts/tests/assessor-curriculum.test.mjs
npm run typecheck
npm run lint
node scripts/assessor-check.mjs
```

Local results:

| Check | Result |
| --- | --- |
| Focused tests above | 130 passed across six files, including existing preparation/study/curriculum helpers. Final rerun passed after receipt binding and replay refinements. |
| `npm run typecheck` | Passed on the final code. |
| `npm run lint` | Passed with the same three existing unused-variable warnings; focused lint of the final new modules/tests also passed. |
| `node scripts/assessor-check.mjs` | Passed; existing Chapter 1/2 review blockers remain intact. |
| Document links, new-file whitespace and `git diff --check` | Passed. |
| Broad `npm run test` | Not passed. The bounded run reported lesson-144/145 preservation and reference-narration failures, then reached the 120-second limit (exit 124). Existing Chapter 2 suites also reported skipped checks. No full-suite success is claimed. |

The prior increment documented the Git subprocess permission failure and twelve stale `problem-prioritize` narration entries in unchanged inputs. This increment does not modify those tests or regenerate curriculum/media to suppress failures. Broader repository checks remain a merge-verification limitation.

No UI/browser walkthrough, migration replay, build or CI result is claimed: this increment is isolated pure code without runtime integration.

## Next increment: C1AF-03b

Implement default-off controls for the revised UI, official evidence/assessment writes and new award issuance using existing repository flag conventions. Treat persistent authority cutover separately from UI visibility; hiding the new UI must not reopen a legacy write bypass. Prove disabled-state behavior and admin-preview denial. Do not connect the new resolvers to live issuance or assessment while approval decisions remain null.

Before briefing UI in C1AF-04, establish the trusted adapter and safe preview behavior under those controls. C1AF-03's semantic activation remains conditional on concrete subchapter reviews; isolated briefing/navigation work can proceed without pretending those reviews are complete.

Rollback: remove these additive modules/tests and this handoff. No persisted data, runtime flag, award or content publication needs reversal.
