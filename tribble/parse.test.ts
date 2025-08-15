import { TribbleParser } from "./parse.ts";
import type { Triple } from "../types.ts";
import { assertEquals } from "https://deno.land/std@0.203.0/assert/mod.ts";

Deno.test("TribbleParser parses declarations and triples", () => {
  const parser = new TribbleParser();
  parser.parseDeclaration('0 "Allianz Insurance"');
  parser.parseDeclaration('1 "id"');
  parser.parseDeclaration('2 "is"');
  parser.parseDeclaration('3 "Insurance Company"');

  assertEquals(parser.stringIndex.getValue(0), "Allianz Insurance");
  assertEquals(parser.stringIndex.getValue(1), "id");
  assertEquals(parser.stringIndex.getValue(2), "is");
  assertEquals(parser.stringIndex.getValue(3), "Insurance Company");
});

Deno.test("TribbleParser parses triple lines", () => {
  const parser = new TribbleParser();
  parser.parseDeclaration('0 "Allianz Insurance"');
  parser.parseDeclaration('1 "id"');
  parser.parseDeclaration('2 "is"');
  parser.parseDeclaration('3 "Insurance Company"');

  const triple = parser.parseTriple('src 0 rel 1 tgt 0');
  assertEquals(triple, ["Allianz Insurance", "id", "Allianz Insurance"]);

  const triple2 = parser.parseTriple('src 0 rel 2 tgt 3');
  assertEquals(triple2, ["Allianz Insurance", "is", "Insurance Company"]);
});

Deno.test("TribbleParser full parse works", () => {
  const parser = new TribbleParser();
  const lines = [
    '0 "Allianz Insurance"',
    '1 "id"',
    '2 "is"',
    '3 "Insurance Company"',
    'src 0 rel 1 tgt 0',
    'src 0 rel 2 tgt 3',
  ];
  const triples: Triple[] = [];
  for (const line of lines) {
    const triple = parser.parse(line);
    if (triple) triples.push(triple);
  }
  assertEquals(triples, [
    ["Allianz Insurance", "id", "Allianz Insurance"],
    ["Allianz Insurance", "is", "Insurance Company"]
  ]);
});
