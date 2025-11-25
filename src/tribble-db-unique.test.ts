import { assertEquals } from "jsr:@std/assert";
import { TribbleDB } from "./tribble-db.ts";
import type { Triple, TripleObject } from "./types.ts";

const testTriples: Triple[] = [
  ["person:alice", "name", "Alice Smith"],
  ["person:alice", "age", "30"],
  ["person:alice", "works_at", "company:acme"],
  ["person:bob", "name", "Bob Jones"],
  ["person:bob", "age", "25"],
  ["company:acme", "name", "Acme Corp"],
];

Deno.test("TribbleDB constructor only stores unique triples", () => {
  const triplesWithDuplicates: Triple[] = [
    ["person:alice", "name", "Alice Smith"],
    ["person:alice", "name", "Alice Smith"], // duplicate
    ["person:alice", "age", "30"],
    ["person:alice", "age", "30"], // duplicate
    ["person:bob", "name", "Bob Jones"],
    ["person:bob", "name", "Bob Jones"], // duplicate
  ];

  const database = new TribbleDB(triplesWithDuplicates);

  // Should only have 3 unique triples
  assertEquals(database.triplesCount, 3);
  assertEquals(database.triples().length, 3);

  // Verify the unique triples are correct
  const expectedTriples = [
    ["person:alice", "name", "Alice Smith"],
    ["person:alice", "age", "30"],
    ["person:bob", "name", "Bob Jones"],
  ];

  const actualTriples = database.triples();
  for (const expectedTriple of expectedTriples) {
    const found = actualTriples.some(actualTriple =>
      actualTriple[0] === expectedTriple[0] &&
      actualTriple[1] === expectedTriple[1] &&
      actualTriple[2] === expectedTriple[2]
    );
    assertEquals(found, true, `Expected to find triple: ${expectedTriple}`);
  }
});

Deno.test("TribbleDB.add() only adds unique triples", () => {
  const database = new TribbleDB(testTriples);
  const initialCount = database.triplesCount;

  // Try to add duplicates and new triples
  const newTriples: Triple[] = [
    ["person:alice", "name", "Alice Smith"], // duplicate
    ["person:alice", "age", "30"], // duplicate
    ["person:charlie", "name", "Charlie Brown"], // new
    ["person:charlie", "age", "28"], // new
    ["person:alice", "works_at", "company:acme"], // duplicate
  ];

  database.add(newTriples);

  // Should only add the 2 unique triples for Charlie
  assertEquals(database.triplesCount, initialCount + 2);

  // Verify Charlie's data is present
  const charlieResults = database.search({ source: "person:charlie" });
  assertEquals(charlieResults.triplesCount, 2);

  const charlieTriples = charlieResults.triples();
  const charlieNames = charlieTriples.filter(triple => triple[1] === "name");
  const charlieAges = charlieTriples.filter(triple => triple[1] === "age");

  assertEquals(charlieNames.length, 1);
  assertEquals(charlieNames[0][2], "Charlie Brown");
  assertEquals(charlieAges.length, 1);
  assertEquals(charlieAges[0][2], "28");
});

Deno.test("TribbleDB.add() with all duplicate triples adds nothing", () => {
  const database = new TribbleDB(testTriples);
  const initialCount = database.triplesCount;
  const initialTriples = [...database.triples()];

  // Try to add only duplicates
  const duplicateTriples: Triple[] = [
    ["person:alice", "name", "Alice Smith"],
    ["person:alice", "age", "30"],
    ["person:bob", "name", "Bob Jones"],
  ];

  database.add(duplicateTriples);

  // Should not add any triples
  assertEquals(database.triplesCount, initialCount);
  assertEquals(database.triples(), initialTriples);
});

Deno.test("TribbleDB maintains uniqueness with identical string content but different objects", () => {
  const database = new TribbleDB([]);

  // Create triples with identical content but as different object instances
  const triple1: Triple = ["user:john", "email", "john@example.com"];
  const triple2: Triple = ["user:john", "email", "john@example.com"]; // Same content, different object

  database.add([triple1]);
  assertEquals(database.triplesCount, 1);

  database.add([triple2]);
  assertEquals(database.triplesCount, 1); // Should still be 1, not 2

  // Verify content
  const results = database.search({ source: "user:john" });
  assertEquals(results.triplesCount, 1);
  assertEquals(results.firstTriple()![2], "john@example.com");
});

