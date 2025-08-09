import { assertEquals } from "jsr:@std/assert";
import { TribbleDB } from "../index.ts";
import { Triple } from "../types.ts";
import { Triples } from "../index.ts";
import { asUrn } from "../urn.ts";

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
  const results = database.searchArray({ source: { type: "person" } });

  assertEquals(results.length, 6);
  assertEquals(
    results.every((triple: Triple) => {
      const parsed = asUrn(Triples.source(triple));
      return parsed.type === "person";
    }),
    true,
  );
});

Deno.test("search by source id returns all matching triples", () => {
  const database = new TribbleDB(testTriples);
  const results = database.searchArray({ source: { id: "alice" } });

  assertEquals(results.length, 3);
  assertEquals(
    results.every((triple: Triple) => {
      const parsed = asUrn(Triples.source(triple));
      return parsed.id === "alice";
    }),
    true,
  );
});

Deno.test("search by source query string returns matching triples", () => {
  const database = new TribbleDB(testTriples);
  const results = database.searchArray({
    source: { qs: { breed: "persian" } },
  });

  assertEquals(results.length, 1);
  assertEquals(Triples.source(results[0]), "urn:ró:animal:cat?breed=persian");
});

Deno.test("search by relation returns all matching triples", () => {
  const database = new TribbleDB(testTriples);
  const results = database.searchArray({ relation: "name" });

  assertEquals(results.length, 4);
  assertEquals(
    results.every((triple: Triple) => Triples.relation(triple) === "name"),
    true,
  );
});

Deno.test("search by target type returns all matching triples", () => {
  const database = new TribbleDB(testTriples);
  const results = database.searchArray({ target: { type: "company" } });

  assertEquals(results.length, 2);
  assertEquals(
    results.every((triple: Triple) => {
      const parsed = asUrn(Triples.target(triple));
      return parsed.type === "company";
    }),
    true,
  );
});

Deno.test("search by target id returns all matching triples", () => {
  const database = new TribbleDB(testTriples);
  const results = database.searchArray({ target: { id: "acme" } });

  assertEquals(results.length, 1);
  assertEquals(Triples.target(results[0]), "urn:ró:company:acme");
});

Deno.test("search with multiple source constraints returns intersection", () => {
  const database = new TribbleDB(testTriples);
  const results = database.searchArray({
    source: { type: "person", id: "alice" },
  });

  assertEquals(results.length, 3);
  assertEquals(
    results.every((triple: Triple) => {
      const parsed = asUrn(Triples.source(triple));
      return parsed.type === "person" && parsed.id === "alice";
    }),
    true,
  );
});

Deno.test("search with source and relation constraints returns intersection", () => {
  const database = new TribbleDB(testTriples);
  const results = database.searchArray({
    source: { type: "person" },
    relation: "name",
  });

  assertEquals(results.length, 2);
  assertEquals(
    results.every((triple: Triple) => {
      const parsed = asUrn(Triples.source(triple));
      return parsed.type === "person" && Triples.relation(triple) === "name";
    }),
    true,
  );
});

