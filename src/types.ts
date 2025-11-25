import type {
  IndexPerformanceMetrics,
  TribbleDBPerformanceMetrics,
} from "./metrics.ts";

/*
 * ++++ Node search parameters
 */
export type Predicate = (val: string) => boolean;
export type NodeQs = Record<string, string>;
export type NodeObjectQuery = {
  type?: string;
  id?: string | string[];
  predicate?: Predicate;
  qs?: NodeQs;
};
export type NodeSearch = NodeObjectQuery | string | string[];

/*
 * ++++ Relationship search parameters
 */
export type RelationType = string;
export type RelationPredicate = (val: RelationType) => boolean;
export type RelationObjectQuery = {
  relation: string | string[];
  predicate?: RelationPredicate;
};
export type RelationSearch = RelationObjectQuery | string | string[];

/*
 * ++ Search DSL (object and array formats)
 */
export type UserSearchObject = {
  source?: NodeObjectQuery | string | string[];
  relation?: RelationObjectQuery | string | string[];
  target?: NodeObjectQuery | string | string[];
};

export type SearchObject = {
  source?: NodeObjectQuery[];
  relation?: RelationObjectQuery;
  target?: NodeObjectQuery[];
};
export type UserSearchArray = [
  NodeSearch | undefined,
  RelationSearch | undefined,
  NodeSearch | undefined,
];

export type Search = UserSearchObject | UserSearchArray;

/*
 * ++ General typing
 */

export type URNString = string & `urn:ró:${string}`;
export type Thing = string | URNString;
export type Relation = string;
export type Triple = [Thing, Relation, Thing];

export type TripleObject = Record<string, string | string[]>;

/*
 * URNS contain a type, id, and querystring set
 */
export type ParsedUrn = {
  type: string;
  id: string;
  qs: Record<string, string>;
};

/*
 * Internal indexed triple representation using numeric indices
 * instead of strings for memory efficiency
 */
export type IndexedTriple = [number, number, number];

/*
 * Validate that relation targets conform to some expectation. Return a string
 * when there is a problem to report.
 */
export type TargetValidator = (
  sourceType: string,
  relation: string,
  value: string,
) => string | undefined;

/*
 * TribbleDB performance metrics.
 */
export type TribbleDBMetrics = {
  index: IndexPerformanceMetrics;
  db: TribbleDBPerformanceMetrics;
};

/*
 * Parse a triple object, or return undefined (or throw an exception)
 */
export type Parser<T> = (obj: TripleObject) => T | undefined;

/*
 * Options for read/parse methods.
 */
export type ReadOpts = {
  qs: boolean;
};