Deno.test("TribbleDB uniqueness works with URN format", () => {
  const urnTriples: Triple[] = [
    ["urn:ró:person:alice", "name", "Alice Smith"],
    ["urn:ró:person:alice", "name", "Alice Smith"], // duplicate
    ["urn:ró:person:alice", "age", "30"],
    ["urn:ró:person:bob", "name", "Bob Jones"],
    ["urn:ró:person:bob", "name", "Bob Jones"], // duplicate
  ];

  const database = new TribbleDB(urnTriples);

  // Should only have 3 unique triples
  assertEquals(database.triplesCount, 3);

  // Verify we can find all the unique data
  const aliceResults = database.search({ source: { type: "person", id: "alice" } });
  assertEquals(aliceResults.triplesCount, 2); // name and age

  const bobResults = database.search({ source: { type: "person", id: "bob" } });
  assertEquals(bobResults.triplesCount, 1); // just name
});

Deno.test("TribbleDB uniqueness with whitespace and special characters", () => {
  const specialTriples: Triple[] = [
    ["entity:test", "description", "Text with spaces"],
    ["entity:test", "description", "Text with spaces"], // duplicate
    ["entity:test", "value", "123.45"],
    ["entity:test", "value", "123.45"], // duplicate
    ["entity:test", "special", "chars!@#$%^&*()"],
    ["entity:test", "special", "chars!@#$%^&*()"], // duplicate
  ];

  const database = new TribbleDB(specialTriples);

  assertEquals(database.triplesCount, 3);

  const results = database.search({ source: "entity:test" });
  assertEquals(results.triplesCount, 3);

  const triples = results.triples();
  const descriptions = triples.filter(t => t[1] === "description");
  const values = triples.filter(t => t[1] === "value");
  const specials = triples.filter(t => t[1] === "special");

  assertEquals(descriptions.length, 1);
  assertEquals(descriptions[0][2], "Text with spaces");
  assertEquals(values.length, 1);
  assertEquals(values[0][2], "123.45");
  assertEquals(specials.length, 1);
  assertEquals(specials[0][2], "chars!@#$%^&*()");
});

Deno.test("TribbleDB uniqueness with empty strings and edge cases", () => {
  const edgeCaseTriples: Triple[] = [
    ["", "empty_source", "value"],
    ["", "empty_source", "value"], // duplicate
    ["source", "", "empty_relation"],
    ["source", "", "empty_relation"], // duplicate
    ["source", "relation", ""],
    ["source", "relation", ""], // duplicate
    ["source", "relation", "value"],
    ["source", "relation", "value"], // duplicate
  ];

  const database = new TribbleDB(edgeCaseTriples);

  assertEquals(database.triplesCount, 4); // Should have 4 unique triples

  // Verify each unique triple exists
  const allTriples = database.triples();
  assertEquals(allTriples.length, 4);

  // Check that we have one of each type
  const emptySourceTriples = allTriples.filter(t => t[0] === "");
  const emptyRelationTriples = allTriples.filter(t => t[1] === "");
  const emptyTargetTriples = allTriples.filter(t => t[2] === "");
  const normalTriples = allTriples.filter(t => t[0] !== "" && t[1] !== "" && t[2] !== "");

  assertEquals(emptySourceTriples.length, 1);
  assertEquals(emptyRelationTriples.length, 1);
  assertEquals(emptyTargetTriples.length, 1);
  assertEquals(normalTriples.length, 1);
});

