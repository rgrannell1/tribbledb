import type { Triple } from "../types.ts";
export declare class TripleIndex {
    private tripleHashes;
    private nodesByNodeId;
    private nodesByType;
    private nodesById;
    private nodeTextToHash;
    private inboundRelations;
    private outboundRelations;
    private relationsByRelation;
    private indexNode;
    private indexRelation;
    addTriples(triples: Triple[]): void;
}
//# sourceMappingURL=indexing.d.ts.map