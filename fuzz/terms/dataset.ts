import * as P from "peach";
import { PersonTriples } from "./person.ts";
import { Name } from "./names.ts";
import type { Wrapped } from "peach";

export function Dataset(size: Wrapped<number>) {
  return () =>
    P.Array.from(PersonTriples(Name(), "urn:ró:person"), size)().flat();
}
