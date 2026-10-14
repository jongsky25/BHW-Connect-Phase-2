# C1AF-22 implementation handoff — overall certificate and verification

## Bounded scope

This PR starts from `main` at `b130b308` (C1AF-21). It adds compatibility-aware, fixed-denominator progress for Chapters 1–3, including an explicit next step and historical overall awards. The owner can view and download an overall certificate with its pinned issuer/holder display, current status, program scope, and links to the three exact source records. The PDF includes the same status and source IDs at download time. The public verification page reads a separate, allowlisted RPC that returns only the certificate ID, program titles, issue date, issuer organization, three chapter keys, and current overall status. It excludes the holder, signatory, source IDs, evidence, catchment, and permissions.

The overall status continues to derive from the pinned chapter sources and rule. An explicit overall suspension survives restoration of a chapter source. Admins can suspend, restore, or terminally revoke an overall award through an audited RPC, but that mutation is separately disabled until an approved policy reference is installed. Certificate display is captured once at issuance; a missing historical display stays unavailable and reads never issue or repair an award. Chapter 1 permission remains independent of incomplete overall progress.

This migration installs no overall contract, enables no issuance or public disclosure, activates no lifecycle mutation, and creates no production Chapter 3 award. The issuer snapshot is contract configuration for a future reviewed rule. Synthetic Chapter 3 evidence appears only in local tests.

## Verification

The exact C1AF-21 and C1AF-22 migrations replay in isolated PGlite fixtures. Tests cover absent rule; compatible 2/3 and 3/3 progress; no issue on read; owner and foreign scope; gated public disclosure and its field allowlist; source suspension propagation; explicit overall suspension, permitted restoration, terminal revocation, and retained identity. PDF tests render English and Filipino with Unicode and long fields; route tests check private access, no recovery call, and missing snapshot behavior. Typecheck, lint, and production build are release gates. The PR CI must replay migrations against a disposable Supabase stack because local Docker image extraction exhausted workspace disk in the prior increment. No test writes to the pilot.

## Release boundary and next increment

After separate merge approval, follow `docs/deploy-runbook.md`: check pilot health and Disk IO, apply this one migration once, squash merge, and allow Vercel's Git integration to deploy `main`. Confirm public verification and overall lifecycle mutation controls are false, and the pilot's overall contracts, awards, and source rows remain empty. Recheck Chapter 1 simulation, global/cohort write and award gates, cutover, and component/request/attempt/review emptiness. Smoke login, protected qualifications, and the gated public verification page. Do not copy synthetic contracts or Chapter 3 evidence into production.

C1AF-23 is next: rehearse existing Chapter 2 and future Chapter 3 compatibility against the real schema, with an adapter checklist and chapter-specific prerequisites. It adds no new learner content or production activation.
