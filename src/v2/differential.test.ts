/*
 * Differential tests: build the same dataset in the v1 and v2 engines,
 * fire generated searches and reads at both, and require identical
 * results. This pins v2's semantics to v1's actual behaviour rather than
 * to a re-statement of it. Seeded PRNG keeps every run reproducible.
 */

import { assertEquals } from "@std/assert";
import { TribbleDB as TribbleV1 } from "../tribble-db.ts";
import { hashTriple } from "../hash.ts";
import { TribbleDB as TribbleV2 } from "./mod.ts";
import type { Search, Triple } from "../types.ts";

/*
 * Deterministic PRNG (mulberry32).
 */
function makeRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6D2B79F5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<Item>(random: () => number, items: Item[]): Item {
  return items[Math.floor(random() * items.length)];
}

/*
 * Generate a photo-site-shaped dataset: places with a containment
 * hierarchy, birds with qs-variant URNs, photos linking to both, plus
 * literal targets (names with spaces, ratings) and injected duplicates.
 */
function generateDataset(random: () => number, photoCount: number): Triple[] {
  const triples: Triple[] = [];

  const places = Array.from({ length: 20 }, (_, idx) => `urn:ró:place:p${idx}`);
  const birds = Array.from({ length: 15 }, (_, idx) => `urn:ró:bird:b${idx}`);
  const albums = Array.from({ length: 10 }, (_, idx) => `a${idx}`);

  for (let idx = 0; idx < places.length - 5; idx++) {
    triples.push([places[idx], "in", places[idx + 5]]);
    triples.push([places[idx], "name", `Place Number ${idx}`]);
  }

  for (let idx = 0; idx < birds.length; idx++) {
    triples.push([birds[idx], "name", `Bird Species ${idx}`]);
    if (idx % 3 === 0) {
      triples.push([birds[idx], "birdwatchUrl", `https://example.com/${idx}`]);
    }
  }

  // component strings reused as literal nodes: "p1" is an id component of
  // a place URN before it appears as a bare target, and "place" is a type
  // component before it appears as a target
  triples.push(["urn:ró:photo:x0", "note", "p1"]);
  triples.push(["urn:ró:photo:x0", "kind", "place"]);

  for (let idx = 0; idx < photoCount; idx++) {
    const photo = `urn:ró:photo:x${idx}`;
    triples.push([photo, "location", pick(random, places)]);
    triples.push([photo, "rating", String(Math.floor(random() * 5))]);
    triples.push([photo, "albumId", pick(random, albums)]);

    const bird = pick(random, birds);
    const context = random() < 0.5 ? "?context=wild" : "";
    triples.push([photo, "subject", `${bird}${context}`]);

    if (random() < 0.1) {
      // duplicate an earlier triple to exercise dedup
      triples.push([...pick(random, triples)] as Triple);
    }
  }

  return triples;
}

/*
 * Generate a random search touching the dataset vocabulary, including
 * misses, shorthands, arrays, predicates, and the empty-relation quirk.
 */
function generateSearch(random: () => number): Search {
  const sourceOptions = [
    undefined,
    "urn:ró:photo:x1",
    { type: "photo" },
    { type: "place" },
    { type: "missing-type" },
    { id: "p1" },
    { id: ["p1", "p2", "b3"] },
    { type: "photo", id: "x2" },
    { predicate: (value: string) => value.includes("photo") },
  ];
  const relationOptions = [
    undefined,
    "location",
    "subject",
    "missing-relation",
    ["location", "subject"],
    [] as string[],
    { relation: "rating", predicate: (value: string) => value === "rating" },
  ];
  const targetOptions = [
    undefined,
    "urn:ró:place:p6",
    "Bird Species 3",
    { type: "bird" },
    { type: "bird", qs: { context: "wild" } },
    { qs: { context: "captive" } },
    { id: "ireland" },
    { predicate: (value: string) => value.startsWith("urn:") },
  ];

  return {
    source: pick(random, sourceOptions),
    relation: pick(random, relationOptions),
    target: pick(random, targetOptions),
  } as Search;
}

function sortedTriples(triples: Triple[]): string[] {
  return triples.map((triple) => triple.join(" | ")).sort();
}

/*
 * Normalise objects() output to compare across engines without depending
 * on result ordering: id -> relation -> sorted values.
 */
function normaliseObjects(
  objects: Record<string, string | string[]>[],
): Record<string, Record<string, string[]>> {
  const normalised: Record<string, Record<string, string[]>> = {};

  for (const obj of objects) {
    const key = String(obj.id);
    const relations: Record<string, string[]> = {};

    for (const [relation, value] of Object.entries(obj)) {
      if (relation === "id") continue;
      const values = Array.isArray(value) ? [...value] : [value];
      relations[relation] = values.sort();
    }
    normalised[key] = relations;
  }

  return normalised;
}

