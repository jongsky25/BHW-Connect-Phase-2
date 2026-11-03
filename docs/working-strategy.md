# Working strategy — mobile pilot development

Effective 3 November 2026. This is the current collaboration agreement; older
handoffs remain useful history. The user sets priorities and reviews the live
product. Agents own implementation, appropriate verification, integration and
clear reporting within the requested scope.

## Start a session

Read `AGENTS.md`, inspect the checkout and current task records, and identify the
smallest relevant handoff. Establish the task's outcome, affected areas and
completion checks from the request. Do not require the user to write a technical
brief. Run `npm run doctor -- --brief` when runtime access is relevant; it is not
needed for a documentation-only task. Never print secret values.

Use short progress updates with findings and the next action. Ask a question
only when its answer materially affects the work and cannot be recovered from
project context. Routine choices belong to the agent.

## Parallel work

Start with at most two independent development tasks and one coordinating
session. More concurrency is useful only when scopes, dependencies and resources
allow it. The coordinator can also implement a task when capacity permits.

Each worker needs its own branch and checkout/worktree. Separate chats are not
shared memory, and separate branches in one working directory are not isolation.
The coordinator assigns a stable task ID, scope, dependencies, branch, owner and
acceptance checks using `docs/work-register.md` and the parallel-development skill.
Workers put their results in task-specific handoffs, not competing edits to the
central register. Fetch shared changes before beginning or resuming work.

Good starting boundaries are a specific lesson/media package and an unrelated
application fix. Treat shared navigation, translations, loaders, schema, course
manifests and common components as dependencies even when the visible screens
differ. Name the files and data resources owned by each task before splitting it.

One coordinator integrates and releases. Only that coordinator applies pilot
migrations, loads shared live content, or changes shared flags during the batch.
If sessions cannot read shared remote records, do not pretend they are coordinated:
use one session until a common record is available. A Markdown table is a record,
not an atomic lock. Explicit assignment and acknowledgement establish ownership.

## Live review and release

The user's review destination is the live pilot. Do not create a review preview
site or block delivery on preview approval. Branches, PRs, local builds and
disposable test databases remain useful internal tools.

Use `docs/deploy-runbook.md` and the live-release skill. Run checks appropriate
to the change, combine ready work with current main, and release sequentially.
The existing code deployment path is merge to main → Vercel deployment. Course
content, publication state and generated media may need additional steps; verify
all required parts before saying the material is available.

The preference for live review is not a blanket instruction to enable unrelated
features, change award policy, remove access controls, or perform destructive data
operations. Preserve feature-specific scope and safeguards. Test automation stays
off the pilot. Ordinary live smoke checks use the established accounts and avoid
changing real learner progress. Document rollback or recovery before mutation.

Existing hosting settings may still generate automatic branch previews. They
are not part of the review workflow; this documentation change does not claim
to disable them in Vercel.

## One short completion message

Use only the lines relevant to the result:

> **Status:** Live and verified / Ready to release / Blocked / Repository-only change.
> **Review:** Direct live link and one or two actions to try on a phone.
> **Changed:** What the user will notice.
> **Checked:** Meaningful checks and any material limitation.
> **Next:** Only a real decision, blocker, or already agreed follow-up.

For repository-only changes, give the file/PR link instead of a live-site link.
State whether changes are local, pushed, or merged. Never imply that independent
future sessions can see an unpushed local edit.

## Records and upkeep

`docs/work-register.md` tracks coordinated tasks, not every historical commit.
Task-specific handoffs record scope, exact commit, checks, dependencies, live
changes, rollback and next action. The coordinator updates the shared register
at assignment, integration and release boundaries, bundling updates with the
work rather than producing a stream of bookkeeping-only pushes.

Use existing CI, loader scripts, feedback tools and Remotion skills first. Add
automation when a real repeated manual step justifies it; avoid another tracker
or plugin that the user must maintain from a phone. Do not install dependencies
or run the full app test suite for prose-only workflow changes.
