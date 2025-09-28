import * as P from "https://deno.land/x/peach_ts@0.4.2/src/mod.ts";
import { PersonTriples } from "./person.ts";
import { Name } from "./names.ts";
import type { Wrapped } from "https://deno.land/x/peach_ts@0.4.2/src/mod.ts";

export function Dataset(size: Wrapped<number>) {
  return () => P.Array.from(PersonTriples(Name(), "urn:ró:person"), size)().flat();
}
