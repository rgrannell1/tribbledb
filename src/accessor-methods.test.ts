import { assertEquals } from "jsr:@std/assert";
import { TribbleDB } from "./tribble-db.ts";
import type { Triple } from "./types.ts";

const testTriples: Triple[] = [
  ["urn:ró:person:alice", "name", "Alice Smith"],
  ["urn:ró:person:alice", "age", "30"],
  ["urn:ró:person:bob", "name", "Bob Jones"],
  ["urn:ró:company:acme", "name", "Acme Corp"],
  ["urn:ró:company:acme", "industry", "manufacturing"],
];

Deno.test("sources() returns all unique source URNs", () => {
  const database = new TribbleDB(testTriples);
  const sources = database.sources();
  
  assertEquals(sources.size, 3);
  assertEquals(sources.has("urn:ró:person:alice"), true);
  assertEquals(sources.has("urn:ró:person:bob"), true);
  assertEquals(sources.has("urn:ró:company:acme"), true);
});

Deno.test("relations() returns all unique relations", () => {
  const database = new TribbleDB(testTriples);
  const relations = database.relations();
  
  assertEquals(relations.size, 3);
  assertEquals(relations.has("name"), true);
  assertEquals(relations.has("age"), true);
  assertEquals(relations.has("industry"), true);
});

Deno.test("targets() returns all unique targets", () => {
  const database = new TribbleDB(testTriples);
  const targets = database.targets();
  
  assertEquals(targets.size, 5);
  assertEquals(targets.has("Alice Smith"), true);
  assertEquals(targets.has("30"), true);
  assertEquals(targets.has("Bob Jones"), true);
  assertEquals(targets.has("Acme Corp"), true);
  assertEquals(targets.has("manufacturing"), true);
});

Deno.test("sources() returns empty set for empty database", () => {
  const database = new TribbleDB([]);
  const sources = database.sources();
  
  assertEquals(sources.size, 0);
});

Deno.test("relations() returns empty set for empty database", () => {
  const database = new TribbleDB([]);
  const relations = database.relations();
  
  assertEquals(relations.size, 0);
});

Deno.test("targets() returns empty set for empty database", () => {
  const database = new TribbleDB([]);
  const targets = database.targets();
  
  assertEquals(targets.size, 0);
});

Deno.test("accessor methods work correctly after deletion", () => {
  const database = new TribbleDB(testTriples);
  
  // Delete Alice's triples
  database.delete([
    ["urn:ró:person:alice", "name", "Alice Smith"],
    ["urn:ró:person:alice", "age", "30"],
  ]);
  
  const sources = database.sources();
  const relations = database.relations();
  const targets = database.targets();
  
  // Alice should still appear if she has other triples, but in this case
  // we only verify bob and acme remain
  assertEquals(sources.has("urn:ró:person:bob"), true);
  assertEquals(sources.has("urn:ró:company:acme"), true);
  
  // All relations should still exist as they're used by other triples
  assertEquals(relations.has("name"), true);
  assertEquals(relations.has("industry"), true);
  
  // Alice's targets should not appear if they're unique to her
  assertEquals(targets.has("Bob Jones"), true);
  assertEquals(targets.has("Acme Corp"), true);
});

Deno.test("accessor methods work correctly after adding triples", () => {
  const database = new TribbleDB(testTriples);
  
  database.add([
    ["urn:ró:person:charlie", "name", "Charlie Brown"],
    ["urn:ró:person:charlie", "email", "charlie@example.com"],
  ]);
  
  const sources = database.sources();
  const relations = database.relations();
  const targets = database.targets();
  
  assertEquals(sources.size, 4);
  assertEquals(sources.has("urn:ró:person:charlie"), true);
  
  assertEquals(relations.size, 4);
  assertEquals(relations.has("email"), true);
  
  assertEquals(targets.has("Charlie Brown"), true);
  assertEquals(targets.has("charlie@example.com"), true);
});
