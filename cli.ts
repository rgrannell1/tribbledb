#! /usr/bin/env -S deno run --allow-read

import docopt from "https://deno.land/x/docopt/mod.ts";
import { TribbleParser } from "./src/tribble/parse.ts";
import { TribbleStringifier } from "./src/tribble/stringify.ts";
import type { Triple } from "./types.ts";

const doc = `
Usage:
  tribble parse
  tribble stringify
`;

const options = docopt(doc);

async function readStdinLines(): Promise<string[]> {
  const decoder = new TextDecoder();
  const input = await Deno.readAll(Deno.stdin);
  return decoder.decode(input).split(/\r?\n/).filter((line) =>
    line.trim().length > 0
  );
}

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

function stringify(triples: Triple[]) {
  const stringifier = new TribbleStringifier();
  for (const triple of triples) {
    console.log(stringifier.stringify(triple));
  }
}

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
