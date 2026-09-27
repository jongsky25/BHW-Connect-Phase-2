#!/usr/bin/env bash
# Run by the e2e-wait job in .github/workflows/ci.yml (see the e2e job there
# for why). Exits once this run may use the shared e2e Supabase project:
# no other CI run holds it, and no run that started waiting earlier is still
# waiting (first come, first served). A run holds the project from the moment
# its e2e-wait succeeds until its e2e job completes (the jobs API omits e2e
# until e2e-wait finishes, so a missing e2e job counts as holding); a run on
# an older ci.yml, with no e2e-wait job, holds it while its e2e job is in
# progress.
#
# A pull_request run whose commit is no longer the PR's head (a newer push
# superseded it while it queued) is skipped instead: it writes run=false to
# GITHUB_OUTPUT and the e2e job does not start. Checked before every poll,
# since a run can become stale while it waits. It hasn't touched the
# database yet at that point, so skipping leaves no shared state behind.
#
# Needs GH_TOKEN with actions:read (and pull-requests:read for PR runs) and
# the standard GITHUB_REPOSITORY, GITHUB_RUN_ID, GITHUB_RUN_ATTEMPT and
# GITHUB_OUTPUT. PR_NUMBER and HEAD_SHA are set only for pull_request runs.
set -uo pipefail

repo=$GITHUB_REPOSITORY
me=$GITHUB_RUN_ID
poll=${POLL_SECONDS:-90}
pr=${PR_NUMBER:-}
head_sha=${HEAD_SHA:-}
output=${GITHUB_OUTPUT:-/dev/null}

# Exit 0 (and tell the e2e job to skip) if this PR run's commit is stale.
# An API failure is not proof of staleness, so it never skips.
skip_if_superseded() {
  [ -n "$pr" ] && [ -n "$head_sha" ] || return 0
  local current
  current=$(gh api "repos/$repo/pulls/$pr" --jq .head.sha) || return 0
  if [ -n "$current" ] && [ "$current" != "$head_sha" ]; then
    echo "PR #$pr moved on to $current; skipping e2e for superseded $head_sha"
    echo "run=false" >>"$output"
    exit 0
  fi
}

# stdin: one {run, jobs} object per other in-progress CI run. $1: when this
# run's e2e-wait started. Prints go, busy or queued.
classify() {
  jq -rs --arg started "$1" --argjson me "$me" '
    map(
      (.jobs | map(select(.name == "e2e-wait"))[0]) as $w
      | (.jobs | map(select(.name == "e2e"))[0]) as $e
      | if $w then
          if $w.status == "in_progress" then {waiting: true, key: [$w.started_at, .run]}
          elif $w.conclusion == "success" and ($e.status // "not created yet") != "completed" then {holding: true}
          else empty end
        elif ($e.status // "") == "in_progress" then {holding: true}
        else empty end)
    | if any(.holding) then "busy"
      elif any(.waiting and .key < [$started, $me]) then "queued"
      else "go" end'
}

other_runs() {
  local runs run
  runs=$(gh api "repos/$repo/actions/workflows/ci.yml/runs?status=in_progress&per_page=100" \
    --jq ".workflow_runs[] | select(.id != $me) | .id") || return 1
  for run in $runs; do
    gh api "repos/$repo/actions/runs/$run/jobs" \
      --jq "{run: $run, jobs: [.jobs[] | {name, status, conclusion, started_at}]}" || return 1
  done
}

started=$(gh api "repos/$repo/actions/runs/$me/attempts/$GITHUB_RUN_ATTEMPT/jobs" \
  --jq '.jobs[] | select(.name == "e2e-wait") | .started_at') || exit 1
[ -n "$started" ] || { echo "could not find this run's e2e-wait job"; exit 1; }

while :; do
  skip_if_superseded
  if runs=$(other_runs); then
    state=$(classify "$started" <<<"$runs")
    if [ "$state" = go ]; then
      echo "run=true" >>"$output"
      exit 0
    fi
    echo "$(date -u +%H:%M:%SZ) shared database $state; checking again in ${poll}s"
  else
    echo "$(date -u +%H:%M:%SZ) GitHub API call failed; retrying in ${poll}s"
  fi
  sleep "$poll"
done
