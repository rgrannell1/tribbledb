/*
 * Bulk-loader tests: fromTribbleLines must produce exactly what the
 * TribbleParser line-by-line path produces, including the parser's
 * no-unescaping quirk, and must reject what the parser rejects.
 */

import { assertEquals, assertThrows } from "@std/assert";
import { TribbleParser } from "../tribble/parse.ts";
import { TribbleStringifier } from "../tribble/stringify.ts";
import { TribbleDB } from "./mod.ts";
import type { Triple } from "../types.ts";

function toLines(triples: Triple[]): string[] {
  const stringifier = new TribbleStringifier();
  return triples
    .map((triple) => stringifier.stringify(triple))
    .join("\n")
    .split("\n");
}

function viaParser(lines: string[]): TribbleDB {
  const parser = new TribbleParser();
  const db = new TribbleDB([]);

  for (const line of lines) {
    const triple = parser.parse(line);
    if (triple) {
      db.add([triple]);
    }
  }
  return db;
}

const FIXTURE: Triple[] = [
  ["urn:ró:photo:p1", "location", "urn:ró:place:dublin"],
  ["urn:ró:photo:p1", "subject", "urn:ró:bird:robin?context=wild"],
  ["urn:ró:photo:p2", "location", "urn:ró:place:dublin"],
  ["urn:ró:photo:p2", "name", 'she said "hello"'],
  ["urn:ró:place:dublin", "in", "urn:ró:place:ireland"],
  // duplicate to exercise dedup
  ["urn:ró:photo:p1", "location", "urn:ró:place:dublin"],
  // relation name also used as a literal target
  ["urn:ró:photo:p2", "kind", "location"],
];

Deno.test("bulk: fromTribbleLines matches the TribbleParser path", () => {
  const lines = toLines(FIXTURE);

  const bulk = TribbleDB.fromTribbleLines(lines);
  const parsed = viaParser(lines);

  assertEquals(bulk.triples(), parsed.triples());
  assertEquals(bulk.triplesCount, parsed.triplesCount);
  assertEquals(bulk.sources(), parsed.sources());
  assertEquals(bulk.targets(), parsed.targets());
});

Deno.test("bulk: search over bulk-loaded data works", () => {
  const db = TribbleDB.fromTribbleLines(toLines(FIXTURE));

  const dubliners = db.search({
    relation: "location",
    target: "urn:ró:place:dublin",
  });
  assertEquals(
    dubliners.sources(),
    new Set([
      "urn:ró:photo:p1",
      "urn:ró:photo:p2",
    ]),
  );

  const wild = db.nodes({ type: "bird", qs: { context: "wild" } }).urns();
  assertEquals(wild, new Set(["urn:ró:bird:robin?context=wild"]));
});

Deno.test("bulk: blank lines are skipped", () => {
  const lines = ["", ...toLines(FIXTURE.slice(0, 1)), ""];
  const db = TribbleDB.fromTribbleLines(lines);
  assertEquals(db.triplesCount, 1);
});

type MalformedCase = {
  name: string;
  lines: string[];
};

const MALFORMED_CASES: MalformedCase[] = [
  { name: "declaration without id", lines: ['not-a-number "value"'] },
  { name: "triple with too few terms", lines: ['0 "a"', "0 0"] },
  { name: "triple with non-numeric term", lines: ['0 "a"', "0 x 0"] },
  { name: "triple with double space", lines: ['0 "a"', "0  0 0"] },
  { name: "undeclared dictionary reference", lines: ['0 "a"', "0 0 9"] },
];

for (const malformed of MALFORMED_CASES) {
  Deno.test(`bulk: rejects ${malformed.name}`, () => {
    assertThrows(
      () => TribbleDB.fromTribbleLines(malformed.lines),
      SyntaxError,
    );
  });
}

Deno.test("bulk: validations aggregate and throw", () => {
  const lines = toLines([
    ["urn:ró:person:a", "age", "ancient"],
    ["urn:ró:person:b", "age", "unknowable"],
  ]);

  assertThrows(
    () =>
      TribbleDB.fromTribbleLines(lines, {
        age: (_type, _relation, value) => {
          return /^\d+$/.test(value) ? undefined : `bad age: ${value}`;
        },
      }),
    Error,
    "bad age: ancient",
  );
});
