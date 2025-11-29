#! /usr/bin/env bash

if [[ "$*" == *"--json"* ]]; then
  deno bench --allow-read  --json
else
  deno bench --allow-read
fi
