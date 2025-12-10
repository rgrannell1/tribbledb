import type { Parser, ReadOpts, Search, TargetValidator, Triple, TripleObject } from "./types.ts";
import { Index } from "./indices/index.ts";
export declare class TribbleDB {
    index: Index;
    private validations;
    constructor(triples: Triple[], validations?: Record<string, TargetValidator>);
    static of(triples: Triple[]): TribbleDB;
    static from(objects: TripleObject[]): TribbleDB;
    validateTriples(triples: Triple[]): void;
    add(triples: Triple[]): void;
    delete(triples: Triple[]): TribbleDB;
    triples(): Triple[];
    sources(): Set<string>;
    relations(): Set<string>;
    targets(): Set<string>;
    firstTriple(): Triple | undefined;
    firstSource(): string | undefined;
    firstRelation(): string | undefined;
    firstTarget(): string | undefined;
    firstObject(listOnly?: boolean): TripleObject | undefined;
    objects(listOnly?: boolean): TripleObject[];
    map(fnc: (triple: Triple) => Triple): TribbleDB;
    flatMap(fnc: (triple: Triple) => Triple[]): TribbleDB;
    deduplicateTriples(triples: Triple[]): Triple[];
    merge(other: TribbleDB): TribbleDB;
    clone(): TribbleDB;
    readThing(urn: string, opts?: ReadOpts): TripleObject | undefined;
    readThings(urns: Set<string> | string[], opts?: ReadOpts): TripleObject[];
    parseThing<T>(parser: Parser<T>, urn: string, opts?: ReadOpts): T | undefined;
    parseThings<T>(parser: Parser<T>, urns: Set<string> | string[], opts?: ReadOpts): T[];
    private intersectSets;
    search(params: Search): TribbleDB;
    private getTripleIndicesForNodeQueries;
    private searchTriples;
    searchFlatmap(search: Search, fnc: (triple: Triple) => Triple[]): TribbleDB;
    get triplesCount(): number;
}
//# sourceMappingURL=tribble-db.d.ts.map