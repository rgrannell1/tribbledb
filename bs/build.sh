#! /usr/bin/env zsh

npx tsc -p tsconfig.json
npx esbuild src/mod.ts --bundle --format=esm --outfile=dist/mod.js
npx esbuild src/v2/mod.ts --bundle --format=esm --outfile=dist/v2/mod.js
