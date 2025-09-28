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
export type NodeSearch = {
  type?: string;
  id?: string;
  predicate?: Predicate;
  qs?: Record<string, string>;
};

/*
 * Queries against relations can specify multiple relations to match
 * or include a predicate for custom filtering.
 */
export type RelationSearch = {
  relation: string[];
  predicate?: Predicate;
};

/*
 * Internal indexed triple representation using numeric indices
 * instead of strings for memory efficiency
 */
export type IndexedTriple = [number, number, number];

/*
 * Validate that relation targets conform to some expectation. Return a string on complaint.
 */
export type TargetValidator = (
  sourceType: string,
  relation: string,
  value: string,
) => string | undefined;
