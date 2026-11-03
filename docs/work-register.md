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
