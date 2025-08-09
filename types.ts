export type URN = string & `urn:ró:${string}`;
export type Thing = string | URN;
export type Relation = string;
export type Triple = [Thing, Relation, Thing];

export type TripleObject = Record<string, string | string[]>;
export type Predicate = (val: string) => boolean;

export type ParsedUrn = {
  type: string;
  id: string;
  qs: Record<string, string>;
};

/*
 * Queries against sources and targets can specify these parameters.
 */
export type Dsl = {
  type?: string;
  id?: string;
  predicate?: Predicate;
  qs?: Record<string, string>;
};


/*
 * Internal indexed triple representation using numeric indices
 * instead of strings for memory efficiency
 */
export type IndexedTriple = [number, number, number];
