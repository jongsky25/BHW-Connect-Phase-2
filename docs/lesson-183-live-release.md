# Lesson 1.8.3 owner-authorized release

On 10 October 2026 the owner instructed: **“approved. merge and deploy”**.
This authorizes PR #278 and only the `safety-prepare` lesson reviewed at
`3696d2fd89b5f9525e7f754945f9fa99bcf0d26c`.

The complete reviewed package is [run 37911676494, artifact 11607316897](https://github.com/jongsky25/BHW-Connect-Phase-2/actions/runs/37911676494/artifacts/11607316897).
The archive SHA-256 is `2b40a00198f416102778dfd0b8d5bc0a3bc99a7d120c1004db50b8d6df31705e`;
the inner review ZIP SHA-256 is `795ca36fe03b29c736cc62e2a865fbe6a3f3d1370e493c567623546bba20964e`.

`lesson-183-owner-approval.json` binds the exact seven target sources and 24
selected public media files. The only target lesson content change since review
is promotion of seven asset `review_status` values from draft to approved.
Human listening and clinical/local procedure review remain separate, pending
states; this owner authorization does not supply or invent those signoffs.

Main subsequently released 1.8.1 and 1.8.2. Integration with `15452992` preserves
those released sources, narration selections/history, module summary and public
media. `lesson-183-release-integration.json` retains both exact frozen draft bytes
and exact approved main bytes; historical assertions validate the current
successor hash before reading either view. The original handoff, proposal receipt
and review package are unchanged. Current target narration and release tests use
the actual authored source and public bytes.

`lesson-183-release-preservation.mjs` verifies actual integration against main.
The original preservation check still verifies the frozen draft against its
7a39a4b1 baseline. No historical assertion, timeout, or narration-current check
is skipped or loosened. The full release check permits only the already reviewed
1.7.3 freshness failure covering exactly twelve unchanged `problem-prioritize`
tracks; any additional failure blocks publication.

After squash merge, Vercel's existing Git integration deploys main. Dispatch
`lesson183-release.yml` on that current main commit only after verifying the
production deployment's commit. It verifies all 24 production media hashes and
MIME types, captures nineteen bounded published lesson/revision/private-guide
rows, dry-runs and then applies/publishes only `08-osh / safety-prepare`, and
compares the target against authored source and eighteen neighboring rows byte
for byte. UUID locks, learner progress, assessments and flags are not modified.
The workflow preserves its evidence as a release artifact.

A deliberate authenticated production admin preview uses an existing account.
A required password change is reported as a blocked browser smoke; it is not
bypassed and no account is mutated. Offline component verification does not
substitute for authenticated production verification.
