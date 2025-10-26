/*
 * Benchmark against the actual photo dataset
 */

import { TribbleParser } from "../src/tribble/parse.ts";
import { TribbleDB } from "../src/tribble-db.ts";
import type { Triple } from "../src/types.ts";
import type { ExperimentResult, IExperiment } from "./types.ts";
import { analyse } from "./stats.ts";

const MANIFEST_DIR = "/home/rg/Code/websites/photos.rgrannell.xyz/manifest";

/*
 * Find the published tribbles file
 */
function findTribbleFile(dir: string): string {
  const files = [...Deno.readDirSync(dir)]
    .filter((entry) => entry.isFile && entry.name.startsWith("tribbles"));
  if (files.length === 0) {
    throw new Error("No tribbles* file found in manifest directory");
  }
  return `${dir}/${files[0].name}`;
}

/*
 * Read lines from a file
 */
function readLines(filePath: string): string[] {
  const fileContent = Deno.readTextFileSync(filePath);
  return fileContent.split(/\r?\n/).filter((line) => line.trim().length > 0);
}

function parseTriples(lines: string[]): Triple[] {
  const parser = new TribbleParser();
  const triples: Triple[] = [];

  for (const line of lines) {
    const triple = parser.parse(line);
    if (triple) triples.push(triple);
  }

  return triples;
}

class ParseTribblesExperiment implements IExperiment {
  lines: string[];

  setup() {
    const fpath = findTribbleFile(MANIFEST_DIR);
    this.lines = readLines(fpath);
    return this;
  }

  run(samples: number): ExperimentResult {
    const data: number[] = [];

    for (let idx = 0; idx < samples; idx++) {
      const parser = new TribbleParser();

      const indexStart = performance.now();
      for (const line of this.lines) {
        parser.parse(line);
      }
      const indexEnd = performance.now();

      data.push(indexEnd - indexStart);
    }

    return analyse("tribble parsing time (ms)", data);
  }
}

class IndexTriplesExperiment implements IExperiment {
  private triples: Triple[];

  setup() {
    const fpath = findTribbleFile(MANIFEST_DIR);
    const lines = readLines(fpath);
    const triples = parseTriples(lines);

    this.triples = triples;
    return this;
  }

  run(samples: number): ExperimentResult {
    const data: number[] = [];

    for (let idx = 0; idx < samples; idx++) {
      const indexStart = performance.now();
      new TribbleDB(this.triples);
      const indexEnd = performance.now();

      data.push(indexEnd - indexStart);
    }

    return analyse("triple indexing time (ms)", data);
  }
}

console.log(
  (new ParseTribblesExperiment()).setup().run(100),
);

console.log(
  (new IndexTriplesExperiment()).setup().run(100),
);