Deno.test("differential: root state matches v1", () => {
  const random = makeRandom(101);
  const dataset = generateDataset(random, 400);

  const v1 = new TribbleV1(dataset);
  const v2 = new TribbleV2(dataset);

  assertEquals(sortedTriples(v2.triples()), sortedTriples(v1.triples()));
  assertEquals(v2.triples(), v1.triples());
  assertEquals(v2.sources(), v1.sources());
  assertEquals(v2.relations(), v1.relations());
  assertEquals(v2.targets(), v1.targets());
  assertEquals(v2.triplesCount, v1.triplesCount);
  assertEquals(v2.objects(), v1.objects());
  assertEquals(v2.objects(true), v1.objects(true));
  assertEquals(v2.firstObject(), v1.firstObject());
  assertEquals(v2.firstTriple(), v1.firstTriple());
});

Deno.test("differential: generated searches match v1", () => {
  const random = makeRandom(202);
  const dataset = generateDataset(random, 400);

  const v1 = new TribbleV1(dataset);
  const v2 = new TribbleV2(dataset);

  for (let round = 0; round < 400; round++) {
    const search = generateSearch(random);

    const fromV1 = v1.search(search);
    const fromV2 = v2.search(search);

    assertEquals(
      sortedTriples(fromV2.triples()),
      sortedTriples(fromV1.triples()),
      `search mismatch: ${JSON.stringify(search)}`,
    );
    assertEquals(fromV2.sources(), fromV1.sources());
    assertEquals(fromV2.targets(), fromV1.targets());
    assertEquals(
      normaliseObjects(fromV2.objects()),
      normaliseObjects(fromV1.objects()),
    );
  }
});

Deno.test("differential: chained searches match v1", () => {
  const random = makeRandom(303);
  const dataset = generateDataset(random, 300);

  const v1 = new TribbleV1(dataset);
  const v2 = new TribbleV2(dataset);

  for (let round = 0; round < 150; round++) {
    const first = generateSearch(random);
    const second = generateSearch(random);

    const fromV1 = v1.search(first).search(second);
    const fromV2 = v2.search(first).search(second);

    assertEquals(
      sortedTriples(fromV2.triples()),
      sortedTriples(fromV1.triples()),
      `chained mismatch: ${JSON.stringify(first)} then ${
        JSON.stringify(second)
      }`,
    );
  }
});

Deno.test("differential: point reads match v1", () => {
  const random = makeRandom(404);
  const dataset = generateDataset(random, 300);

  const v1 = new TribbleV1(dataset);
  const v2 = new TribbleV2(dataset);

  const urns = [
    ...new Set(dataset.map((triple) => triple[0])),
    "urn:ró:photo:missing",
    "urn:ró:bird:b1?context=wild",
  ];

  for (const urn of urns) {
    assertEquals(
      v2.readThing(urn),
      v1.readThing(urn),
      `readThing mismatch for ${urn}`,
    );
    assertEquals(
      v2.readThing(urn, { qs: true }),
      v1.readThing(urn, { qs: true }),
      `readThing qs:true mismatch for ${urn}`,
    );
    assertEquals(
      v2.readThing(urn, { ignoreQs: true }),
      v1.readThing(urn, { qs: true }),
      `readThing ignoreQs alias mismatch for ${urn}`,
    );
  }

  assertEquals(v2.readThings(urns), v1.readThings(urns));
});

Deno.test("differential: search results after mutation match v1", () => {
  const random = makeRandom(505);
  const dataset = generateDataset(random, 200);

  const v1 = new TribbleV1(dataset);
  const v2 = new TribbleV2(dataset);

  const doomed = dataset.filter((_, idx) => idx % 7 === 0);
  v1.delete(doomed);
  v2.delete(doomed);

  const extra: Triple[] = [
    ["urn:ró:photo:new1", "location", "urn:ró:place:p3"],
    ["urn:ró:photo:new1", "rating", "5"],
  ];
  v1.add(extra);
  v2.add(extra);

  assertEquals(sortedTriples(v2.triples()), sortedTriples(v1.triples()));

  for (let round = 0; round < 150; round++) {
    const search = generateSearch(random);
    assertEquals(
      sortedTriples(v2.search(search).triples()),
      sortedTriples(v1.search(search).triples()),
      `post-mutation mismatch: ${JSON.stringify(search)}`,
    );
  }
});

Deno.test("regression: v1 hash collisions drop triples; v2 keeps them", () => {
  // brute-force two distinct triples with the same v1 32-bit triple hash
  const random = makeRandom(606);
  const seen = new Map<number, string>();
  let colliding: [string, string] | undefined = undefined;

  for (let attempt = 0; attempt < 500_000 && !colliding; attempt++) {
    const value = `value-${Math.floor(random() * 2 ** 48).toString(36)}`;
    const tripleHash = hashTriple(["urn:ró:x:1", "name", value]);

    const previous = seen.get(tripleHash);
    if (previous !== undefined && previous !== value) {
      colliding = [previous, value];
    } else {
      seen.set(tripleHash, value);
    }
  }

  if (!colliding) {
    throw new Error("No 32-bit collision found; increase the attempt cap.");
  }

  const triples: Triple[] = [
    ["urn:ró:x:1", "name", colliding[0]],
    ["urn:ró:x:1", "name", colliding[1]],
  ];

  const v1 = new TribbleV1(triples);
  const v2 = new TribbleV2(triples);

  // documents the v1 defect this redesign fixes
  assertEquals(v1.triplesCount, 1);
  assertEquals(v2.triplesCount, 2);
});