Deno.test("TribbleDB.flatMap maintains uniqueness", () => {
  const database = new TribbleDB([
    ["person:alice", "skill", "typescript"],
    ["person:bob", "skill", "python"],
  ]);

  // FlatMap that creates duplicates
  const result = database.flatMap(triple => {
    if (triple[1] === "skill") {
      return [
        triple, // original
        triple, // duplicate
        [triple[0], "expertise", triple[2]], // new relation
        [triple[0], "expertise", triple[2]], // duplicate of new
      ];
    }
    return [triple];
  });

  // Should only have unique triples: 2 original skills + 2 new expertise
  assertEquals(result.triplesCount, 4);

  const skillTriples = result.search({ relation: "skill" }).triples();
  const expertiseTriples = result.search({ relation: "expertise" }).triples();

  assertEquals(skillTriples.length, 2);
  assertEquals(expertiseTriples.length, 2);

  // Verify no duplicates in skills
  const skillTargets = skillTriples.map(t => `${t[0]}:${t[2]}`);
  assertEquals(new Set(skillTargets).size, skillTargets.length);

  // Verify no duplicates in expertise
  const expertiseTargets = expertiseTriples.map(t => `${t[0]}:${t[2]}`);
  assertEquals(new Set(expertiseTargets).size, expertiseTargets.length);
});

Deno.test("TribbleDB.from() with overlapping object data maintains uniqueness", () => {
  const obj1: TripleObject = {
    id: "person:alice",
    name: "Alice Smith",
    skills: ["typescript", "python"],
  };

  const obj2: TripleObject = {
    id: "person:alice", // Same person
    name: "Alice Smith", // Duplicate name triple
    age: "30", // New info
    skills: ["typescript"], // Overlapping skill
  };

  const database = TribbleDB.from([obj1, obj2]);

  // Should have unique triples: name(1) + age(1) + skills(2 unique)
  assertEquals(database.triplesCount, 4);

  const aliceResults = database.search({ source: "person:alice" });
  assertEquals(aliceResults.triplesCount, 4);

  // Check specific relations
  const nameResults = aliceResults.search({ relation: "name" });
  const ageResults = aliceResults.search({ relation: "age" });
  const skillResults = aliceResults.search({ relation: "skills" });

  assertEquals(nameResults.triplesCount, 1);
  assertEquals(ageResults.triplesCount, 1);
  assertEquals(skillResults.triplesCount, 2); // typescript and python

  // Verify skill uniqueness
  const skillTriples = skillResults.triples();
  const skillValues = skillTriples.map(t => t[2]);
  assertEquals(skillValues.includes("typescript"), true);
  assertEquals(skillValues.includes("python"), true);
  assertEquals(new Set(skillValues).size, skillValues.length); // No duplicates
});

Deno.test("TribbleDB uniqueness performance with large number of duplicates", () => {
  const baseTriple: Triple = ["entity:test", "property", "value"];
  const manyDuplicates: Triple[] = [];

  // Create 1000 identical triples
  for (let idx = 0; idx < 1000; idx++) {
    manyDuplicates.push([...baseTriple]);
  }

  const database = new TribbleDB(manyDuplicates);

  // Should only store one unique triple
  assertEquals(database.triplesCount, 1);
  assertEquals(database.triples().length, 1);
  assertEquals(database.firstTriple()!, baseTriple);
});

Deno.test("TribbleDB clone preserves uniqueness behavior", () => {
  const triplesWithDuplicates: Triple[] = [
    ["entity:original", "prop", "value1"],
    ["entity:original", "prop", "value1"], // duplicate
    ["entity:original", "prop", "value2"],
  ];

  const original = new TribbleDB(triplesWithDuplicates);
  assertEquals(original.triplesCount, 2); // Only unique triples

  const cloned = original.clone();
  assertEquals(cloned.triplesCount, 2);

  // Add duplicates to clone
  cloned.add([
    ["entity:original", "prop", "value1"], // duplicate of existing
    ["entity:original", "prop", "value3"], // new
  ]);

  assertEquals(cloned.triplesCount, 3); // Should only add the new one
  assertEquals(original.triplesCount, 2); // Original unchanged
});

