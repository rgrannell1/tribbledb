import type { Parser, ReadOpts, TargetValidator, TribbleDBMetrics, Triple, TripleObject } from "./types.ts";
import { Index } from "./indices/index.ts";
import { TribbleDBPerformanceMetrics } from "./metrics.ts";
import type { Search } from "./types.ts";
export declare class TribbleDB {
    #private;
    index: Index;
    triplesCount: number;
    cursorIndices: Set<number>;
    metrics: TribbleDBPerformanceMetrics;
    validations: Record<string, TargetValidator>;
    constructor(triples: Triple[], validations?: Record<string, TargetValidator>);
    clone(): TribbleDB;
    static of(triples: Triple[]): TribbleDB;
    static from(objects: TripleObject[]): TribbleDB;
    validateTriples(triples: Triple[]): void;
    /**
     * Add new triples to the database.
     *
     * @param triples - An array of triples to add.
     */
    add(triples: Triple[]): void;
    /**
     * Map over the triples in the database.
     *
     * @param fn - A mapping function.
     * @returns A new TribbleDB instance containing the mapped triples.
     */
    map(fn: (triple: Triple) => Triple): TribbleDB;
    /**
     * Flatmap over the triples in the database. This can be used to add new triples
     * to a copy of the database.
     *
     * @param fn - A mapping function.
     * @returns A new TribbleDB instance containing the flat-mapped triples.
     */
    flatMap(fn: (triple: Triple) => Triple[]): TribbleDB;
    deduplicateTriples(triples: Triple[]): Triple[];
    searchFlatmap(search: Search, fn: (triple: Triple) => Triple[]): TribbleDB;
    /**
     * Get the first triple in the database.
     *
     * @returns The first triple, or undefined if there are no triples.
     */
    firstTriple(): Triple | undefined;
    firstSource(): string | undefined;
    /**
     * Get the first relation in the database.
     */
    firstRelation(): string | undefined;
    /**
     * Get the first target in the database.
     */
    firstTarget(): string | undefined;
    firstObject(listOnly?: boolean): TripleObject | undefined;
    triples(): Triple[];
    /**
     * Get all unique sources in the database.
     *
     * @returns A set of all unique sources.
     */
    sources(): Set<string>;
    /**
     * Get all unique relations in the database.
     *
     * @returns A set of all unique relations.
     */
    relations(): Set<string>;
    /**
     * Get all unique targets in the database.
     *
     * @returns A set of all unique targets.
     */
    targets(): Set<string>;
    objects(listOnly?: boolean): TripleObject[];
    search(params: Search): TribbleDB;
    getMetrics(): TribbleDBMetrics;
    readThing(urn: string, opts?: ReadOpts): TripleObject | undefined;
    readThings(urns: Set<string> | string[], opts?: ReadOpts): TripleObject[];
    parseThing<T>(parser: Parser<T>, urn: string, opts?: ReadOpts): T | undefined;
    parseThings<T>(parser: Parser<T>, urns: Set<string> | string[], opts?: ReadOpts): T[];
    merge(other: TribbleDB): TribbleDB;
    delete(triples: Triple[]): TribbleDB;
}
//# sourceMappingURL=tribble-db.d.ts.map