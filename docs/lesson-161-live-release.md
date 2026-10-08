# Approved 1.6.1 and Gibs continuity release

The owner approved PR #264's completed package and requested “merge and deploy
to live” on 8 October 2026. PR #264 was squash merged as
`15ea55f3da56ee232f53f804d84f4166884862df`, retaining the exact reviewed source
from `5f9830f2d2b41bf6bd4b1c04d8a9340ae0e0e52e`.

`lesson-161-owner-approval.json` pins 51 source files (with only asset review status promoted) and all 63 selected public
media files. The scope is the complete 1.6.1 enhancement plus the already
reviewed Gibs name, portrait and introductory narration continuity in 1.6.2–1.6.5.
The sibling lessons' teaching enhancement will happen in separate draft PRs.
The owner's release authorization does not turn model analysis into a separate
human listening or clinical review. All original audio review reports and
documented timbre/pronunciation concerns remain available.

The release workflow verifies the approval hashes, waits for exact merged-main
CI and Vercel success, and verifies every selected asset from the production
alias. It snapshots only eleven published lesson/revision/private-guide rows,
dry-runs the established loader, and publishes exactly the five named lessons
in `06-komunikasyon`. It then verifies exact authored revisions and private
guides, stable lesson identity/metadata, all six unchanged neighboring lessons,
and the unchanged lock file. A deliberate authenticated admin preview then
checks all five production lesson pages, their Gibs illustrations and the
admin dashboard without learner completion interactions. It does not read or reset learners' progress,
publish KB answers, change assessments, apply migrations, or alter feature flags.

The workflow's `lesson161-live-release-<SHA>` artifact contains the before and
after evidence. A successful app deployment alone does not establish successful
lesson publication; both this workflow and its post-publication comparison must
pass before reporting the content live.