Deno.test("TribbleDB.merge() combines databases with uniqueness", () => {
  const db1 = new TribbleDB([
    ["person:alice", "name", "Alice Smith"],
    ["person:alice", "age", "30"],
    ["person:bob", "name", "Bob Jones"],
  ]);

  const db2 = new TribbleDB([
    ["person:alice", "name", "Alice Smith"], // duplicate
    ["person:alice", "email", "alice@example.com"], // new
    ["person:charlie", "name", "Charlie Brown"], // new
    ["person:charlie", "age", "25"], // new
  ]);

  const initialDb1Count = db1.triplesCount;
  const result = db1.merge(db2);

  // Should return the same instance
  assertEquals(result, db1);

  // Should have original triples + unique new triples from db2
  assertEquals(db1.triplesCount, initialDb1Count + 3); // alice.email, charlie.name, charlie.age

  // Verify specific data
  const aliceResults = db1.search({ source: "person:alice" });
  assertEquals(aliceResults.triplesCount, 3); // name, age, email

  const charlieResults = db1.search({ source: "person:charlie" });
  assertEquals(charlieResults.triplesCount, 2); // name, age

  // Check that Alice has email now
  const emailResults = aliceResults.search({ relation: "email" });
  assertEquals(emailResults.triplesCount, 1);
  assertEquals(emailResults.firstTriple()![2], "alice@example.com");
});

Deno.test("TribbleDB.merge() with completely duplicate database adds nothing", () => {
  const db1 = new TribbleDB([
    ["person:alice", "name", "Alice Smith"],
    ["person:bob", "age", "25"],
  ]);

  const db2 = new TribbleDB([
    ["person:alice", "name", "Alice Smith"], // duplicate
    ["person:bob", "age", "25"], // duplicate
  ]);

  const initialCount = db1.triplesCount;
  db1.merge(db2);

  // Should not add any new triples
  assertEquals(db1.triplesCount, initialCount);
});

Deno.test("TribbleDB.merge() with empty database", () => {
  const db1 = new TribbleDB([
    ["person:alice", "name", "Alice Smith"],
  ]);

  const emptyDb = new TribbleDB([]);
  
  const initialCount = db1.triplesCount;
  db1.merge(emptyDb);

  // Should remain unchanged
  assertEquals(db1.triplesCount, initialCount);
  assertEquals(db1.firstTriple()![0], "person:alice");
});

Deno.test("TribbleDB.merge() empty database with populated database", () => {
  const emptyDb = new TribbleDB([]);
  const populatedDb = new TribbleDB([
    ["person:alice", "name", "Alice Smith"],
    ["person:bob", "age", "25"],
  ]);

  emptyDb.merge(populatedDb);

  // Empty database should now contain all triples from populated database
  assertEquals(emptyDb.triplesCount, 2);
  assertEquals(emptyDb.triples().length, 2);

  const aliceResults = emptyDb.search({ source: "person:alice" });
  assertEquals(aliceResults.triplesCount, 1);
  assertEquals(aliceResults.firstTriple()![1], "name");

  const bobResults = emptyDb.search({ source: "person:bob" });
  assertEquals(bobResults.triplesCount, 1);
  assertEquals(bobResults.firstTriple()![1], "age");
});

Deno.test("TribbleDB.merge() preserves original database state on other database", () => {
  const db1 = new TribbleDB([
    ["person:alice", "name", "Alice Smith"],
  ]);

  const db2 = new TribbleDB([
    ["person:bob", "name", "Bob Jones"],
  ]);

  const db2InitialCount = db2.triplesCount;
  
  db1.merge(db2);

  // db2 should remain unchanged
  assertEquals(db2.triplesCount, db2InitialCount);
  assertEquals(db2.firstTriple()![0], "person:bob");

  // db1 should have both
  assertEquals(db1.triplesCount, 2);
});

Deno.test("TribbleDB.merge() with URN format maintains uniqueness", () => {
  const db1 = new TribbleDB([
    ["urn:ró:person:alice", "name", "Alice Smith"],
    ["urn:ró:person:alice", "age", "30"],
  ]);

  const db2 = new TribbleDB([
    ["urn:ró:person:alice", "name", "Alice Smith"], // duplicate
    ["urn:ró:person:alice", "email", "alice@example.com"], // new
    ["urn:ró:company:acme", "name", "Acme Corp"], // new
  ]);

  db1.merge(db2);

  assertEquals(db1.triplesCount, 4); // alice.name, alice.age, alice.email, acme.name

  // Test URN search functionality
  const aliceResults = db1.search({ source: { type: "person", id: "alice" } });
  assertEquals(aliceResults.triplesCount, 3);

  const companyResults = db1.search({ source: { type: "company", id: "acme" } });
  assertEquals(companyResults.triplesCount, 1);
});

