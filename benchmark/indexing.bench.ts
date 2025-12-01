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
} from "./fuzzers.ts";
import { SAMPLE_SIZES } from "./constants.ts";

for (const samples of SAMPLE_SIZES) {
  const experiment = {
    experiment: 'Insert Triples',
    sampleSize: samples,
    category: 'NodeID, high uniqueness',
    parameters: {
      ID_LENGTH: 20,
      RELATION_LENGTH: 5,
    }
  }

  Deno.bench({
    name: JSON.stringify(experiment),
    fn: (bench) => {
      const ID_LENGTH = experiment.parameters.ID_LENGTH;
      const RELATION_LENGTH = experiment.parameters.RELATION_LENGTH;
      const sampleData = TriplesNodeId(samples, ID_LENGTH, RELATION_LENGTH);

      const data = unwrap(sampleData);
      bench.start();
      new TribbleDB(data as [string, string, string][]);
    },
  });
}

for (const samples of SAMPLE_SIZES) {
  const experiment = {
    experiment: 'Insert Triples',
    sampleSize: samples,
    category: 'NodeID, high duplicates',
    parameters: {
      ID_LENGTH: 5,
      RELATION_LENGTH: 3,
    }
  }

  Deno.bench({
    name: JSON.stringify(experiment),
    group: "TribbleDB Insertion (NodeID)",
    fn: (bench) => {
      const ID_LENGTH = experiment.parameters.ID_LENGTH;
      const RELATION_LENGTH = experiment.parameters.RELATION_LENGTH;
      const sampleData = TriplesNodeId(samples, ID_LENGTH, RELATION_LENGTH);

      const data = unwrap(sampleData);
      bench.start();
      new TribbleDB(data as [string, string, string][]);
    },
  });
}

for (const samples of SAMPLE_SIZES) {
  const experiment = {
    experiment: 'Insert Triples',
    sampleSize: samples,
    category: 'NodeIDType, high uniqueness',
    parameters: {
      ID_LENGTH: 20,
      TYPE_LENGTH: 20,
      RELATION_LENGTH: 5,
    }
  }

  Deno.bench({
    name: JSON.stringify(experiment),
    group: "TribbleDB Insertion (NodeIDType)",
    fn: (bench) => {
      const ID_LENGTH = experiment.parameters.ID_LENGTH;
      const TYPE_LENGTH = experiment.parameters.TYPE_LENGTH;
      const RELATION_LENGTH = experiment.parameters.RELATION_LENGTH;
      const sampleData = TriplesNodeIdType(
        samples,
        ID_LENGTH,
        TYPE_LENGTH,
        RELATION_LENGTH,
      );

      const data = unwrap(sampleData);
      bench.start();
      new TribbleDB(data as [string, string, string][]);
    },
  });
}

for (const samples of SAMPLE_SIZES) {
  const experiment = {
    experiment: 'Insert Triples',
    sampleSize: samples,
    category: 'NodeIDType, high duplicates',
    parameters: {
      ID_LENGTH: 5,
      TYPE_LENGTH: 5,
      RELATION_LENGTH: 3,
    }
  }

  Deno.bench({
    name: JSON.stringify(experiment),
    group: "TribbleDB Insertion (NodeIDType)",
    fn: (bench) => {
      const ID_LENGTH = experiment.parameters.ID_LENGTH;
      const TYPE_LENGTH = experiment.parameters.TYPE_LENGTH;
      const RELATION_LENGTH = experiment.parameters.RELATION_LENGTH;
      const sampleData = TriplesNodeIdType(
        samples,
        ID_LENGTH,
        TYPE_LENGTH,
        RELATION_LENGTH,
      );

      const data = unwrap(sampleData);
      bench.start();
      new TribbleDB(data as [string, string, string][]);
    },
  });
}

for (const samples of SAMPLE_SIZES) {
  const experiment = {
    experiment: 'Insert Triples',
    sampleSize: samples,
    category: 'NodeIDTypeQs, high uniqueness',
    parameters: {
      ID_LENGTH: 20,
      TYPE_LENGTH: 20,
      RELATION_LENGTH: 5,
      NUM_QS: 3,
      KEY_LENGTH: 10,
      VALUE_LENGTH: 10,
    }
  }

  Deno.bench({
    name: JSON.stringify(experiment),
    group: "TribbleDB Insertion (NodeIDTypeQs)",
    fn: (bench) => {
      const ID_LENGTH = experiment.parameters.ID_LENGTH;
      const TYPE_LENGTH = experiment.parameters.TYPE_LENGTH;
      const RELATION_LENGTH = experiment.parameters.RELATION_LENGTH;
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
      bench.start();
      new TribbleDB(data as [string, string, string][]);
    },
  });
}

for (const samples of SAMPLE_SIZES) {
  const experiment = {
    experiment: 'Insert Triples',
    sampleSize: samples,
    category: 'NodeIDTypeQs, high duplicates',
    parameters: {
      ID_LENGTH: 5,
      TYPE_LENGTH: 5,
      RELATION_LENGTH: 3,
      NUM_QS: 3,
      KEY_LENGTH: 2,
      VALUE_LENGTH: 2,
    }
  }

  Deno.bench({
    name: JSON.stringify(experiment),
    group: "TribbleDB Insertion (NodeIDTypeQs)",
    fn: (bench) => {
      const ID_LENGTH = experiment.parameters.ID_LENGTH;
      const TYPE_LENGTH = experiment.parameters.TYPE_LENGTH;
      const RELATION_LENGTH = experiment.parameters.RELATION_LENGTH;
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
      bench.start();
      new TribbleDB(data as [string, string, string][]);
    },
  });
}
