/*
 * Traversal-layer tests: table-based hop/filter cases over a photos-site
 * shaped fixture, plus equivalence checks against the N+1 v1 search loops
 * that the traversal API replaces.
 */

import { assertEquals } from "@std/assert";
import { TribbleDB as TribbleV1 } from "../tribble-db.ts";
import { TribbleDB as TribbleV2 } from "./mod.ts";
import type { NodeView } from "./mod.ts";
import { asUrn } from "../urn.ts";
import type { Triple } from "../types.ts";

const PHOTO_1 = "urn:ró:photo:p1";
const PHOTO_2 = "urn:ró:photo:p2";
const PHOTO_3 = "urn:ró:photo:p3";
const DUBLIN = "urn:ró:place:dublin";
const CORK = "urn:ró:place:cork";
const LEINSTER = "urn:ró:place:leinster";
const MUNSTER = "urn:ró:place:munster";
const IRELAND = "urn:ró:place:ireland";
const ROBIN = "urn:ró:bird:robin";
const ROBIN_WILD = "urn:ró:bird:robin?context=wild";
const SWAN = "urn:ró:bird:swan";
const SPIRE = "urn:ró:place_feature:spire";

const FIXTURE: Triple[] = [
  [PHOTO_1, "location", DUBLIN],
  [PHOTO_1, "subject", ROBIN_WILD],
  [PHOTO_1, "albumId", "a1"],
  [PHOTO_2, "location", CORK],
  [PHOTO_2, "subject", SWAN],
  [PHOTO_2, "albumId", "a1"],
  [PHOTO_3, "location", DUBLIN],
  [PHOTO_3, "subject", ROBIN],
  [PHOTO_3, "albumId", "a2"],
  [DUBLIN, "in", LEINSTER],
  [CORK, "in", MUNSTER],
  [LEINSTER, "in", IRELAND],
  [MUNSTER, "in", IRELAND],
  [DUBLIN, "features", SPIRE],
  [ROBIN, "name", "Robin"],
  [ROBIN, "birdwatchUrl", "https://example.com/robin"],
  [SWAN, "name", "Mute Swan"],
];

type HopCase = {
  name: string;
  build: (db: TribbleV2) => NodeView;
  expected: string[];
};

const HOP_CASES: HopCase[] = [
  {
    name: "follow a relation",
    build: (db) => db.nodes([PHOTO_1, PHOTO_2]).follow("location"),
    expected: [DUBLIN, CORK],
  },
  {
    name: "follow multiple relations",
    build: (db) => db.nodes(PHOTO_1).follow(["location", "subject"]),
    expected: [DUBLIN, ROBIN_WILD],
  },
  {
    name: "follow any relation reaches literals too",
    build: (db) => db.nodes(PHOTO_3).follow(),
    expected: [DUBLIN, ROBIN, "a2"],
  },
  {
    name: "follow transitively",
    build: (db) => db.nodes(DUBLIN).follow("in", { transitive: true }),
    expected: [LEINSTER, IRELAND],
  },
  {
    name: "follow with a where constraint",
    build: (db) =>
      db.nodes(PHOTO_1).follow(undefined, { where: { type: "place" } }),
    expected: [DUBLIN],
  },
  {
    name: "referencedBy finds referring photos across qs variants",
    build: (db) =>
      db.nodes({ type: "bird", id: "robin" }).referencedBy("subject"),
    expected: [PHOTO_1, PHOTO_3],
  },
  {
    name: "select by type and qs",
    build: (db) => db.nodes({ type: "bird", qs: { context: "wild" } }),
    expected: [ROBIN_WILD],
  },
  {
    name: "filter by edge existence",
    build: (db) => db.nodes({ type: "bird" }).filter({ has: "birdwatchUrl" }),
    expected: [ROBIN],
  },
  {
    name: "filter by edge absence",
    build: (db) => db.nodes({ type: "bird" }).filter({ lacks: "birdwatchUrl" }),
    expected: [ROBIN_WILD, SWAN],
  },
  {
    name: "two-hop chain: things to albums",
    build: (db) =>
      db.nodes([ROBIN, ROBIN_WILD])
        .referencedBy("subject")
        .filter({ type: "photo" })
        .follow("albumId"),
    expected: ["a1", "a2"],
  },
  {
    name: "set operations",
    build: (db) =>
      db.nodes({ type: "photo" })
        .subtract(db.nodes(PHOTO_2))
        .intersect(db.nodes([PHOTO_1, PHOTO_2, PHOTO_3])),
    expected: [PHOTO_1, PHOTO_3],
  },
];

