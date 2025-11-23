import type { ParsedUrn, Triple } from "../types.ts";
import { IndexedSet } from "../sets.ts";
import { IndexPerformanceMetrics } from "../metrics.ts";
export declare class Index {
    private indexedTriples;
    stringIndex: IndexedSet;
    sourceType: Map<number, Set<number>>;
    sourceId: Map<number, Set<number>>;
    sourceQs: Map<number, Set<number>>;
    relations: Map<number, Set<number>>;
    targetType: Map<number, Set<number>>;
    targetId: Map<number, Set<number>>;
    targetQs: Map<number, Set<number>>;
    metrics: IndexPerformanceMetrics;
    stringUrn: Map<string, ParsedUrn>;
    constructor(triples: Triple[]);
    add(triples: Triple[]): void;
    get length(): number;
    triples(): Triple[];
    getTriple(index: number): Triple | undefined;
    getTripleIndices(index: number): [number, number, number] | undefined;
    getSourceTypeSet(type: string): Set<number> | undefined;
    getSourceIdSet(id: string): Set<number> | undefined;
    getSourceQsSet(key: string, val: string): Set<number> | undefined;
    getRelationSet(relation: string): Set<number> | undefined;
    getTargetTypeSet(type: string): Set<number> | undefined;
    getTargetIdSet(id: string): Set<number> | undefined;
    getTargetQsSet(key: string, val: string): Set<number> | undefined;
    clone(): Index;
}
//# sourceMappingURL=index.d.ts.map