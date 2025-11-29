/*
 * Benchmark TribbleDB searchmap performance
 */

import { unwrap } from "https://deno.land/x/peach_ts@0.4.2/src/mod.ts";
import { TribbleDB } from "../src/tribble-db.ts";
import {
  TriplesNodeId,
  TriplesNodeIdType,
  TriplesNodeIdTypeQS,
} from "./fuzzers.ts";
import { SAMPLE_SIZES } from "./constants.ts";

for (const samples of SAMPLE_SIZES) {
  Deno.bench({
    name: `SearchFlatMap ${samples} triples (NodeID format, high uniqueness, identity)`,
    group: 'TribbleDB SearchFlatMap (NodeID)',
    fn(bench) {
      const ID_LENGTH = 20;
      const RELATION_LENGTH = 5;
      const sampleData = TriplesNodeId(samples, ID_LENGTH, RELATION_LENGTH);

      const data = unwrap(sampleData);
      const db = new TribbleDB(data as [string, string, string][]);
      bench.start();
      db.searchFlatmap({}, x => [x]);
    }
  })
}

for (const samples of SAMPLE_SIZES) {
  Deno.bench({
    name: `SearchFlatMap ${samples} triples (NodeID format, high uniqueness, full transform)`,
    group: 'TribbleDB SearchFlatMap (NodeID)',
    fn(bench) {
      const ID_LENGTH = 20;
      const RELATION_LENGTH = 5;
      const sampleData = TriplesNodeId(samples, ID_LENGTH, RELATION_LENGTH);

      const data = unwrap(sampleData);
      const db = new TribbleDB(data as [string, string, string][]);
      bench.start();
      db.searchFlatmap({}, x => [x.reverse() as [string, string, string]]);
    }
  })
}

for (const samples of SAMPLE_SIZES) {
  Deno.bench({
    name: `SearchFlatMap ${samples} triples (NodeIDType format, high uniqueness, identity)`,
    group: 'TribbleDB SearchFlatMap (NodeID)',
    fn(bench) {
      const ID_LENGTH = 20;
      const RELATION_LENGTH = 5;
      const TYPE_LENGTH = 10;
      const sampleData = TriplesNodeIdType(samples, ID_LENGTH, RELATION_LENGTH, TYPE_LENGTH);

      const data = unwrap(sampleData);
      const db = new TribbleDB(data as [string, string, string][]);
      bench.start();
      db.searchFlatmap({}, x => [x]);
    }
  })
}

for (const samples of SAMPLE_SIZES) {
  Deno.bench({
    name: `SearchFlatMap ${samples} triples (NodeIDType format, high uniqueness, full transform)`,
    group: 'TribbleDB SearchFlatMap (NodeID)',
    fn(bench) {
      const ID_LENGTH = 20;
      const RELATION_LENGTH = 5;
      const TYPE_LENGTH = 10;
      const sampleData = TriplesNodeIdType(samples, ID_LENGTH, RELATION_LENGTH, TYPE_LENGTH);

      const data = unwrap(sampleData);
      const db = new TribbleDB(data as [string, string, string][]);
      bench.start();
      db.searchFlatmap({}, x => [x.reverse() as [string, string, string]]);
    }
  })
}

for (const samples of SAMPLE_SIZES) {
  Deno.bench({
    name: `SearchFlatMap ${samples} triples (NodeIDTypeQS format, high uniqueness, identity)`,
    group: 'TribbleDB SearchFlatMap (NodeID)',
    fn(bench) {
      const ID_LENGTH = 20;
      const RELATION_LENGTH = 5;
      const TYPE_LENGTH = 10;
      const NUM_QS = 3;
      const KEY_LENGTH = 10;
      const VALUE_LENGTH = 10;
      const sampleData = TriplesNodeIdTypeQS(samples, ID_LENGTH, RELATION_LENGTH, TYPE_LENGTH, NUM_QS, KEY_LENGTH, VALUE_LENGTH);

      const data = unwrap(sampleData);
      const db = new TribbleDB(data as [string, string, string][]);
      bench.start();
      db.searchFlatmap({}, x => [x]);
    }
  })
}

for (const samples of SAMPLE_SIZES) {
  Deno.bench({
    name: `SearchFlatMap ${samples} triples (NodeIDTypeQS format, high uniqueness, full transform)`,
    group: 'TribbleDB SearchFlatMap (NodeID)',
    fn(bench) {
      const ID_LENGTH = 20;
      const RELATION_LENGTH = 5;
      const TYPE_LENGTH = 10;
      const NUM_QS = 3;
      const KEY_LENGTH = 10;
      const VALUE_LENGTH = 10;
      const sampleData = TriplesNodeIdTypeQS(samples, ID_LENGTH, RELATION_LENGTH, TYPE_LENGTH, NUM_QS, KEY_LENGTH, VALUE_LENGTH);

      const data = unwrap(sampleData);
      const db = new TribbleDB(data as [string, string, string][]);
      bench.start();
      db.searchFlatmap({}, x => [x.reverse() as [string, string, string]]);
    }
  })
}
