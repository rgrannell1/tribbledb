import { TribbleStringifier } from "./stringify.ts";
import type { Triple } from "../types.ts";
import { assertEquals } from "https://deno.land/std@0.203.0/assert/mod.ts";

Deno.test("TribbleStringifier stringifies triples and assigns indices", () => {
  const stringifier = new TribbleStringifier();
  const triple: Triple = ["Allianz Insurance", "id", "Allianz Insurance"];
  const result = stringifier.stringify(triple);

  const expectedLines = [
    '0 "Allianz Insurance"',
    '1 "id"',
    "0 1 0",
  ];
  for (const line of expectedLines) {
    if (!result.includes(line)) {
      throw new Error(`Missing line: ${line}`);
    }
  }
});

Deno.test("TribbleStringifier does not duplicate indices for repeated values", () => {
  const stringifier = new TribbleStringifier();
  const triple1: Triple = ["Allianz Insurance", "id", "Allianz Insurance"];
  const triple2: Triple = ["Allianz Insurance", "is", "Insurance Company"];
  stringifier.stringify(triple1);
  const result2 = stringifier.stringify(triple2);
  // Should not duplicate index for "Allianz Insurance"
  assertEquals(result2.includes('0 "Allianz Insurance"'), false);
  assertEquals(result2.includes('1 "id"'), false);
  assertEquals(result2.includes('2 "is"'), true);
  assertEquals(result2.includes('3 "Insurance Company"'), true);
  assertEquals(result2.includes("0 2 3"), true);
});

Deno.test("TribbleStringifier handles null value", () => {
  const stringifier = new TribbleStringifier();
  const triple: Triple = ["test", "relation", "null"];
  const result = stringifier.stringify(triple);
  assertEquals(result.includes('"null"'), true);
});

Deno.test("TribbleStringifier handles literal null", () => {
  const stringifier = new TribbleStringifier();
  const triple: Triple = ["test", "relation", null as any];
  const result = stringifier.stringify(triple);
  assertEquals(result.includes('"null"'), true);
});
