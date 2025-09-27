#! /usr/bin/env zsh

npx tsc -p tsconfig.json
npx esbuild src/mod.ts --bundle --format=esm --outfile=dist/mod.js
