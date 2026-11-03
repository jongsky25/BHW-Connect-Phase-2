# BHW Connect Phase 2 — start here

This repository is the user's current system. Inspect the workspace and project
records before asking for its name, repository, URL, or setup again.

## Read order

1. `docs/working-strategy.md` — current collaboration agreement and mobile workflow.
2. `CLAUDE.md` — technical constraints, especially pilot database protection.
3. `docs/work-register.md` — coordinated work and release ownership.
4. The relevant feature/lesson handoff. `docs/session-handoff.md` is an index
   with historical context, not proof of today's deployment or access.

Read only the feature documents needed for the task. Inspect git status before
editing; preserve unrelated work. Verify current branch, tools and access rather
than treating a historical handoff's capability claims as current facts.

## Standing user preferences

- The user works on mobile. Complete authorized work, choose reasonable routine
  defaults, and keep updates short. Do not return executable chores to the user
  when the session can perform them.
- Review completed changes and materials on the **live pilot site**. Do not
  create or require a separate preview website for review.
- Continue using disposable local databases for development and automated tests.
  Live review does not authorize seeding the pilot or running E2E against it.
- Distinguish implemented, checked, deployed, content-published, and live-verified.
  Give a direct live link only when its target is known; never invent a URL.
- Ask only for materially missing decisions or authority, after inspecting
  available context. Batch questions and continue independent work.

## Project skills

- `.agents/skills/bhw-parallel-development/SKILL.md`: splitting or coordinating
  concurrent development sessions, branch ownership and integration handoffs.
- `.agents/skills/bhw-live-release/SKILL.md`: shipping a change or publishing
  materials for live pilot review, including mobile verification.
- Existing `.agents/skills/remotion-*/SKILL.md`: use relevant media skills for
  narration, captions, animation and rendering work.

Claude discovers the same project skills through `.claude/skills/` symlinks.
Use relevant platform skills supplied by the environment when needed. Project
skills do not grant tool access, synchronize separate chats, or override user
instructions and platform policies.

## Completion

Follow `docs/working-strategy.md`'s completion format. Keep the task's handoff
current. Only the coordinator edits the shared register during parallel work.
Do not mark work live merely because its branch builds or its PR merges.