Deno.test("TribbleDB.merge() chain multiple merges", () => {
  const db1 = new TribbleDB([["person:alice", "name", "Alice"]]);
  const db2 = new TribbleDB([["person:bob", "name", "Bob"]]);
  const db3 = new TribbleDB([["person:charlie", "name", "Charlie"]]);

  // Chain merges
  const result = db1.merge(db2).merge(db3);

  assertEquals(result, db1); // Returns same instance
  assertEquals(db1.triplesCount, 3);

  // Verify all people are present
  const people = ["alice", "bob", "charlie"];
  for (const person of people) {
    const personResults = db1.search({ source: `person:${person}` });
    assertEquals(personResults.triplesCount, 1);
    assertEquals(personResults.firstTriple()![1], "name");
  }
});

Deno.test("TribbleDB.merge() with special characters and edge cases", () => {
  const db1 = new TribbleDB([
    ["", "empty_source", "value"],
    ["source", "", "empty_relation"],
  ]);

  const db2 = new TribbleDB([
    ["", "empty_source", "value"], // duplicate
    ["source", "relation", ""], // empty target
    ["special", "chars", "!@#$%^&*()"], // special characters
  ]);

  db1.merge(db2);

  assertEquals(db1.triplesCount, 4); // 2 original + 2 new (1 duplicate filtered out)

  const allTriples = db1.triples();
  
  // Verify special character triple was added
  const specialTriple = allTriples.find(t => t[2] === "!@#$%^&*()");
  assertEquals(specialTriple !== undefined, true);
  assertEquals(specialTriple![0], "special");

  // Verify empty target triple was added
  const emptyTargetTriple = allTriples.find(t => t[2] === "" && t[0] === "source");
  assertEquals(emptyTargetTriple !== undefined, true);
});

Deno.test("TribbleDB.merge() performance with large datasets", () => {
  // Create databases with many triples, some overlapping
  const db1Triples: Triple[] = [];
  const db2Triples: Triple[] = [];

  // db1: entities 0-99 with "type: original"
  for (let idx = 0; idx < 100; idx++) {
    db1Triples.push([`entity:${idx}`, "type", "original"]);
  }

  // db2: entities 50-149, with entities 50-99 being duplicates (same value) 
  // and entities 100-149 being new
  for (let idx = 50; idx < 100; idx++) { 
    db2Triples.push([`entity:${idx}`, "type", "original"]); // exact duplicates
  }
  for (let idx = 100; idx < 150; idx++) { 
    db2Triples.push([`entity:${idx}`, "type", "second"]); // new entities
  }

  const db1 = new TribbleDB(db1Triples);
  const db2 = new TribbleDB(db2Triples);

  db1.merge(db2);

  // Should have 100 original + 50 unique new = 150 total
  // The 50 duplicates (50-99) should not be added again
  assertEquals(db1.triplesCount, 150);

  // Verify entities 0-49 only have "original"
  for (let idx = 0; idx < 50; idx++) {
    const entityResults = db1.search({ source: `entity:${idx}` });
    assertEquals(entityResults.triplesCount, 1);
    assertEquals(entityResults.firstTriple()![2], "original");
  }

  // Verify entities 50-99 still only have "original" (duplicates were not added)
  for (let idx = 50; idx < 100; idx++) {
    const entityResults = db1.search({ source: `entity:${idx}` });
    assertEquals(entityResults.triplesCount, 1);
    assertEquals(entityResults.firstTriple()![2], "original");
  }

  // Verify entities 100-149 have "second"
  for (let idx = 100; idx < 150; idx++) {
    const entityResults = db1.search({ source: `entity:${idx}` });
    assertEquals(entityResults.triplesCount, 1);
    assertEquals(entityResults.firstTriple()![2], "second");
  }
});