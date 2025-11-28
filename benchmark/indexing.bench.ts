/*
 * Benchmark TribbleDB indexing performance with:
 * - different sizes of input data.
 * - different amounts of uniqueness / duplication in the data.
 * - different node ID formats.
 */

import { unwrap } from "https://deno.land/x/peach_ts@0.4.2/src/mod.ts";
import { TribbleDB } from "../src/tribble-db.ts";
import {
  TriplesNodeId,
  TriplesNodeIdType,
  TriplesNodeIdTypeQS,
} from './fuzzers.ts';

for (const samples of [1_000, 5_000, 10_000, 50_000, 100_000]) {
  Deno.bench({
    name: `Insert ${samples} triples (NodeID format, high uniqueness)`,
    group: "TribbleDB Insertion (NodeID)",
    fn: (bench) => {
      const ID_LENGTH = 20;
      const RELATION_LENGTH = 5;
      const sampleData = TriplesNodeId(samples, ID_LENGTH, RELATION_LENGTH)

      const data = unwrap(sampleData);
      bench.start();
      new TribbleDB(data as [string, string, string][]);
    }
  })
}

for (const samples of [1_000, 5_000, 10_000, 50_000, 100_000]) {
  Deno.bench({
    name: `Insert ${samples} triples (NodeID format, high duplicates)`,
    group: "TribbleDB Insertion (NodeID)",
    fn: (bench) => {
      const ID_LENGTH = 5;
      const RELATION_LENGTH = 3;
      const sampleData = TriplesNodeId(samples, ID_LENGTH, RELATION_LENGTH)

      const data = unwrap(sampleData);
      bench.start();
      new TribbleDB(data as [string, string, string][]);
    }
  })
}

for (const samples of [1_000, 5_000, 10_000, 50_000, 100_000]) {
  Deno.bench({
    name: `Insert ${samples} triples (NodeIDType format, high uniqueness)`,
    group: "TribbleDB Insertion (NodeIDType)",
    fn: (bench) => {
      const ID_LENGTH = 20;
      const TYPE_LENGTH = 20;
      const RELATION_LENGTH = 5;
      const sampleData = TriplesNodeIdType(samples, ID_LENGTH, TYPE_LENGTH, RELATION_LENGTH)

      const data = unwrap(sampleData);
      bench.start();
      new TribbleDB(data as [string, string, string][]);
    }
  })
}

for (const samples of [1_000, 5_000, 10_000, 50_000, 100_000]) {
  Deno.bench({
    name: `Insert ${samples} triples (NodeIDType format, high duplicates)`,
    group: "TribbleDB Insertion (NodeIDType)",
    fn: (bench) => {
      const ID_LENGTH = 5;
      const TYPE_LENGTH = 5;
      const RELATION_LENGTH = 3;
      const sampleData = TriplesNodeIdType(samples, ID_LENGTH, TYPE_LENGTH, RELATION_LENGTH)

      const data = unwrap(sampleData);
      bench.start();
      new TribbleDB(data as [string, string, string][]);
    }
  })
}

for (const samples of [1_000, 5_000, 10_000, 50_000, 100_000]) {
  Deno.bench({
    name: `Insert ${samples} triples (NodeIDTypeQs format, high uniqueness)`,
    group: "TribbleDB Insertion (NodeIDTypeQs)",
    fn: (bench) => {
      const ID_LENGTH = 20;
      const TYPE_LENGTH = 20;
      const RELATION_LENGTH = 5;
      const NUM_QS = 3;
      const KEY_LENGTH = 10;
      const VALUE_LENGTH = 10;

      const sampleData = TriplesNodeIdTypeQS(samples, ID_LENGTH, TYPE_LENGTH, NUM_QS, KEY_LENGTH, VALUE_LENGTH, RELATION_LENGTH)

      const data = unwrap(sampleData);
      bench.start();
      new TribbleDB(data as [string, string, string][]);
    }
  })
}

for (const samples of [1_000, 5_000, 10_000, 50_000, 100_000]) {
  Deno.bench({
    name: `Insert ${samples} triples (NodeIDTypeQs format, high duplicates)`,
    group: "TribbleDB Insertion (NodeIDTypeQs)",
    fn: (bench) => {
      const ID_LENGTH = 5;
      const TYPE_LENGTH = 5;
      const RELATION_LENGTH = 3;
      const NUM_QS = 3;
      const KEY_LENGTH = 2;
      const VALUE_LENGTH = 2;

      const sampleData = TriplesNodeIdTypeQS(samples, ID_LENGTH, TYPE_LENGTH, NUM_QS, KEY_LENGTH, VALUE_LENGTH, RELATION_LENGTH)

      const data = unwrap(sampleData);
      bench.start();
      new TribbleDB(data as [string, string, string][]);
    }
  })
}
