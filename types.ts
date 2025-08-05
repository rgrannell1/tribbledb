export type URN = string & `urn:ró:${string}`;
export type Thing = string | URN;
export type Relation = string;
export type Triple = [Thing, Relation, Thing];

export function isURN(thing: Thing, namespace: string = 'urn:ró'): thing is URN {
  return typeof thing === "string" && thing.startsWith(`urn:${namespace}:`);
}

export type Pattern =
  // exact matches
  | string
  | // predicates on the value
  ((val: string) => boolean);

export type TripleObject = Record<string, string | string[]>;
export type Predicate = (val: string) => boolean;

export type ParsedUrn = {
  type: string;
  id: string;
  qs: Record<string, string>;
}

/*
 * Queries against sources and targets can specify these parameters.
 *
 */
export type Dsl = {
  type: string | undefined;
  id: string | undefined,
  predicate: Predicate | undefined,
  qs: Record<string, string> | undefined,
}
