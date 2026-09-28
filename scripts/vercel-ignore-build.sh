#!/bin/bash
# Vercel "Ignored Build Step" (vercel.json ignoreCommand). Exit 0 skips the
# build, exit 1 builds. Skips only when every file changed since the branch's
# last deployed commit is outside the app build: docs, pitch decks, mockups,
# prototypes, Markdown outside content/, E2E specs, CI workflows, Supabase
# migrations/config, agent config. Any doubt (no previous deploy, commit not
# in the shallow clone, empty diff) builds, so a real change is never skipped.
# See docs/dev-efficiency-usage-audit.md item 5.

base="${VERCEL_GIT_PREVIOUS_SHA:-}"
[ -n "$base" ] || { echo "No previous deployment on this branch: building."; exit 1; }
git cat-file -e "${base}^{commit}" 2>/dev/null \
  || git fetch --quiet --depth=1 origin "$base" 2>/dev/null \
  || { echo "Previous deployed commit $base not available: building."; exit 1; }
changed=$(git diff --name-only "$base" HEAD) || { echo "Diff failed: building."; exit 1; }
[ -n "$changed" ] || { echo "No file changes (redeploy): building."; exit 1; }

while IFS= read -r f; do
  case "$f" in
    content/*) echo "App input changed: $f — building."; exit 1 ;;
    docs/*|pitch/*|mockups/*|prototypes/*|e2e/*|.github/*|supabase/*|.claude/*|.agents/*|*.md) ;;
    *) echo "App file changed: $f — building."; exit 1 ;;
  esac
done <<< "$changed"

echo "Only non-app files changed since $base — skipping the build:"
echo "$changed"
exit 0
