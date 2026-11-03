---
name: bhw-live-release
description: Ship BHW Connect Phase 2 changes and training materials to the live pilot for mobile review, coordinating checks, content publication, deployment verification, and recovery.
---

# Live pilot release

Read `AGENTS.md`, `CLAUDE.md`, `docs/working-strategy.md`,
`docs/deploy-runbook.md` and the affected feature's handoff. Use the relevant
available Supabase, Vercel or Remotion skill when performing platform work.

1. Establish the authorized outcome and current release owner. Inspect current
   commit/PR, live deployment and relevant publication state. Verify the live URL
   from project/deployment records; do not ask the user to repeat known setup.
2. Identify all required delivery parts: app code, migration, content load,
   publication state, media and scoped flags. A successful app deployment alone
   does not prove a lesson's new content is published.
3. Run checks proportionate to the change. Code changes use relevant tests,
   lint/typecheck/build and required CI. Schema changes must replay against a
   disposable database. Content/media changes use their existing validation and
   release scripts and check source-to-render consistency. Documentation-only
   changes need reference and diff checks, not full app tests or deployment.
4. Prepare rollback/recovery appropriate to the change. Identify the previous
   working release and content version. Code rollback does not undo a migration
   or learner data write. Inspect loader dry runs before deliberate content loads.
5. Only the coordinator applies required pilot migrations once, at merge time,
   following the runbook's health checks. Do not run seeds, E2E, load tests or
   automated fixture creation against the pilot. Do not enable unrelated award,
   learner-write or feature gates as a shortcut to making a page visible.
6. Use the established PR/main deployment path and verify the exact deployment
   finishes. Carry out required content/media publication in its documented
   dependency order. Do not create or require a preview site for user review.
   Continue already authorized release work without adding a redundant approval
   step; ask only when genuinely missing scope/authority blocks an action.
7. Verify the live result at phone width and in the relevant role. Check the
   changed journey, navigation and both Filipino/English where affected. For
   media, confirm playback/captions and updated content-hashed assets. Use stable
   review accounts and avoid altering real learner progress. Run the runbook's
   small post-deploy smoke check and relevant error checks.
8. Record commit/deployment, publication evidence, checks, limitations and direct
   review URL in the task handoff. If authentication or tooling prevents a live
   check, say so; report deployed but unverified rather than claiming completion.
9. Send the concise completion format from `docs/working-strategy.md`: status,
   direct live link, one or two review actions, changed behavior and verification.
   Update the shared register only if this session is its coordinator.

Keep the skills as reusable instructions. They are not a background scheduler,
release lock, or permission to modify unrelated production resources.
