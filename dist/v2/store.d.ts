import type { Triple } from "../types.ts";
import { Interner } from "./interner.ts";
export type NodeMeta = {
    typeId: number;
    idId: number;
    qsIds: number[];
};
type PostingLists = Map<number, Set<number>>;
export declare class TripleStore {
    nodes: Interner;
    relationNames: Interner;
    sourceIds: number[];
    relationIds: number[];
    targetIds: number[];
    private identity;
    deletedRows: Set<number>;
    nodeMeta: Map<number, NodeMeta>;
    rowsBySource: PostingLists;
    rowsByTarget: PostingLists;
    rowsByRelation: PostingLists;
    nodesByType: Map<number, Set<number>>;
    nodesById: Map<number, Set<number>>;
    nodesByQs: Map<number, Set<number>>;
    constructor();
    internNode(value: string): number;
    private identityKey;
    rowOf(sourceId: number, relationId: number, targetId: number): number | undefined;
    hasTriple(triple: Triple): boolean;
    addTriple(triple: Triple): boolean;
    addRowByIds(sourceId: number, relationId: number, targetId: number): boolean;
    deleteTriple(triple: Triple): boolean;
    isAlive(row: number): boolean;
    get rowCount(): number;
    get aliveCount(): number;
    resolveRow(row: number): Triple;
}
export {};
//# sourceMappingURL=store.d.ts.map