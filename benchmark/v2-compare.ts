/*
 * v1 vs v2 scaling comparison. Generates photo-site-shaped datasets at
 * increasing sizes and times the operations the redesign targets:
 * ingestion, chained search, batched point reads, and the two-hop
 * association walk that the photos site implements as N+1 loops.
 *
 * Run: deno run benchmark/v2-compare.ts
 */

import { TribbleDB as TribbleV1 } from "../src/tribble-db.ts";
import { TribbleDB as TribbleV2 } from "../src/v2/mod.ts";
import { TribbleParser } from "../src/tribble/parse.ts";
import { TribbleStringifier } from "../src/tribble/stringify.ts";
import { asUrn } from "../src/urn.ts";
import type { Triple } from "../src/types.ts";

const BOLD = "\x1b[1m";
const CYAN = "\x1b[36m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RESET = "\x1b[0m";

// entity counts per run; each photo contributes ~4 triples
const PHOTO_COUNTS = [1_500, 6_000, 24_000];
// batched add size used by the photos site's streaming loader
const INGEST_BATCH = 500;
// point-read batch size
const READ_BATCH = 100;
// repetitions per measurement; minimum is reported
const REPS = 3;

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

function generateDataset(random: () => number, photoCount: number): Triple[] {
  const triples: Triple[] = [];
  const placeCount = Math.max(20, Math.floor(photoCount / 50));
  const birdCount = Math.max(15, Math.floor(photoCount / 100));

  const places = Array.from(
    { length: placeCount },
    (_, idx) => `urn:ró:place:p${idx}`,
  );
  const birds = Array.from(
    { length: birdCount },
    (_, idx) => `urn:ró:bird:b${idx}`,
  );
  const albums = Array.from(
    { length: Math.max(10, Math.floor(photoCount / 200)) },
    (_, idx) => `a${idx}`,
  );

  for (let idx = 0; idx < places.length - 5; idx++) {
    triples.push([places[idx], "in", places[idx + 5]]);
    triples.push([places[idx], "name", `Place Number ${idx}`]);
  }
  for (let idx = 0; idx < birds.length; idx++) {
    triples.push([birds[idx], "name", `Bird Species ${idx}`]);
  }

  for (let idx = 0; idx < photoCount; idx++) {
    const photo = `urn:ró:photo:x${idx}`;
    const context = random() < 0.5 ? "?context=wild" : "";
    triples.push([photo, "location", pick(random, places)]);
    triples.push([photo, "rating", String(Math.floor(random() * 5))]);
    triples.push([photo, "albumId", pick(random, albums)]);
    triples.push([photo, "subject", `${pick(random, birds)}${context}`]);
  }

  return triples;
}

function timeIt(action: () => void): number {
  let best = Infinity;
  for (let rep = 0; rep < REPS; rep++) {
    const started = performance.now();
    action();
    best = Math.min(best, performance.now() - started);
  }
  return best;
}

type Measurement = {
  operation: string;
  engine: "v1" | "v2";
  // milliseconds per dataset size
  timings: number[];
};

function formatRow(measurement: Measurement, sizes: number[]): string {
  const cells = measurement.timings
    .map((timing) => timing.toFixed(1).padStart(10))
    .join("");

  const small = measurement.timings[0];
  const large = measurement.timings[measurement.timings.length - 1];
  const sizeRatio = sizes[sizes.length - 1] / sizes[0];
  const exponent = Math.log(large / Math.max(small, 0.001)) /
    Math.log(sizeRatio);

  const colour = measurement.engine === "v2" ? GREEN : YELLOW;
  const label = `${measurement.operation} [${measurement.engine}]`.padEnd(30);
  return `${colour}${label}${RESET}${cells}   n^${exponent.toFixed(2)}`;
}

function ingestBatched(
  makeDb: () => { add: (triples: Triple[]) => unknown },
  dataset: Triple[],
): void {
  const db = makeDb();
  for (let idx = 0; idx < dataset.length; idx += INGEST_BATCH) {
    db.add(dataset.slice(idx, idx + INGEST_BATCH));
  }
}

/*
 * The photos site's current load path: parse each tribble line to a
 * string triple, then add in batches.
 */
function loadViaParser(
  makeDb: () => { add: (triples: Triple[]) => unknown },
  lines: string[],
): void {
  const parser = new TribbleParser();
  const db = makeDb();
  let batch: Triple[] = [];

  for (const line of lines) {
    const triple = parser.parse(line);
    if (!triple) {
      continue;
    }
    batch.push(triple);
    if (batch.length >= INGEST_BATCH) {
      db.add(batch);
      batch = [];
    }
  }
  if (batch.length > 0) {
    db.add(batch);
  }
}

function chainedSearch(db: TribbleV1 | TribbleV2): number {
  const result = db
    .search({ source: { type: "photo" } })
    .search({ relation: ["location", "subject"] })
    .search({ target: { type: "bird" } });
  return result.triples().length;
}

function pointReads(db: TribbleV1 | TribbleV2, urns: string[]): number {
  let found = 0;
  for (const urn of urns) {
    if (db.readThing(urn) !== undefined) {
      found++;
    }
  }
  return found;
}

/*
 * The photos-site association walk: things -> photos -> album ids,
 * as the N+1 v1 loop from readAlbumsByThingIds.
 */
function nPlusOneWalk(db: TribbleV1, thingUrns: string[]): Set<string> {
  const photoIds = new Set<string>();
  for (const thingUrn of thingUrns) {
    const { type, id } = asUrn(thingUrn);
    for (const source of db.search({ target: { type, id } }).sources()) {
      photoIds.add(source);
    }
  }

  const albumIds = new Set<string>();
  for (const photoId of photoIds) {
    const parsed = asUrn(photoId);
    const albums = db.search({
      source: { type: parsed.type, id: parsed.id },
      relation: "albumId",
    }).targets();
    for (const albumId of albums) {
      albumIds.add(albumId);
    }
  }
  return albumIds;
}

function traversalWalk(db: TribbleV2, thingUrns: string[]): Set<string> {
  return db.nodes(thingUrns)
    .referencedBy()
    .filter({ type: "photo" })
    .follow("albumId")
    .ids();
}

function main(): void {
  const sizes: number[] = [];
  const datasets: Triple[][] = [];

  for (const photoCount of PHOTO_COUNTS) {
    const dataset = generateDataset(makeRandom(1234), photoCount);
    datasets.push(dataset);
    sizes.push(dataset.length);
  }

  const measurements: Measurement[] = [];
  const record = (
    operation: string,
    engine: "v1" | "v2",
    run: (datasetIdx: number) => void,
  ) => {
    const timings = datasets.map((_, datasetIdx) => {
      return timeIt(() => run(datasetIdx));
    });
    measurements.push({ operation, engine, timings });
  };

  const v1Dbs = datasets.map((dataset) => new TribbleV1(dataset));
  const v2Dbs = datasets.map((dataset) => new TribbleV2(dataset));

  const readUrns = datasets.map((dataset) => {
    const sources = [...new Set(dataset.map((triple) => triple[0]))];
    return sources.slice(0, READ_BATCH);
  });
  const thingUrns = datasets.map((dataset) => {
    const birds = [
      ...new Set(
        dataset
          .map((triple) => triple[2])
          .filter((target) => target.startsWith("urn:ró:bird:")),
      ),
    ];
    return birds.slice(0, 50);
  });

  const tribbleLines = datasets.map((dataset) => {
    const stringifier = new TribbleStringifier();
    return dataset
      .map((triple) => stringifier.stringify(triple))
      .join("\n")
      .split("\n");
  });

  record("ingest (batches of 500)", "v1", (idx) => {
    ingestBatched(() => new TribbleV1([]), datasets[idx]);
  });
  record("ingest (batches of 500)", "v2", (idx) => {
    ingestBatched(() => new TribbleV2([]), datasets[idx]);
  });

  record("load tribble text", "v1", (idx) => {
    loadViaParser(() => new TribbleV1([]), tribbleLines[idx]);
  });
  record("load tribble text", "v2", (idx) => {
    TribbleV2.fromTribbleLines(tribbleLines[idx]);
  });

  record("chained search x3", "v1", (idx) => {
    chainedSearch(v1Dbs[idx]);
  });
  record("chained search x3", "v2", (idx) => {
    chainedSearch(v2Dbs[idx]);
  });

  record(`readThing x${READ_BATCH}`, "v1", (idx) => {
    pointReads(v1Dbs[idx], readUrns[idx]);
  });
  record(`readThing x${READ_BATCH}`, "v2", (idx) => {
    pointReads(v2Dbs[idx], readUrns[idx]);
  });

  record("things->albums walk x50", "v1", (idx) => {
    nPlusOneWalk(v1Dbs[idx], thingUrns[idx]);
  });
  record("things->albums walk x50", "v2", (idx) => {
    traversalWalk(v2Dbs[idx], thingUrns[idx]);
  });

  // sanity: both walks agree at every size
  for (let idx = 0; idx < datasets.length; idx++) {
    const fromV1 = nPlusOneWalk(v1Dbs[idx], thingUrns[idx]);
    const fromV2 = traversalWalk(v2Dbs[idx], thingUrns[idx]);
    if (
      fromV1.size !== fromV2.size ||
      [...fromV1].some((albumId) => !fromV2.has(albumId))
    ) {
      throw new Error(`walk mismatch at size ${sizes[idx]}`);
    }
  }

  const header = sizes.map((size) => `${size} tr`.padStart(10)).join("");
  console.log(
    `${BOLD}${CYAN}${"operation".padEnd(30)}${header}   scaling${RESET}`,
  );
  for (const measurement of measurements) {
    console.log(formatRow(measurement, sizes));
  }
  console.log(
    `\n${CYAN}scaling column: fitted exponent over dataset size ` +
      `(1.00 = linear).${RESET}`,
  );
}

main();
