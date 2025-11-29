#! /usr/bin/env bash

if [[ "$*" == *"--json"* ]]; then
  deno bench --allow-env bench.js --json
else
  deno bench --allow-env bench.js
fi
