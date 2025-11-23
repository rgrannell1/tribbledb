#! /usr/bin/env -S deno run --allow-read

import docopt from "https://deno.land/x/docopt/mod.ts";
import { TribbleParser } from "./src/tribble/parse.ts";
import { TribbleStringifier } from "./src/tribble/stringify.ts";
import type { Triple } from "./src/types.ts";

const doc = `
Usage:
  tribble parse
  tribble stringify
  tribble search <filter>
`;

const options = docopt(doc);

/*
 * Read lines from standard input
 */
async function readStdinLines(): Promise<string[]> {
  const decoder = new TextDecoder();
  const input = await Deno.readAll(Deno.stdin);
  return decoder.decode(input).split(/\r?\n/).filter((line) =>
    line.trim().length > 0
  );
}

/*
 * Parse the array of lines into triples, print as JSON
 */
function parse(lines: string[]) {
  const parser = new TribbleParser();

  const triples: Triple[] = [];
  for (const line of lines) {
    const triple = parser.parse(line);
    if (triple) {
      triples.push(triple);
    }
  }

  console.log(JSON.stringify(triples, null, 2));
}

/*
 * Convert triples to tribbles and print
 */
function stringify(triples: Triple[]) {
  const stringifier = new TribbleStringifier();
  for (const triple of triples) {
    console.log(stringifier.stringify(triple));
  }
}

async function main() {
  if (options["stringify"]) {
    const lines = await readStdinLines();
    let triples: Triple[] = [];
    try {
      triples = JSON.parse(lines.join("\n"));
    } catch (_) {
      console.error("Failed to parse input as JSON array of triples.");
      Deno.exit(1);
    }
    stringify(triples);
  } else if (options["parse"]) {
    const lines = await readStdinLines();
    parse(lines);
  }
}

await main();
