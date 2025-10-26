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
export type NodeSearch = {
    type?: string;
    id?: string | string[];
    predicate?: Predicate;
    qs?: Record<string, string>;
};
export type RelationSearch = {
    relation: string[];
    predicate?: Predicate;
};
export type IndexedTriple = [number, number, number];
export type TargetValidator = (sourceType: string, relation: string, value: string) => string | undefined;
//# sourceMappingURL=types.d.ts.map