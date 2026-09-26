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
# Needs GH_TOKEN with actions:read and the standard GITHUB_REPOSITORY,
# GITHUB_RUN_ID and GITHUB_RUN_ATTEMPT.
set -uo pipefail

repo=$GITHUB_REPOSITORY
me=$GITHUB_RUN_ID
poll=${POLL_SECONDS:-90}

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
  if runs=$(other_runs); then
    state=$(classify "$started" <<<"$runs")
    [ "$state" = go ] && exit 0
    echo "$(date -u +%H:%M:%SZ) shared e2e project $state; checking again in ${poll}s"
  else
    echo "$(date -u +%H:%M:%SZ) GitHub API call failed; retrying in ${poll}s"
  fi
  sleep "$poll"
done
