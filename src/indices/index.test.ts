import { assertEquals } from "jsr:@std/assert";
import { TribbleDB } from "../tribble-db.ts";
import type { Triple } from "../types.ts";
import { Triples } from "../triples.ts";
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

// Simple test triples for testing string-based API (no URNs)
const simpleTestTriples: Triple[] = [
  ["alice", "name", "Alice Smith"],
  ["alice", "age", "30"],
  ["alice", "works_for", "acme"],
  ["bob", "name", "Bob Jones"],
  ["bob", "age", "25"],
  ["bob", "works_for", "techcorp"],
  ["charlie", "name", "Charlie Brown"],
  ["charlie", "likes", "alice"],
  ["charlie", "likes", "bob"],
  ["acme", "name", "ACME Corp"],
  ["acme", "industry", "manufacturing"],
  ["techcorp", "name", "TechCorp Inc"],
  ["techcorp", "industry", "technology"],
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

// New API Tests: source and target as strings, relation as array

Deno.test("search with source as string maps to id constraint", () => {
  const database = new TribbleDB(simpleTestTriples);
  const results = database.search({ source: "alice" });

  assertEquals(results.triplesCount, 3);
  assertEquals(
    results.triples().every((triple: Triple) => {
      const parsed = asUrn(Triples.source(triple));
      return parsed.id === "alice";
    }),
    true,
  );
});

Deno.test("search with target as string maps to id constraint", () => {
  const database = new TribbleDB(simpleTestTriples);
  const results = database.search({ target: "acme" });

  assertEquals(results.triplesCount, 1);
  assertEquals(results.firstTriple()!, [
    "alice",
    "works_for",
    "acme",
  ]);
});

Deno.test("search with relation as array of strings returns union", () => {
  const database = new TribbleDB(testTriples);
  const results = database.search({ relation: ["name", "age"] });

  assertEquals(results.triplesCount, 6);
  assertEquals(
    results.triples().every((triple: Triple) => {
      const rel = Triples.relation(triple);
      return rel === "name" || rel === "age";
    }),
    true,
  );
});

Deno.test("search with single item relation array works like string", () => {
  const database = new TribbleDB(testTriples);
  const resultsWithArray = database.search({ relation: ["name"] });
  const resultsWithString = database.search({ relation: "name" });

  assertEquals(resultsWithArray.triplesCount, resultsWithString.triplesCount);
  assertEquals(resultsWithArray.triples(), resultsWithString.triples());
});

Deno.test("search with empty relation array returns no results", () => {
  const database = new TribbleDB(testTriples);
  const results = database.search({ relation: [] });

  assertEquals(results.triplesCount, 0);
});

Deno.test("search combining string source and array relation", () => {
  const database = new TribbleDB(simpleTestTriples);
  const results = database.search({
    source: "alice",
    relation: ["name", "age"],
  });

  assertEquals(results.triplesCount, 2);
  assertEquals(
    results.triples().every((triple: Triple) => {
      const parsed = asUrn(Triples.source(triple));
      const rel = Triples.relation(triple);
      return parsed.id === "alice" && (rel === "name" || rel === "age");
    }),
    true,
  );
});

Deno.test("search with string source, string target, and array relation", () => {
  const database = new TribbleDB(simpleTestTriples);
  const results = database.search({
    source: "alice",
    target: "acme",
    relation: ["works_for", "manages"],
  });

  assertEquals(results.triplesCount, 1);
  assertEquals(results.firstTriple()!, [
    "alice",
    "works_for",
    "acme",
  ]);
});

Deno.test("search with non-existent string source returns empty", () => {
  const database = new TribbleDB(simpleTestTriples);
  const results = database.search({ source: "nonexistent" });

  assertEquals(results.triplesCount, 0);
});

Deno.test("search with non-existent string target returns empty", () => {
  const database = new TribbleDB(simpleTestTriples);
  const results = database.search({ target: "nonexistent" });

  assertEquals(results.triplesCount, 0);
});

Deno.test("search mixing old and new API works correctly", () => {
  const database = new TribbleDB(simpleTestTriples);
  const results = database.search({
    source: "alice", // New API (string maps to id)
    target: "acme", // New API (string maps to id)
    relation: ["works_for"], // New API (array of strings)
  });

  assertEquals(results.triplesCount, 1);
  assertEquals(results.firstTriple()!, [
    "alice",
    "works_for",
    "acme",
  ]);
});

Deno.test("search with string source only", () => {
  const database = new TribbleDB(simpleTestTriples);
  const results = database.search({ source: "alice" });

  assertEquals(results.triplesCount, 3);
  assertEquals(
    results.triples().every((triple: Triple) =>
      Triples.source(triple) === "alice"
    ),
    true,
  );
});

Deno.test("search with string target only", () => {
  const database = new TribbleDB(simpleTestTriples);
  const results = database.search({ target: "alice" });

  assertEquals(results.triplesCount, 1);
  assertEquals(results.firstTriple()!, [
    "charlie",
    "likes",
    "alice",
  ]);
});

Deno.test("search with array relation only", () => {
  const database = new TribbleDB(simpleTestTriples);
  const results = database.search({ relation: ["name", "age"] });

  const nameAgeTriples = simpleTestTriples.filter((triple) => {
    const rel = Triples.relation(triple);
    return rel === "name" || rel === "age";
  });

  assertEquals(results.triplesCount, nameAgeTriples.length);
  assertEquals(
    results.triples().every((triple: Triple) => {
      const rel = Triples.relation(triple);
      return rel === "name" || rel === "age";
    }),
    true,
  );
});

Deno.test("validateTriples enforces photo_count and description relation", () => {
  // photo_count must be a positive integer string
  const photoCountValidator = (
    _type: string,
    _relation: string,
    target: string,
  ) => {
    return /^\d+$/.test(target) && Number(target) > 0
      ? undefined
      : "photo_count must be a positive integer";
  };
  // description must be a non-empty string
  const descriptionValidator = (
    _type: string,
    _relation: string,
    target: string,
  ) => {
    return target.length > 0 ? undefined : "description must be non-empty";
  };

  const validations = {
    photo_count: photoCountValidator,
    description: descriptionValidator,
  };

  const db = new TribbleDB([], validations);

  // Valid triples
  db.validateTriples([
    ["urn:ró:album:foo", "photo_count", "42"],
    ["urn:ró:album:foo", "description", "A nice album"],
  ]);

  // Invalid photo_count
  let threwPhotoCount = false;
  try {
    db.validateTriples([
      ["urn:ró:album:foo", "photo_count", "-1"],
    ]);
  } catch (err) {
    threwPhotoCount = String(err).includes(
      "photo_count must be a positive integer",
    );
  }
  if (!threwPhotoCount) {
    throw new Error("Expected error for invalid photo_count");
  }

  // Invalid description
  let threwDescription = false;
  try {
    db.validateTriples([
      ["urn:ró:album:foo", "description", ""],
    ]);
  } catch (err) {
    threwDescription = String(err).includes("description must be non-empty");
  }
  if (!threwDescription) {
    throw new Error("Expected error for empty description");
  }
});

// Tests for array-based search parameters [source, relation, target]
// Note: These tests assume array overload is implemented for search method
Deno.test("search with array params [source, relation, target] works", () => {
  const database = new TribbleDB(simpleTestTriples);
  const results = database.search(
    ["alice", "name", undefined] as unknown as Parameters<
      typeof database.search
    >[0],
  );

  assertEquals(results.triplesCount, 1);
  assertEquals(results.firstTriple()!, ["alice", "name", "Alice Smith"]);
});

Deno.test("search with array params [source, undefined, target] works", () => {
  const database = new TribbleDB(simpleTestTriples);
  const results = database.search(
    ["alice", undefined, "acme"] as unknown as Parameters<
      typeof database.search
    >[0],
  );

  assertEquals(results.triplesCount, 1);
  assertEquals(results.firstTriple()!, ["alice", "works_for", "acme"]);
});

Deno.test("search with array params [undefined, relation, target] works", () => {
  const database = new TribbleDB(simpleTestTriples);
  const results = database.search(
    [undefined, "likes", "alice"] as unknown as Parameters<
      typeof database.search
    >[0],
  );

  assertEquals(results.triplesCount, 1);
  assertEquals(results.firstTriple()!, ["charlie", "likes", "alice"]);
});

Deno.test("search with array params [source, undefined, undefined] works", () => {
  const database = new TribbleDB(simpleTestTriples);
  const results = database.search(
    ["alice", undefined, undefined] as unknown as Parameters<
      typeof database.search
    >[0],
  );

  assertEquals(results.triplesCount, 3);
  assertEquals(
    results.triples().every((triple: Triple) =>
      Triples.source(triple) === "alice"
    ),
    true,
  );
});

Deno.test("search with array params [undefined, relation, undefined] works", () => {
  const database = new TribbleDB(simpleTestTriples);
  const results = database.search(
    [undefined, "name", undefined] as unknown as Parameters<
      typeof database.search
    >[0],
  );

  assertEquals(results.triplesCount, 5); // alice, bob, charlie, acme, techcorp all have names
  assertEquals(
    results.triples().every((triple: Triple) =>
      Triples.relation(triple) === "name"
    ),
    true,
  );
});

Deno.test("search with array params [undefined, undefined, target] works", () => {
  const database = new TribbleDB(simpleTestTriples);
  const results = database.search(
    [undefined, undefined, "alice"] as unknown as Parameters<
      typeof database.search
    >[0],
  );

  assertEquals(results.triplesCount, 1);
  assertEquals(results.firstTriple()!, ["charlie", "likes", "alice"]);
});

Deno.test("search with array params all defined works", () => {
  const database = new TribbleDB(simpleTestTriples);
  const results = database.search(
    ["alice", "works_for", "acme"] as unknown as Parameters<
      typeof database.search
    >[0],
  );

  assertEquals(results.triplesCount, 1);
  assertEquals(results.firstTriple()!, ["alice", "works_for", "acme"]);
});

Deno.test("search with array params using array relations works", () => {
  const database = new TribbleDB(simpleTestTriples);
  const results = database.search(
    ["alice", ["name", "age"], undefined] as unknown as Parameters<
      typeof database.search
    >[0],
  );

  assertEquals(results.triplesCount, 2);
  assertEquals(
    results.triples().every((triple: Triple) => {
      const rel = Triples.relation(triple);
      return rel === "name" || rel === "age";
    }),
    true,
  );
});

Deno.test("search with array params using Dsl objects works", () => {
  const database = new TribbleDB(testTriples);
  const results = database.search(
    [{ type: "person" }, "name", undefined] as unknown as Parameters<
      typeof database.search
    >[0],
  );

  assertEquals(results.triplesCount, 2);
  assertEquals(
    results.triples().every((triple: Triple) => {
      const parsed = asUrn(Triples.source(triple));
      return parsed.type === "person" && Triples.relation(triple) === "name";
    }),
    true,
  );
});

Deno.test("search with array params non-existent values returns empty", () => {
  const database = new TribbleDB(simpleTestTriples);
  const results = database.search(
    ["nonexistent", undefined, undefined] as unknown as Parameters<
      typeof database.search
    >[0],
  );

  assertEquals(results.triplesCount, 0);
});

Deno.test("search with array params all undefined throws error", () => {
  const database = new TribbleDB(simpleTestTriples);

  let threwError = false;
  try {
    database.search(
      [undefined, undefined, undefined] as unknown as Parameters<
        typeof database.search
      >[0],
    );
  } catch (err) {
    threwError = String(err).includes(
      "At least one search parameter must be defined",
    );
  }

  if (!threwError) {
    throw new Error("Expected error for all undefined parameters");
  }
});

// New tests: relation 'name' with an array of target ids should match any
Deno.test("search with relation 'name' and array of targets", () => {
  const database = new TribbleDB(simpleTestTriples);
  const results = database.search({
    relation: "name",
    target: ["Alice Smith", "Charlie Brown"],
  });
  console.log(simpleTestTriples);

  assertEquals(results.triplesCount, 2);
  const triples = results.triples();
  // All relations are 'name'
  assertEquals(triples.every((t) => Triples.relation(t) === "name"), true);
  // Matched targets are exactly the requested ones
  const targets = new Set(triples.map((t) => Triples.target(t)));
  assertEquals(targets.has("Alice Smith"), true);
  assertEquals(targets.has("Charlie Brown"), true);
});

// Tests for URN-style source queries (urn:ró:bird:chicken format)
const birdTestTriples: Triple[] = [
  ["urn:ró:bird:chicken", "species", "gallus_gallus"],
  ["urn:ró:bird:chicken", "color", "brown"],
  ["urn:ró:bird:chicken", "habitat", "farm"],
  ["urn:ró:bird:sparrow", "species", "passer_domesticus"],
  ["urn:ró:bird:eagle", "species", "aquila_chrysaetos"],
  ["urn:ró:bird:eagle", "habitat", "mountains"],
  ["urn:ró:mammal:cow", "species", "bos_taurus"],
  ["urn:ró:mammal:cow", "habitat", "farm"],
];

Deno.test("search with URN string source: urn:ró:bird:chicken", () => {
  const database = new TribbleDB(birdTestTriples);
  const results = database.search({ source: "urn:ró:bird:chicken" });

  assertEquals(results.triplesCount, 3);
  assertEquals(
    results.triples().every((triple: Triple) =>
      Triples.source(triple) === "urn:ró:bird:chicken"
    ),
    true,
  );

  // Verify we get all expected relations for the chicken
  const relations = new Set(results.triples().map(Triples.relation));
  assertEquals(relations.has("species"), true);
  assertEquals(relations.has("color"), true);
  assertEquals(relations.has("habitat"), true);
});

Deno.test("search with URN string source: urn:ró:bird:eagle", () => {
  const database = new TribbleDB(birdTestTriples);
  const results = database.search({ source: "urn:ró:bird:eagle" });

  assertEquals(results.triplesCount, 2);
  assertEquals(
    results.triples().every((triple: Triple) =>
      Triples.source(triple) === "urn:ró:bird:eagle"
    ),
    true,
  );
});

Deno.test("search with URN string source combined with relation filter", () => {
  const database = new TribbleDB(birdTestTriples);
  const results = database.search({
    source: "urn:ró:bird:chicken",
    relation: "species",
  });

  assertEquals(results.triplesCount, 1);
  assertEquals(results.firstTriple()!, [
    "urn:ró:bird:chicken",
    "species",
    "gallus_gallus",
  ]);
});

Deno.test("search with URN string source combined with target filter", () => {
  const database = new TribbleDB(birdTestTriples);
  const results = database.search({
    source: "urn:ró:bird:chicken",
    target: "farm",
  });

  assertEquals(results.triplesCount, 1);
  assertEquals(results.firstTriple()!, [
    "urn:ró:bird:chicken",
    "habitat",
    "farm",
  ]);
});

Deno.test("search with URN string source and complete triple match", () => {
  const database = new TribbleDB(birdTestTriples);
  const results = database.search({
    source: "urn:ró:bird:chicken",
    relation: "color",
    target: "brown",
  });

  assertEquals(results.triplesCount, 1);
  assertEquals(results.firstTriple()!, [
    "urn:ró:bird:chicken",
    "color",
    "brown",
  ]);
});

Deno.test("search with non-existent URN string source returns empty", () => {
  const database = new TribbleDB(birdTestTriples);
  const results = database.search({ source: "urn:ró:bird:penguin" });

  assertEquals(results.triplesCount, 0);
});

Deno.test("search with URN string source using array format", () => {
  const database = new TribbleDB(birdTestTriples);
  const results = database.search([
    "urn:ró:bird:chicken",
    "species",
    undefined,
  ] as unknown as Parameters<typeof database.search>[0]);

  assertEquals(results.triplesCount, 1);
  assertEquals(results.firstTriple()!, [
    "urn:ró:bird:chicken",
    "species",
    "gallus_gallus",
  ]);
});

Deno.test("search with multiple URN string sources using array", () => {
  const database = new TribbleDB(birdTestTriples);
  const results = database.search({
    source: ["urn:ró:bird:chicken", "urn:ró:bird:eagle"],
  });

  assertEquals(results.triplesCount, 5); // 3 chicken + 2 eagle
  assertEquals(
    results.triples().every((triple: Triple) => {
      const src = Triples.source(triple);
      return src === "urn:ró:bird:chicken" || src === "urn:ró:bird:eagle";
    }),
    true,
  );
});

Deno.test("search URN string that matches type and id pattern correctly", () => {
  const database = new TribbleDB(birdTestTriples);
  
  // Search by type using DSL should include our chicken
  const typeResults = database.search({ source: { type: "bird" } });
  assertEquals(typeResults.triplesCount, 6); // chicken(3) + sparrow(1) + eagle(2)  // Search by id using DSL should match our chicken
  const idResults = database.search({ source: { id: "chicken" } });
  assertEquals(idResults.triplesCount, 3);

  // Direct URN string search should work the same
  const urnResults = database.search({ source: "urn:ró:bird:chicken" });
  assertEquals(urnResults.triplesCount, 3);
  assertEquals(urnResults.triples(), idResults.triples());
});

Deno.test("search with relation 'name' and array of targets (URN dataset)", () => {
  const database = new TribbleDB(testTriples);
  const results = database.search({
    relation: "name",
    target: { id: ["Acme Corp", "Alice Smith"] },
  });

  assertEquals(results.triplesCount, 2);
  const triples = results.triples();
  assertEquals(triples.every((t) => Triples.relation(t) === "name"), true);
  const targets = new Set(triples.map((t) => Triples.target(t)));
  assertEquals(targets.has("Acme Corp"), true);
  assertEquals(targets.has("Alice Smith"), true);

  // Ensure sources align with expected entities
  const sources = new Set(triples.map((t) => Triples.source(t)));
  assertEquals(sources.has("urn:ró:company:acme"), true);
  assertEquals(sources.has("urn:ró:person:alice"), true);
});

Deno.test("search with relation 'name' and array of non-existent targets returns empty", () => {
  const database = new TribbleDB(simpleTestTriples);
  const results = database.search({
    relation: "name",
    target: { id: ["Does Not Exist", "Also Missing"] },
  });

  assertEquals(results.triplesCount, 0);
});

// Test that #object method only includes unique values
Deno.test("objects method returns unique values only", () => {
  // Create triples with duplicate targets for same source-relation pair
  const triplesWithDuplicates: Triple[] = [
    ["alice", "likes", "pizza"],
    ["alice", "likes", "pizza"], // duplicate
    ["alice", "likes", "burgers"],
    ["alice", "likes", "burgers"], // duplicate
    ["alice", "name", "Alice Smith"],
    ["alice", "name", "Alice Smith"], // duplicate single value
    ["bob", "likes", "pizza"],
    ["bob", "likes", "sushi"],
  ];

  const database = new TribbleDB(triplesWithDuplicates);
  const objects = database.objects();

  // Find alice object
  const aliceObj = objects.find((obj) => obj.id === "alice");
  assertEquals(aliceObj !== undefined, true);

  // Alice should have unique likes array
  assertEquals(Array.isArray(aliceObj!.likes), true);
  const aliceLikes = aliceObj!.likes as string[];
  assertEquals(aliceLikes.length, 2);
  assertEquals(aliceLikes.includes("pizza"), true);
  assertEquals(aliceLikes.includes("burgers"), true);
  // Check no duplicates
  assertEquals(new Set(aliceLikes).size, aliceLikes.length);

  // Alice name should be single value (not array since all same)
  assertEquals(aliceObj!.name, "Alice Smith");

  // Bob should have likes array without duplicates
  const bobObj = objects.find((obj) => obj.id === "bob");
  assertEquals(bobObj !== undefined, true);
  const bobLikes = bobObj!.likes as string[];
  assertEquals(Array.isArray(bobLikes), true);
  assertEquals(bobLikes.length, 2);
  assertEquals(new Set(bobLikes).size, bobLikes.length);
});

Deno.test("objects method with listOnly=true ensures arrays with unique values", () => {
  const triplesWithDuplicates: Triple[] = [
    ["alice", "name", "Alice"],
    ["alice", "name", "Alice"], // duplicate
    ["alice", "likes", "pizza"],
    ["alice", "likes", "pizza"], // duplicate
    ["alice", "likes", "burgers"],
  ];

  const database = new TribbleDB(triplesWithDuplicates);
  const objects = database.objects(true); // listOnly=true

  const aliceObj = objects.find((obj) => obj.id === "alice");
  assertEquals(aliceObj !== undefined, true);

  // With listOnly=true, even single name should be array with unique value
  assertEquals(Array.isArray(aliceObj!.name), true);
  const aliceNames = aliceObj!.name as string[];
  assertEquals(aliceNames.length, 1);
  assertEquals(aliceNames[0], "Alice");

  // Likes should be array with unique values
  assertEquals(Array.isArray(aliceObj!.likes), true);
  const aliceLikes = aliceObj!.likes as string[];
  assertEquals(aliceLikes.length, 2);
  assertEquals(new Set(aliceLikes).size, aliceLikes.length);
});