Deno.test("search with all constraint types returns precise intersection", () => {
  const database = new TribbleDB(testTriples);
  const results = database.searchArray({
    source: { type: "person", id: "alice" },
    relation: "works_at",
    target: { type: "company" },
  });

  assertEquals(results.length, 1);
  assertEquals(results[0], [
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

  const results = database.searchArray({
    source: { qs: { breed: "persian", color: "white" } },
  });

  assertEquals(results.length, 1);
  assertEquals(
    Triples.source(results[0]),
    "urn:ró:animal:cat?breed=persian&color=white",
  );
});

Deno.test("search with non-existent source type returns empty array", () => {
  const database = new TribbleDB(testTriples);
  const results = database.searchArray({ source: { type: "vehicle" } });

  assertEquals(results.length, 0);
});

Deno.test("search with non-existent source id returns empty array", () => {
  const database = new TribbleDB(testTriples);
  const results = database.searchArray({ source: { id: "charlie" } });

  assertEquals(results.length, 0);
});

Deno.test("search with non-existent relation returns empty array", () => {
  const database = new TribbleDB(testTriples);
  const results = database.searchArray({ relation: "drives" });

  assertEquals(results.length, 0);
});

Deno.test("search with non-existent target type returns empty array", () => {
  const database = new TribbleDB(testTriples);
  const results = database.searchArray({ target: { type: "building" } });

  assertEquals(results.length, 0);
});

Deno.test("search with non-existent query string returns empty array", () => {
  const database = new TribbleDB(testTriples);
  const results = database.searchArray({ source: { qs: { color: "purple" } } });

  assertEquals(results.length, 0);
});

Deno.test("search with conflicting constraints returns empty array", () => {
  const database = new TribbleDB(testTriples);
  const results = database.searchArray({
    source: { type: "person" },
    target: { type: "person" },
  });

  assertEquals(results.length, 0);
});

Deno.test("search with partial constraint match returns empty when other constraints fail", () => {
  const database = new TribbleDB(testTriples);
  const results = database.searchArray({
    source: { type: "person", id: "alice" },
    relation: "drives",
  });

  assertEquals(results.length, 0);
});

Deno.test("search with empty parameters returns all triples", () => {
  const database = new TribbleDB(testTriples);
  const results = database.searchArray({});

  assertEquals(results.length, testTriples.length);
  assertEquals(results, testTriples);
});

Deno.test("search handles non-URN source strings correctly", () => {
  const nonUrnTriples: Triple[] = [
    ["simple_string", "relation", "target"],
    ["another_string", "relation", "target2"],
  ];
  const database = new TribbleDB(nonUrnTriples);
  const results = database.searchArray({ source: { type: "unknown" } });

  assertEquals(results.length, 2);
});

Deno.test("search with target query string constraints works correctly", () => {
  const targetQsTriples: Triple[] = [
    ["source1", "points_to", "urn:ró:location:park?city=boston"],
    ["source2", "points_to", "urn:ró:location:park?city=newyork"],
    ["source3", "points_to", "urn:ró:location:museum?city=boston"],
  ];
  const database = new TribbleDB(targetQsTriples);
  const results = database.searchArray({
    target: { type: "location", qs: { city: "boston" } },
  });

  assertEquals(results.length, 2);
  assertEquals(
    results.every((triple: Triple) => {
      const parsed = asUrn(Triples.target(triple));
      return parsed.type === "location" && parsed.qs.city === "boston";
    }),
    true,
  );
});

Deno.test("search with source predicate filters results correctly", () => {
  const database = new TribbleDB(testTriples);
  const results = database.searchArray({
    source: {
      type: "person",
      predicate: (source: string) => {
        const parsed = asUrn(source);
        return parsed.id === "alice";
      },
    },
  });

  assertEquals(results.length, 3);
  assertEquals(
    results.every((triple: Triple) => {
      const parsed = asUrn(Triples.source(triple));
      return parsed.id === "alice";
    }),
    true,
  );
});

Deno.test("search with target predicate filters results correctly", () => {
  const database = new TribbleDB(testTriples);
  const results = database.searchArray({
    target: {
      predicate: (target: string) => {
        const parsed = asUrn(target);
        return parsed.type === "company";
      },
    },
  });

  assertEquals(results.length, 2);
  assertEquals(
    results.every((triple: Triple) => {
      const parsed = asUrn(Triples.target(triple));
      return parsed.type === "company";
    }),
    true,
  );
});

Deno.test("search with both source and target predicates applies both filters", () => {
  const database = new TribbleDB(testTriples);
  const results = database.searchArray({
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

  assertEquals(results.length, 1);
  assertEquals(results[0], [
    "urn:ró:person:alice",
    "works_at",
    "urn:ró:company:acme",
  ]);
});

Deno.test("search with predicate that matches nothing returns empty array", () => {
  const database = new TribbleDB(testTriples);
  const results = database.searchArray({
    source: {
      type: "person",
      predicate: (source: string) => {
        const parsed = asUrn(source);
        return parsed.id === "charlie";
      },
    },
  });

  assertEquals(results.length, 0);
});

Deno.test("search with complex predicate logic works correctly", () => {
  const database = new TribbleDB(testTriples);
  const results = database.searchArray({
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

  assertEquals(results.length, 3);
  assertEquals(
    results.every((triple: Triple) => {
      const parsed = asUrn(Triples.source(triple));
      return parsed.id === "alice";
    }),
    true,
  );
});

Deno.test("search with predicate combined with index constraints works correctly", () => {
  const database = new TribbleDB(testTriples);
  const results = database.searchArray({
    source: {
      type: "person",
      predicate: (source: string) => {
        const parsed = asUrn(source);
        return parsed.id === "bob";
      },
    },
    relation: "name",
  });

  assertEquals(results.length, 1);
  assertEquals(results[0], ["urn:ró:person:bob", "name", "Bob Jones"]);
});
