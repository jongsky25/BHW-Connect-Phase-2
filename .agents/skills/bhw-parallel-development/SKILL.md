---
name: bhw-parallel-development
description: Coordinate concurrent BHW Connect Phase 2 development sessions with isolated checkouts, explicit task ownership, dependencies, and one integration and release coordinator.
---

# Parallel development

Read `AGENTS.md`, `docs/working-strategy.md`, `docs/work-register.md` and the
relevant feature handoffs. This skill defines coordination; it does not require
spawning agents or authorize deployment of unrelated work.

1. Inspect git status, branches/worktrees and, when available, current remote
   PRs. Reconcile existing work before assigning anything. Do not disturb a
   dirty checkout or force-reset another session's work.
2. Name one coordinator. Start with two independent worker tasks at most. Give
   each a stable ID, outcome, explicit owned files/data resources, exclusions,
   dependencies and acceptance checks. If they change a common contract, define
   that contract first or sequence the tasks.
3. Create a distinct checkout and branch for each worker from a known current
   main commit. A typical command is `git worktree add -b work/<task-id>
   ../bhw-<task-id> origin/main`, after fetching and checking that the branch and
   path are unused. Separate environments may use separate clones. Isolate dev
   ports and local database instances too; do not stop another worker's stack.
4. The coordinator records assignments in `docs/work-register.md` and makes
   them available through a shared remote branch/PR or supported agent channel.
   Workers acknowledge their assignments. A branch-local register alone is not
   visible to other chats. If shared access is unavailable, stay in one session
   rather than asking the mobile user to relay every status message.
5. Each worker implements only its scope and records results in
   `docs/work-items/<task-id>.md`. Share the exact commit, affected files, checks,
   deployment requirements and blockers. Workers must not independently load
   shared pilot content, apply migrations, alter live flags or release the batch.
6. Before integration, the coordinator reconciles changes against current main,
   resolves overlapping files explicitly, and checks combined behavior. Follow
   the existing one-PR-per-increment convention; no repeated main-merging churn.
   Run focused checks locally and required fresh CI for the final change.
7. Integrate and release sequentially with the live-release skill. Database
   migration timestamps/order and content loader targets need explicit review.
   Record who owns each pilot mutation and completion evidence before the next.
8. On pause or takeover, preserve the branch and handoff. Update ownership only
   after checking actual state and communicating the handoff. Do not delete a
   worktree with uncommitted or unintegrated work.

The user gets one consolidated mobile update from the coordinator, not a request
to manage merges or reconcile worker reports.
