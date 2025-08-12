import { assertEquals } from "jsr:@std/assert";
import { TribbleDB } from "./tribble-db.ts";
import type { Triple } from "./types.ts";
import { Triples } from "./triples.ts";
import { asUrn } from "./urn.ts";

const testTriples: Triple[] = [
  ["urn:ró:person:alice", "name", "Alice Smith"],
  ["urn:ró:person:bob", "name", "Bob Jones"],
  ["urn:ró:person:alice", "age", "30"],
  ["urn:ró:person:bob", "age", "25"],
  ["urn:ró:person:alice", "works_at", "urn:ró:company:acme"],
  ["urn:ró:person:bob", "works_at", "urn:ró:company:globex"],
  ["urn:ró:company:acme", "name", "Acme Corp"],
  ["urn:ró:company:globex", "name", "Globex Industries"],
  ["urn:ró:animal:cat?breed=persian", "species", "felis_catus"],
  ["urn:ró:animal:dog?breed=labrador", "species", "canis_lupus"],
  ["urn:ró:animal:cat?breed=siamese", "species", "felis_catus"],
];

Deno.test("search by source type returns all matching triples", () => {
  const database = new TribbleDB(testTriples);
  const results = database.search({ source: { type: "person" } });

  assertEquals(results.triplesCount, 6);
  assertEquals(
    results.triples().every((triple: Triple) => {
      const parsed = asUrn(Triples.source(triple));
      return parsed.type === "person";
    }),
    true,
  );
});

Deno.test("search by source id returns all matching triples", () => {
  const database = new TribbleDB(testTriples);
  const results = database.search({ source: { id: "alice" } });

  assertEquals(results.triplesCount, 3);
  assertEquals(
    results.triples().every((triple: Triple) => {
      const parsed = asUrn(Triples.source(triple));
      return parsed.id === "alice";
    }),
    true,
  );
});

Deno.test("search by source query string returns matching triples", () => {
  const database = new TribbleDB(testTriples);
  const results = database.search({
    source: { qs: { breed: "persian" } },
  });

  assertEquals(results.triplesCount, 1);
  assertEquals(
    Triples.source(results.firstTriple()!),
    "urn:ró:animal:cat?breed=persian",
  );
});

Deno.test("search by relation returns all matching triples", () => {
  const database = new TribbleDB(testTriples);
  const results = database.search({ relation: "name" });

  assertEquals(results.triplesCount, 4);
  assertEquals(
    results.triples().every((triple: Triple) =>
      Triples.relation(triple) === "name"
    ),
    true,
  );
});

Deno.test("search by target type returns all matching triples", () => {
  const database = new TribbleDB(testTriples);
  const results = database.search({ target: { type: "company" } });

  assertEquals(results.triplesCount, 2);
  assertEquals(
    results.triples().every((triple: Triple) => {
      const parsed = asUrn(Triples.target(triple));
      return parsed.type === "company";
    }),
    true,
  );
});

Deno.test("search by target id returns all matching triples", () => {
  const database = new TribbleDB(testTriples);
  const results = database.search({ target: { id: "acme" } });

  assertEquals(results.triplesCount, 1);
  assertEquals(Triples.target(results.firstTriple()!), "urn:ró:company:acme");
});

Deno.test("search with multiple source constraints returns intersection", () => {
  const database = new TribbleDB(testTriples);
  const results = database.search({
    source: { type: "person", id: "alice" },
  });

  assertEquals(results.triplesCount, 3);
  assertEquals(
    results.triples().every((triple: Triple) => {
      const parsed = asUrn(Triples.source(triple));
      return parsed.type === "person" && parsed.id === "alice";
    }),
    true,
  );
});

Deno.test("search with source and relation constraints returns intersection", () => {
  const database = new TribbleDB(testTriples);
  const results = database.search({
    source: { type: "person" },
    relation: "name",
  });

  assertEquals(results.triplesCount, 2);
  assertEquals(
    results.triples().every((triple: Triple) => {
      const parsed = asUrn(Triples.source(triple));
      return parsed.type === "person" && Triples.relation(triple) === "name";
    }),
    true,
  );
});

Deno.test("search with all constraint types returns precise intersection", () => {
  const database = new TribbleDB(testTriples);
  const results = database.search({
    source: { type: "person", id: "alice" },
    relation: "works_at",
    target: { type: "company" },
  });

  assertEquals(results.triplesCount, 1);
  assertEquals(results.firstTriple()!, [
    "urn:ró:person:alice",
    "works_at",
    "urn:ró:company:acme",
  ]);
});

Deno.test("search with multiple query string constraints returns intersection", () => {
  const database = new TribbleDB([
    ["urn:ró:animal:cat?breed=persian&color=white", "species", "felis_catus"],
    ["urn:ró:animal:cat?breed=persian&color=black", "species", "felis_catus"],
    ["urn:ró:animal:cat?breed=siamese&color=white", "species", "felis_catus"],
  ]);

  const results = database.search({
    source: { qs: { breed: "persian", color: "white" } },
  });

  assertEquals(results.triplesCount, 1);
  assertEquals(
    Triples.source(results.firstTriple()!),
    "urn:ró:animal:cat?breed=persian&color=white",
  );
});

