#!/bin/bash
# SessionStart hook. Two jobs, both aimed at the same thing: a session that is
# useful in its first minute instead of its second hour.
#
#   1. Install dependencies. The web container is a fresh clone with no
#      node_modules, so without this every session pays the install cost at the
#      moment it first tries to run a test.
#   2. Print the credential state. The recurring failure mode here was a
#      session discovering, deep into a task, that it had no loader credentials
#      and stalling to ask for a password. Now it knows up front, and knows the
#      GitHub Actions route that needs no password at all.
set -euo pipefail

cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/../..}"

if [ "${CLAUDE_CODE_REMOTE:-}" = "true" ]; then
  if [ ! -d node_modules ]; then
    echo "Installing dependencies..."
    npm install --no-audit --no-fund
  fi
fi

# Always report credential state — it is as useful locally as remotely, and
# --brief is a handful of lines.
node scripts/doctor.mjs --brief || true
