#! /usr/bin/env bash

CURRENT_COMMIT_ID="$(git rev-parse HEAD)"
CURRENT_DATE="$(date -Iseconds)"
CURRENT_VERSION="$(jq '.version' package.json )"

rs bench --json | jq "{
  \"date\": \"$CURRENT_DATE\",
  \"version\": $CURRENT_VERSION,
  \"commit_id\": \"$CURRENT_COMMIT_ID\",
  \"results\": .
}" | tee "benchmark_results/bench_$CURRENT_DATE.json"
