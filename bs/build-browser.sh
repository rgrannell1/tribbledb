#!/usr/bin/env -S deno run --allow-read --allow-write --allow-net --allow-env

/**
 * Build benchmarks for browser execution
 */

const benchFiles = [
  "indexing.bench.ts",
  "deleting.bench.ts",
  "searchflatmap.bench.ts"
];

const outDir = "./benchmark/dist";

// Create output directory
try {
  await Deno.mkdir(outDir, { recursive: true });
} catch {
  // Directory already exists
}

console.log("Building benchmarks for browser...\n");

for (const file of benchFiles) {
  const inPath = `./benchmark/${file}`;
  const outPath = `${outDir}/${file.replace('.ts', '.js')}`;

  console.log(`Building ${file}...`);

  const command = new Deno.Command("deno", {
    args: [
      "bundle",
      inPath,
      outPath
    ],
    stdout: "piped",
    stderr: "piped"
  });

  const { code, stdout, stderr } = await command.output();

  if (code !== 0) {
    console.error(`Failed to build ${file}`);
    console.error(new TextDecoder().decode(stderr));
  } else {
    console.log(`✓ ${file} → ${outPath}`);
  }
}

console.log("\n✅ Build complete! Open benchmark/index.html in your browser.");
