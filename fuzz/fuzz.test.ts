import { TribbleDB } from "../src/tribble-db.ts";
import type { Triple } from "../src/types.ts";
import { Dataset } from "./terms/dataset.ts";

const db = new TribbleDB(Dataset(100)() as Triple[]);
const _ = undefined;

Deno.test("All relations refer to people", () => {
  const peopleTriples = db.search([
    { type: 'person' },
    _,
    _
  ]).triples();

  if (peopleTriples.length !== db.triples().length) {
    throw new Error(`Expected all triples to refer to people, but found ${db.triples().length - peopleTriples.length} that do not.`);
  }
});
