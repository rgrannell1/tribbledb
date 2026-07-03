#!/usr/bin/env -S deno run --allow-net --allow-read

/**
 * Simple HTTP server for running benchmarks in the browser
 */

import { serveDir } from "std/file-server";

const port = 8000;

console.log(`🚀 Starting benchmark server on http://localhost:${port}`);
console.log(`📊 Open http://localhost:${port}/benchmark/ in your browser`);
console.log(`🔥 Open DevTools → Performance tab to capture flame charts`);

Deno.serve({ port }, (req) => {
  return serveDir(req, {
    fsRoot: ".",
    showDirListing: true,
    enableCors: true,
  });
});
