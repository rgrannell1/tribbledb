export type URN = string & `urn:ró:${string}`;
export type Thing = string | URN;
export type Relation = string;
export type Triple = [Thing, Relation, Thing];

export function isURN(thing: Thing): thing is URN {
  return typeof thing === "string" && thing.startsWith("urn:ró:");
}

export type Pattern =
  // exact matches
  | string
  | // predicates on the value
  ((val: string) => boolean);

export type TripleObject = Record<string, string | string[]>;
export type Predicate = (val: string) => boolean;
