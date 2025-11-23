import type { IndexPerformanceMetrics, TribbleDBPerformanceMetrics } from "./metrics.ts";
export type Predicate = (val: string) => boolean;
export type NodeQs = Record<string, string>;
export type NodeObjectQuery = {
    type?: string;
    id?: string | string[];
    predicate?: Predicate;
    qs?: NodeQs;
};
export type NodeSearch = NodeObjectQuery | string | string[];
export type RelationType = string;
export type RelationPredicate = (val: RelationType) => boolean;
export type RelationObjectQuery = {
    relation: string | string[];
    predicate?: RelationPredicate;
};
export type RelationSearch = RelationObjectQuery | string | string[];
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
    NodeSearch | undefined
];
export type Search = UserSearchObject | UserSearchArray;
export type URNString = string & `urn:ró:${string}`;
export type Thing = string | URNString;
export type Relation = string;
export type Triple = [Thing, Relation, Thing];
export type TripleObject = Record<string, string | string[]>;
export type ParsedUrn = {
    type: string;
    id: string;
    qs: Record<string, string>;
};
export type IndexedTriple = [number, number, number];
export type TargetValidator = (sourceType: string, relation: string, value: string) => string | undefined;
export type TribbleDBMetrics = {
    index: IndexPerformanceMetrics;
    db: TribbleDBPerformanceMetrics;
};
export type Parser<T> = (obj: TripleObject) => T | undefined;
export type ReadOpts = {
    qs: boolean;
};
//# sourceMappingURL=types.d.ts.map