#! /usr/bin/env zsh

npx esbuild src/mod.ts --bundle --format=esm --outfile=dist/mod.js