for (const hopCase of HOP_CASES) {
  Deno.test(`traverse: ${hopCase.name}`, () => {
    const db = new TribbleV2([...FIXTURE]);
    const result = hopCase.build(db).urns();
    assertEquals(result, new Set(hopCase.expected));
  });
}

Deno.test("traverse: ids() collapses qs-variant URNs", () => {
  const db = new TribbleV2([...FIXTURE]);
  const birdIds = db.nodes({ type: "bird" }).ids();
  assertEquals(birdIds, new Set(["robin", "swan"]));
});

Deno.test("traverse: objectsById omits nodes without outgoing edges", () => {
  const db = new TribbleV2([...FIXTURE]);
  const objects = db.nodes([PHOTO_1, ROBIN_WILD, "urn:ró:photo:missing"])
    .objectsById();

  assertEquals([...objects.keys()], [PHOTO_1]);
  assertEquals(objects.get(PHOTO_1), {
    id: PHOTO_1,
    location: [DUBLIN],
    subject: [ROBIN_WILD],
    albumId: ["a1"],
  });
});

Deno.test("traverse: paths retain provenance across hops", () => {
  const db = new TribbleV2([...FIXTURE]);
  const pairs = db.paths({ type: "photo" })
    .follow("location", { where: { type: "place" } })
    .follow("features")
    .pairs();

  assertEquals(pairs.sort(), [
    [PHOTO_1, SPIRE],
    [PHOTO_3, SPIRE],
  ]);
});

Deno.test("traverse: transitive paths pair starts with every ancestor", () => {
  const db = new TribbleV2([...FIXTURE]);
  const pairs = db.paths(DUBLIN)
    .follow("in", { transitive: true })
    .pairs();

  assertEquals(
    pairs.sort(),
    [
      [DUBLIN, LEINSTER],
      [DUBLIN, IRELAND],
    ].sort(),
  );
});

Deno.test("traverse: view traversal keeps snapshot semantics", () => {
  const db = new TribbleV2([...FIXTURE]);
  const view = db.search({ relation: "albumId" });

  db.delete([[PHOTO_1, "albumId", "a1"]]);

  const fromRoot = db.nodes(PHOTO_1).follow("albumId").urns();
  const fromView = view.nodes(PHOTO_1).follow("albumId").urns();

  assertEquals(fromRoot, new Set());
  assertEquals(fromView, new Set(["a1"]));
});

/*
 * Equivalence with the N+1 patterns from photos.rgrannell.xyz: the
 * traversal expression must return the same data the per-node v1 search
 * loops produce.
 */

Deno.test("traverse: matches v1 N+1 loop for readAlbumsByThingIds", () => {
  const v1 = new TribbleV1([...FIXTURE]);
  const v2 = new TribbleV2([...FIXTURE]);
  const thingUrns = [ROBIN, ROBIN_WILD, SWAN];

  // the loop shape used in photos.../ts/services/albums.ts:133-167
  const photoIds = new Set<string>();
  for (const thingUrn of thingUrns) {
    const { type, id } = asUrn(thingUrn);
    for (const source of v1.search({ target: { type, id } }).sources()) {
      photoIds.add(source);
    }
  }
  const albumIds = new Set<string>();
  for (const photoId of photoIds) {
    const parsed = asUrn(photoId);
    const albums = v1.search({
      source: { type: parsed.type, id: parsed.id },
      relation: "albumId",
    }).targets();
    for (const albumId of albums) {
      albumIds.add(albumId);
    }
  }

  const traversed = v2.nodes(thingUrns)
    .referencedBy()
    .filter({ type: "photo" })
    .follow("albumId")
    .ids();

  assertEquals(traversed, albumIds);
});

Deno.test("traverse: matches v1 N+1 loop for readThings", () => {
  const v1 = new TribbleV1([...FIXTURE]);
  const v2 = new TribbleV2([...FIXTURE]);
  const urns = [PHOTO_1, PHOTO_2, PHOTO_3, "urn:ró:photo:missing"];

  const looped = new Map<string, Record<string, string[]>>();
  for (const urn of urns) {
    const thing = v1.search({
      source: { id: asUrn(urn).id, type: asUrn(urn).type },
    }).firstObject(true);

    if (thing) {
      const { id, ...relations } = thing;
      looped.set(id as string, relations as Record<string, string[]>);
    }
  }

  const traversed = new Map<string, Record<string, string[]>>();
  for (const [urn, obj] of v2.nodes(urns).objectsById()) {
    const { id: _id, ...relations } = obj;
    traversed.set(urn, relations as Record<string, string[]>);
  }

  assertEquals(traversed, looped);
});