Deno.test("search with non-existent source type returns empty array", () => {
  const database = new TribbleDB(testTriples);
  const results = database.search({ source: { type: "vehicle" } });

  assertEquals(results.triplesCount, 0);
});

Deno.test("search with non-existent source id returns empty array", () => {
  const database = new TribbleDB(testTriples);
  const results = database.search({ source: { id: "charlie" } });

  assertEquals(results.triplesCount, 0);
});

Deno.test("search with non-existent relation returns empty array", () => {
  const database = new TribbleDB(testTriples);
  const results = database.search({ relation: "drives" });

  assertEquals(results.triplesCount, 0);
});

Deno.test("search with non-existent target type returns empty array", () => {
  const database = new TribbleDB(testTriples);
  const results = database.search({ target: { type: "building" } });

  assertEquals(results.triplesCount, 0);
});

Deno.test("search with non-existent query string returns empty array", () => {
  const database = new TribbleDB(testTriples);
  const results = database.search({ source: { qs: { color: "purple" } } });

  assertEquals(results.triplesCount, 0);
});

Deno.test("search with conflicting constraints returns empty array", () => {
  const database = new TribbleDB(testTriples);
  const results = database.search({
    source: { type: "person" },
    target: { type: "person" },
  });

  assertEquals(results.triplesCount, 0);
});

Deno.test("search with partial constraint match returns empty when other constraints fail", () => {
  const database = new TribbleDB(testTriples);
  const results = database.search({
    source: { type: "person", id: "alice" },
    relation: "drives",
  });

  assertEquals(results.triplesCount, 0);
});

Deno.test("search with empty parameters returns all triples", () => {
  const database = new TribbleDB(testTriples);
  const results = database.search({});

  assertEquals(results.triplesCount, testTriples.length);
  assertEquals(results.triples(), testTriples);
});

Deno.test("search handles non-URN source strings correctly", () => {
  const nonUrnTriples: Triple[] = [
    ["simple_string", "relation", "target"],
    ["another_string", "relation", "target2"],
  ];
  const database = new TribbleDB(nonUrnTriples);
  const results = database.search({ source: { type: "unknown" } });

  assertEquals(results.triplesCount, 2);
});

Deno.test("search with target query string constraints works correctly", () => {
  const targetQsTriples: Triple[] = [
    ["source1", "points_to", "urn:ró:location:park?city=boston"],
    ["source2", "points_to", "urn:ró:location:park?city=newyork"],
    ["source3", "points_to", "urn:ró:location:museum?city=boston"],
  ];
  const database = new TribbleDB(targetQsTriples);
  const results = database.search({
    target: { type: "location", qs: { city: "boston" } },
  });

  assertEquals(results.triplesCount, 2);
  assertEquals(
    results.triples().every((triple: Triple) => {
      const parsed = asUrn(Triples.target(triple));
      return parsed.type === "location" && parsed.qs.city === "boston";
    }),
    true,
  );
});

Deno.test("search with source predicate filters results correctly", () => {
  const database = new TribbleDB(testTriples);
  const results = database.search({
    source: {
      type: "person",
      predicate: (source: string) => {
        const parsed = asUrn(source);
        return parsed.id === "alice";
      },
    },
  });

  assertEquals(results.triplesCount, 3);
  assertEquals(
    results.triples().every((triple: Triple) => {
      const parsed = asUrn(Triples.source(triple));
      return parsed.id === "alice";
    }),
    true,
  );
});

Deno.test("search with target predicate filters results correctly", () => {
  const database = new TribbleDB(testTriples);
  const results = database.search({
    target: {
      predicate: (target: string) => {
        const parsed = asUrn(target);
        return parsed.type === "company";
      },
    },
  });

  assertEquals(results.triplesCount, 2);
  assertEquals(
    results.triples().every((triple: Triple) => {
      const parsed = asUrn(Triples.target(triple));
      return parsed.type === "company";
    }),
    true,
  );
});

Deno.test("search with both source and target predicates applies both filters", () => {
  const database = new TribbleDB(testTriples);
  const results = database.search({
    source: {
      type: "person",
      predicate: (source: string) => {
        const parsed = asUrn(source);
        return parsed.id === "alice";
      },
    },
    target: {
      predicate: (target: string) => {
        const parsed = asUrn(target);
        return parsed.type === "company";
      },
    },
  });

  assertEquals(results.triplesCount, 1);
  assertEquals(results.firstTriple()!, [
    "urn:ró:person:alice",
    "works_at",
    "urn:ró:company:acme",
  ]);
});

Deno.test("search with predicate that matches nothing returns empty array", () => {
  const database = new TribbleDB(testTriples);
  const results = database.search({
    source: {
      type: "person",
      predicate: (source: string) => {
        const parsed = asUrn(source);
        return parsed.id === "charlie";
      },
    },
  });

  assertEquals(results.triplesCount, 0);
});

