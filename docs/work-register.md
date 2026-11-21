# Coordinated work register

The coordinating session owns this file during a parallel batch. Workers own
their task-specific handoffs. Read `working-strategy.md` before assigning work.
This file does not automatically synchronize chats or lock remote resources.

## Current batch

No parallel development batch has been assigned by this workflow setup. This
does not assert that the repository has no other branches, PRs or active sessions;
the next coordinator must reconcile those before assigning work.

| ID | Outcome / owned area | Owner | Branch / PR | Dependencies | State | Evidence / next action |
|---|---|---|---|---|---|---|
| — | No tasks assigned | — | — | — | — | Coordinator establishes the next batch from the user's priority |

Release coordinator: unassigned. Pilot mutation owner: unassigned. Workers
must not infer permission to deploy from either field being empty.

States: queued → building → ready to integrate → ready to release → live →
reviewed. Use blocked when a named dependency prevents progress. Repository-only
tasks finish as integrated; they do not need a live deployment. Record the
actual deployment/content evidence before moving a product task to live.

## Task handoff template

Create `docs/work-items/<task-id>.md` when a task is assigned:

```markdown
# <task-id> — <outcome>
Owner/session:
Branch and checkout:
Base commit:
Scope and owned files/data resources:
Dependencies and shared-file owner:
Acceptance checks:
Status and last updated (UTC):

## Delivery
Commit / PR:
Checks run and results:
Migration, content load, media or flag steps:
Live deployment / publication evidence and direct review URL:
Rollback / data recovery:
Blockers and next action:
```

Keep credentials and personal learner information out of these records. A new
session taking over must check actual git/PR/deployment state and acknowledge the
handoff; an old timestamp alone is not permission to take another task's scope.

## Next enhancement sequence — Chapter 1 first

The [C1-PE phased plan](work-items/chapter1-pilot-enhancements-2026-11-20.md)
records the owner's November pilot scope and the next-session entry point.
Planning branch: `plan/chapter1-pilot-enhancements-2026-11-20`.
Status: C1-PE-0 effective loader/publication parity verified (42/42), with local
recovery tests passed. C1-PE-1 reference reading implemented for all 42 lessons.
PR #515 merged/deployed at main `202eb69b`; authenticated usability unverified.
PR #516 reading support merged/deployed at main `9153a983`; required CI passed,
including 119 browser tests. Authenticated participant usability remains unverified.
PR #517 simulation guidance merged/deployed at main `7cd1e1ca`; required CI and
post-merge main CI passed, including 120 browser tests. Signed-in live usability
remains unverified.
PR #518 review explanations/manual reading merged/deployed at main `0cf15e8d`.
Required CI passed (2,738 unit tests; 121 browser tests), as did post-merge main CI.
RPC migration applied once; see PR #518 for exact receipts. Signed-in usability
remains unverified; disclosure/retake policy was preserved.
PR #519 monitoring merged/deployed at main `0f8e94ea`; required CI passed
(2,746 unit tests, 122 browser tests), as did post-merge main CI. RPC migration
applied once; exact receipts are in PR #519. Signed-in usability remains unverified.
Current increment: [C1-PE-5 connection recovery and practice](work-items/c1-pe-5.md),
branch `feat/c1-pe-5-connection-practice`. Owner/release coordinator: current Codex
session; no parallel batch. Scope: confirmed simulation leave/recovery gaps,
guided assessor exercises, and disposable connectivity checks. Application-only;
no migration, content load, live flags or learner data mutation. Check its PR
release receipt before treating it as deployed.
All phases apply to Chapter 1 before expansion; Waray and TESDA alignment are
excluded. Consult remote PR state before resuming an unmerged planning branch.
