/*
 * Benchmark Accessor Performance
 */

import { unwrap } from "https://deno.land/x/peach_ts@0.4.2/src/mod.ts";
import { TribbleDB } from "../src/tribble-db.ts";
import { TriplesNodeIdTypeQS } from "./fuzzers.ts";
import { SAMPLE_SIZES } from "./constants.ts";

for (const samples of SAMPLE_SIZES) {
  const experiment = {
    experiment: "Triples FirstObject",
    implementation: "current",
    sampleSize: samples,
    category: "NodeIDTypeQS, high uniqueness",
    parameters: {
      ID_LENGTH: 20,
      TYPE_LENGTH: 20,
      RELATION_LENGTH: 5,
      NUM_QS: 3,
      KEY_LENGTH: 10,
      VALUE_LENGTH: 10,
    },
  };

  Deno.bench({
    name: JSON.stringify(experiment),
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
      const tdb = new TribbleDB(data as [string, string, string][]);

      bench.start();
      tdb.firstObject();
    },
  });
}

for (const samples of SAMPLE_SIZES) {
  const experiment = {
    experiment: "Triples Objects",
    implementation: "current",
    sampleSize: samples,
    category: "NodeIDTypeQS, high uniqueness",
    parameters: {
      ID_LENGTH: 20,
      TYPE_LENGTH: 20,
      RELATION_LENGTH: 5,
      NUM_QS: 3,
      KEY_LENGTH: 10,
      VALUE_LENGTH: 10,
    },
  };

  Deno.bench({
    name: JSON.stringify(experiment),
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
      const tdb = new TribbleDB(data as [string, string, string][]);

      bench.start();
      tdb.objects();
    },
  });
}
