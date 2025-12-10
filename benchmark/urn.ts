import { unwrap } from "https://deno.land/x/peach_ts@0.4.2/src/mod.ts";
import { parseUrn, parseUrn2 } from "../src/urn.ts";
import { NodeIDTypeQS } from "./fuzzers.ts";

{
  const experiment = {
    experiment: "parseurn",
    sampleSize: 1,
    category: "NodeIDTypeQs",
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
    group: "parseurn",
    baseline: true,
    fn: (bench) => {
      const ID_LENGTH = experiment.parameters.ID_LENGTH;
      const TYPE_LENGTH = experiment.parameters.TYPE_LENGTH;
      const NUM_QS = experiment.parameters.NUM_QS;
      const KEY_LENGTH = experiment.parameters.KEY_LENGTH;
      const VALUE_LENGTH = experiment.parameters.VALUE_LENGTH;

      const sampleData = NodeIDTypeQS(
        ID_LENGTH,
        TYPE_LENGTH,
        NUM_QS,
        KEY_LENGTH,
        VALUE_LENGTH,
      );

      const data = `urn:ró:${unwrap(sampleData)}`;

      bench.start();
      parseUrn(data);
    },
  });
}