Deno.test("search with complex predicate logic works correctly", () => {
  const database = new TribbleDB(testTriples);
  const results = database.search({
    source: {
      predicate: (source: string) => {
        const hasAge30 = testTriples.some((triple) =>
          Triples.source(triple) === source &&
          Triples.relation(triple) === "age" && Triples.target(triple) === "30"
        );
        return hasAge30;
      },
    },
  });

  assertEquals(results.triplesCount, 3);
  assertEquals(
    results.triples().every((triple: Triple) => {
      const parsed = asUrn(Triples.source(triple));
      return parsed.id === "alice";
    }),
    true,
  );
});

Deno.test("search with predicate combined with index constraints works correctly", () => {
  const database = new TribbleDB(testTriples);
  const results = database.search({
    source: {
      type: "person",
      predicate: (source: string) => {
        const parsed = asUrn(source);
        return parsed.id === "bob";
      },
    },
    relation: "name",
  });

  assertEquals(results.triplesCount, 1);
  assertEquals(results.firstTriple()!, [
    "urn:ró:person:bob",
    "name",
    "Bob Jones",
  ]);
});

Deno.test("search with DslRelation containing multiple relations returns union", () => {
  const database = new TribbleDB(testTriples);
  const results = database.search({
    relation: { relation: ["name", "age"] },
  });

  assertEquals(results.triplesCount, 6);
  assertEquals(
    results.triples().every((triple: Triple) => {
      const rel = Triples.relation(triple);
      return rel === "name" || rel === "age";
    }),
    true,
  );
});

Deno.test("search with DslRelation containing single relation works like string", () => {
  const database = new TribbleDB(testTriples);
  const resultsWithDsl = database.search({
    relation: { relation: ["name"] },
  });
  const resultsWithString = database.search({
    relation: "name",
  });

  assertEquals(resultsWithDsl.triplesCount, resultsWithString.triplesCount);
  assertEquals(resultsWithDsl.triples(), resultsWithString.triples());
});

Deno.test("search with DslRelation containing non-existent relations returns empty", () => {
  const database = new TribbleDB(testTriples);
  const results = database.search({
    relation: { relation: ["non_existent", "also_missing"] },
  });

  assertEquals(results.triplesCount, 0);
});

Deno.test("search with DslRelation mixed existing and non-existent relations returns partial", () => {
  const database = new TribbleDB(testTriples);
  const results = database.search({
    relation: { relation: ["name", "non_existent", "age"] },
  });

  assertEquals(results.triplesCount, 6);
  assertEquals(
    results.triples().every((triple: Triple) => {
      const rel = Triples.relation(triple);
      return rel === "name" || rel === "age";
    }),
    true,
  );
});

Deno.test("search with DslRelation and relation predicate filters correctly", () => {
  const database = new TribbleDB(testTriples);
  const results = database.search({
    relation: {
      relation: ["name", "age", "works_at"],
      predicate: (rel: string) => rel.length <= 4, // "name", "age" have 4 or fewer chars
    },
  });

  assertEquals(results.triplesCount, 6);
  assertEquals(
    results.triples().every((triple: Triple) => {
      const rel = Triples.relation(triple);
      return rel === "name" || rel === "age";
    }),
    true,
  );
});

Deno.test("search with DslRelation predicate only (no relation array)", () => {
  const database = new TribbleDB(testTriples);
  const results = database.search({
    relation: {
      relation: [], // Empty array means all relations initially
      predicate: (rel: string) => rel.startsWith("w"), // Relations starting with "w"
    },
  });

  // Since relation array is empty, no relations will match initially
  assertEquals(results.triplesCount, 0);
});

Deno.test("search with DslRelation and other constraints works correctly", () => {
  const database = new TribbleDB(testTriples);
  const results = database.search({
    source: { type: "person" },
    relation: { relation: ["name", "age"] },
    target: { predicate: (target: string) => target.includes("3") }, // "30" contains "3"
  });

  assertEquals(results.triplesCount, 1);
  assertEquals(results.firstTriple()!, [
    "urn:ró:person:alice",
    "age",
    "30",
  ]);
});

Deno.test("search with complex DslRelation predicate based on triple context", () => {
  const database = new TribbleDB(testTriples);
  const results = database.search({
    source: { type: "person" },
    relation: {
      relation: ["name", "age", "works_at"],
      predicate: (rel: string) => {
        // Only include relations that are either "name" or start with "w"
        return rel === "name" || rel.startsWith("w");
      },
    },
  });

  assertEquals(results.triplesCount, 4); // 2 names + 2 works_at
  assertEquals(
    results.triples().every((triple: Triple) => {
      const rel = Triples.relation(triple);
      const parsed = asUrn(Triples.source(triple));
      return parsed.type === "person" && (rel === "name" || rel === "works_at");
    }),
    true,
  );
});
