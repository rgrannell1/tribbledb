/*
 * Unit tests for v2-specific behaviour: the additive API (add reports,
 * options objects), the intentional fixes over v1 (first* after deletes),
 * and exact-identity edge cases.
 */

import { assertEquals } from "@std/assert";
import { TribbleDB as TribbleV1 } from "../tribble-db.ts";
import { TribbleDB } from "./mod.ts";
import type { Triple } from "../types.ts";

const FIXTURE: Triple[] = [
  ["urn:ró:person:alice", "name", "Alice Smith"],
  ["urn:ró:person:alice", "age", "30"],
  ["urn:ró:person:bob", "name", "Bob Jones"],
];

Deno.test("v2: add reports inserted and duplicate counts", () => {
  const db = new TribbleDB([...FIXTURE]);

  const report = db.add([
    FIXTURE[0],
    ["urn:ró:person:carol", "name", "Carol Byrne"],
  ]);

  assertEquals(report, { added: 1, duplicates: 1 });
  assertEquals(db.triplesCount, FIXTURE.length + 1);
});

Deno.test("v2: firstObject accepts the options-object form", () => {
  const db = new TribbleDB([...FIXTURE]);

  assertEquals(db.firstObject({ arrays: true }), db.firstObject(true));
  assertEquals(db.firstObject({}), db.firstObject(false));
  assertEquals(db.firstObject({ arrays: true }), {
    id: "urn:ró:person:alice",
    name: ["Alice Smith"],
    age: ["30"],
  });
});

Deno.test("v2: objects accepts the options-object form", () => {
  const db = new TribbleDB([...FIXTURE]);
  assertEquals(db.objects({ arrays: true }), db.objects(true));
});

Deno.test("v2: first* skip deleted rows instead of returning undefined", () => {
  const db = new TribbleDB([...FIXTURE]);
  db.delete([FIXTURE[0]]);

  // v1 returns undefined here (slot-zero bug); v2 intentionally fixes this
  assertEquals(db.firstTriple(), FIXTURE[1]);
  assertEquals(db.firstSource(), "urn:ró:person:alice");
});

Deno.test("v2: triple identity is exact for terms containing spaces", () => {
  const db = new TribbleDB([]);
  const tricky: Triple[] = [
    ["a b", "c", "d"],
    ["a", "b c", "d"],
  ];

  assertEquals(db.deduplicateTriples(tricky).length, 2);
  assertEquals(db.add(tricky), { added: 2, duplicates: 0 });
});

Deno.test("v2: compact reclaims tombstones without changing content", () => {
  const db = new TribbleDB([...FIXTURE]);
  db.delete([FIXTURE[1]]);

  const before = db.triples();
  db.compact();

  assertEquals(db.triples(), before);
  assertEquals(db.triplesCount, FIXTURE.length - 1);
  assertEquals(
    db.search({ source: { type: "person" } }).triplesCount,
    FIXTURE.length - 1,
  );
});

Deno.test("v2: validations run on add, as in v1", () => {
  const db = new TribbleDB([], {
    age: (_type, _relation, value) => {
      return /^\d+$/.test(value) ? undefined : `bad age: ${value}`;
    },
  });

  let message = "";
  try {
    db.add([["urn:ró:person:alice", "age", "unknowable"]]);
  } catch (err) {
    message = (err as Error).message;
  }

  assertEquals(message.includes("bad age: unknowable"), true);
  assertEquals(db.triplesCount, 0);
});

Deno.test("v2: a component string later used as a node gets indexed", () => {
  // "2023" is first interned as the id COMPONENT of the album URN; it must
  // still gain node metadata when it later appears as a literal target
  const fixture: Triple[] = [
    ["urn:ró:album:2023", "name", "Year Album"],
    ["urn:ró:photo:p1", "year", "2023"],
  ];
  const db = new TribbleDB(fixture);
  const v1 = new TribbleV1(fixture);

  const byTargetId = db.search({ target: { id: "2023" } });
  assertEquals(
    byTargetId.triples(),
    v1.search({ target: { id: "2023" } }).triples(),
  );
  assertEquals(byTargetId.triplesCount, 1);

  assertEquals(db.nodes("2023").ids(), new Set(["2023"]));
  assertEquals(
    db.nodes("urn:ró:photo:p1").follow("year").ids(),
    new Set(["2023"]),
  );
});

Deno.test("v2: searchFlatmap rewrites in place", () => {
  const db = new TribbleDB([...FIXTURE]);

  db.searchFlatmap({ relation: "age" }, (triple) => {
    return [[triple[0], "age", "31"]];
  });

  assertEquals(db.readThing("urn:ró:person:alice")?.age, "31");
  assertEquals(db.triplesCount, FIXTURE.length);
});
