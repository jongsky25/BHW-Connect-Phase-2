#!/usr/bin/env bash
# Run by each e2e-shard job in .github/workflows/ci.yml before its tests.
# Exits 0 once the shared Supabase project is answering promptly, or 1 with
# a plain infrastructure message if it doesn't recover within the budget.
#
# "Answering" is not enough: on 27 Sep 2026 the pilot's disk I/O budget ran
# out and REST calls took 12-30s while auth password grants timed out at
# 10s — yet a single slow 200 passed the old check, and the chunk then spent
# its whole run failing on gateway timeouts, adding load to a database that
# was trying to recover. So this requires both the REST API (a real query,
# through PostgREST to Postgres) and the auth API to answer within
# MAX_SECONDS, several times in a row. Waiting here costs the database
# nothing; this run already holds the e2e slot, so no other run is using it.
#
# Needs NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
set -uo pipefail

url=$NEXT_PUBLIC_SUPABASE_URL
key=$NEXT_PUBLIC_SUPABASE_ANON_KEY
max_seconds=${MAX_SECONDS:-5}
needed=${HEALTHY_IN_A_ROW:-3}
attempts=${ATTEMPTS:-20}
pause=${PAUSE_SECONDS:-30}

# Prints "<http code> <seconds>"; code 000 when curl gave up at max_seconds.
probe() {
  curl -s -o /dev/null -w '%{http_code} %{time_total}' --max-time "$max_seconds" \
    -H "apikey: $key" "$url$1"
}

# 2xx-4xx within the time limit. A 4xx still proves the service answered.
ok() {
  local code=${1%% *}
  [ "$code" -ge 200 ] && [ "$code" -lt 500 ]
}

streak=0
for attempt in $(seq 1 "$attempts"); do
  rest=$(probe "/rest/v1/feature_flags?select=key&limit=1")
  auth=$(probe "/auth/v1/health")
  if ok "$rest" && ok "$auth"; then
    streak=$((streak + 1))
    echo "Probe $attempt: healthy (REST $rest s, auth $auth s) — $streak of $needed"
    if [ "$streak" -ge "$needed" ]; then
      echo "Shared database OK"
      exit 0
    fi
    sleep 2
  else
    streak=0
    echo "Probe $attempt: slow or failing (REST $rest s, auth $auth s; limit ${max_seconds}s); retrying in ${pause}s"
    sleep "$pause"
  fi
done

echo "::error::The shared Supabase database is not answering promptly (REST $rest s, auth $auth s; limit ${max_seconds}s). This is an infrastructure problem, not a test failure — running the suite now would only fail on timeouts and slow the database's recovery. Check the project's health (Disk IO budget) in the Supabase dashboard, then re-run this job."
exit 1
