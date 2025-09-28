import type { Dsl, DslRelation, TargetValidator, Triple, TripleObject } from "./types.ts";
import { Index } from "./indices/index.ts";
import { TribbleDBPerformanceMetrics } from "./metrics.ts";
import type { IndexPerformanceMetrics } from "./metrics.ts";
export type TribbleDBMetrics = {
    index: IndexPerformanceMetrics;
    db: TribbleDBPerformanceMetrics;
};
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
     * Flat map over the triples in the database.
     *
     * @param fn - A mapping function.
     * @returns A new TribbleDB instance containing the flat-mapped triples.
     */
    flatMap(fn: (triple: Triple) => Triple[]): TribbleDB;
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
    object(listOnly?: boolean): Record<string, TripleObject>;
    nodeAsDSL(node: unknown): Dsl | undefined;
    relationAsDSL(relation: unknown): DslRelation | undefined;
    search(params: {
        source?: Dsl | string;
        relation?: string | string[] | DslRelation;
        target?: string | Dsl;
    }): TribbleDB;
    search2(query: Record<string, Dsl | DslRelation>): any[];
    getMetrics(): TribbleDBMetrics;
}
//# sourceMappingURL=tribble-db.d.ts.map