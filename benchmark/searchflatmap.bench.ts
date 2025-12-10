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
  const experiment = {
    experiment: "SearchFlatMap",
    implementation: "current",
    sampleSize: samples,
    category: "NodeID, high uniqueness, identity transform",
    parameters: {
      ID_LENGTH: 20,
      RELATION_LENGTH: 5,
    },
  };

  Deno.bench({
    name: JSON.stringify(experiment),
    group: "TribbleDB SearchFlatMap (NodeID)",
    fn(bench) {
      const ID_LENGTH = experiment.parameters.ID_LENGTH;
      const RELATION_LENGTH = experiment.parameters.RELATION_LENGTH;
      const sampleData = TriplesNodeId(samples, ID_LENGTH, RELATION_LENGTH);

      const data = unwrap(sampleData);
      const db = new TribbleDB(data as [string, string, string][]);
      bench.start();
      db.searchFlatmap({}, (x: any) => [x]);
    },
  });
}

for (const samples of SAMPLE_SIZES) {
  const experiment = {
    experiment: "SearchFlatMap",
    implementation: "current",
    sampleSize: samples,
    category: "NodeID, high uniqueness, full transform",
    parameters: {
      ID_LENGTH: 20,
      RELATION_LENGTH: 5,
    },
  };

  Deno.bench({
    name: JSON.stringify(experiment),
    group: "TribbleDB SearchFlatMap (NodeID)",
    fn(bench) {
      const ID_LENGTH = experiment.parameters.ID_LENGTH;
      const RELATION_LENGTH = experiment.parameters.RELATION_LENGTH;
      const sampleData = TriplesNodeId(samples, ID_LENGTH, RELATION_LENGTH);

      const data = unwrap(sampleData);
      const db = new TribbleDB(data as [string, string, string][]);
      bench.start();
      db.searchFlatmap(
        {},
        (x: any) => [x.reverse() as [string, string, string]],
      );
    },
  });
}

for (const samples of SAMPLE_SIZES) {
  const experiment = {
    experiment: "SearchFlatMap",
    implementation: "current",
    sampleSize: samples,
    category: "NodeIDType, high uniqueness, identity transform",
    parameters: {
      ID_LENGTH: 20,
      RELATION_LENGTH: 5,
      TYPE_LENGTH: 10,
    },
  };

  Deno.bench({
    name: JSON.stringify(experiment),
    group: "TribbleDB SearchFlatMap (NodeIDType)",
    fn(bench) {
      const ID_LENGTH = experiment.parameters.ID_LENGTH;
      const RELATION_LENGTH = experiment.parameters.RELATION_LENGTH;
      const TYPE_LENGTH = experiment.parameters.TYPE_LENGTH;
      const sampleData = TriplesNodeIdType(
        samples,
        ID_LENGTH,
        TYPE_LENGTH,
        RELATION_LENGTH,
      );

      const data = unwrap(sampleData);
      const db = new TribbleDB(data as [string, string, string][]);
      bench.start();
      db.searchFlatmap({}, (x: any) => [x]);
    },
  });
}

for (const samples of SAMPLE_SIZES) {
  const experiment = {
    experiment: "SearchFlatMap",
    implementation: "current",
    sampleSize: samples,
    category: "NodeIDType, high uniqueness, full transform",
    parameters: {
      ID_LENGTH: 20,
      RELATION_LENGTH: 5,
      TYPE_LENGTH: 10,
    },
  };

  Deno.bench({
    name: JSON.stringify(experiment),
    group: "TribbleDB SearchFlatMap (NodeIDType)",
    fn(bench) {
      const ID_LENGTH = experiment.parameters.ID_LENGTH;
      const RELATION_LENGTH = experiment.parameters.RELATION_LENGTH;
      const TYPE_LENGTH = experiment.parameters.TYPE_LENGTH;
      const sampleData = TriplesNodeIdType(
        samples,
        ID_LENGTH,
        TYPE_LENGTH,
        RELATION_LENGTH,
      );

      const data = unwrap(sampleData);
      const db = new TribbleDB(data as [string, string, string][]);
      bench.start();
      db.searchFlatmap(
        {},
        (x: any) => [x.reverse() as [string, string, string]],
      );
    },
  });
}

for (const samples of SAMPLE_SIZES) {
  const experiment = {
    experiment: "SearchFlatMap",
    implementation: "current",
    sampleSize: samples,
    category: "NodeIDTypeQS, high uniqueness, identity transform",
    parameters: {
      ID_LENGTH: 20,
      RELATION_LENGTH: 5,
      TYPE_LENGTH: 10,
      NUM_QS: 3,
      KEY_LENGTH: 10,
      VALUE_LENGTH: 10,
    },
  };

  Deno.bench({
    name: JSON.stringify(experiment),
    group: "TribbleDB SearchFlatMap (NodeIDTypeQS)",
    fn(bench) {
      const ID_LENGTH = experiment.parameters.ID_LENGTH;
      const RELATION_LENGTH = experiment.parameters.RELATION_LENGTH;
      const TYPE_LENGTH = experiment.parameters.TYPE_LENGTH;
      const NUM_QS = experiment.parameters.NUM_QS;
      const KEY_LENGTH = experiment.parameters.KEY_LENGTH;
      const VALUE_LENGTH = experiment.parameters.VALUE_LENGTH;
      const sampleData = TriplesNodeIdTypeQS(
        samples,
        ID_LENGTH,
        TYPE_LENGTH,
        NUM_QS,
        KEY_LENGTH,
        VALUE_LENGTH,
        RELATION_LENGTH,
      );

      const data = unwrap(sampleData);
      const db = new TribbleDB(data as [string, string, string][]);
      bench.start();
      db.searchFlatmap({}, (x: any) => [x]);
    },
  });
}

for (const samples of SAMPLE_SIZES) {
  const experiment = {
    experiment: "SearchFlatMap",
    implementation: "current",
    sampleSize: samples,
    category: "NodeIDTypeQS, high uniqueness, full transform",
    parameters: {
      ID_LENGTH: 20,
      RELATION_LENGTH: 5,
      TYPE_LENGTH: 10,
      NUM_QS: 3,
      KEY_LENGTH: 10,
      VALUE_LENGTH: 10,
    },
  };

  Deno.bench({
    name: JSON.stringify(experiment),
    group: "TribbleDB SearchFlatMap (NodeIDTypeQS)",
    fn(bench) {
      const ID_LENGTH = experiment.parameters.ID_LENGTH;
      const RELATION_LENGTH = experiment.parameters.RELATION_LENGTH;
      const TYPE_LENGTH = experiment.parameters.TYPE_LENGTH;
      const NUM_QS = experiment.parameters.NUM_QS;
      const KEY_LENGTH = experiment.parameters.KEY_LENGTH;
      const VALUE_LENGTH = experiment.parameters.VALUE_LENGTH;
      const sampleData = TriplesNodeIdTypeQS(
        samples,
        ID_LENGTH,
        TYPE_LENGTH,
        NUM_QS,
        KEY_LENGTH,
        VALUE_LENGTH,
        RELATION_LENGTH,
      );

      const data = unwrap(sampleData);
      const db = new TribbleDB(data as [string, string, string][]);
      bench.start();
      db.searchFlatmap(
        {},
        (x: any) => [x.reverse() as [string, string, string]],
      );
    },
  });
}
