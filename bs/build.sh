#! /usr/bin/env zsh

npx esbuild mod.ts      \
  --bundle              \
  --outfile=dist/mod.ts \
  --format=esm          \
  --minify              \
  --sourcemap
