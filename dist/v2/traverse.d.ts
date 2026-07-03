import type { NodeObjectQuery, TripleObject } from "../types.ts";
import type { TripleStore } from "./store.ts";
import type { HopOpts, NodeFilterQuery, NodeSelector } from "./types.ts";
export type Visibility = {
    store: TripleStore;
    rows: Set<number> | null;
};
export declare function matchesNodeQuery(store: TripleStore, nodeId: number, query: NodeObjectQuery): boolean;
export declare function resolveSelector(visibility: Visibility, selector: NodeSelector): Set<number>;
export declare class NodeView {
    private visibility;
    private nodeIds;
    constructor(visibility: Visibility, nodeIds: Set<number>);
    follow(relations?: string | string[], opts?: HopOpts): NodeView;
    referencedBy(relations?: string | string[], opts?: HopOpts): NodeView;
    filter(query: NodeFilterQuery): NodeView;
    union(other: NodeView): NodeView;
    intersect(other: NodeView): NodeView;
    subtract(other: NodeView): NodeView;
    private assertSameStore;
    private sortedNodeIds;
    urns(): Set<string>;
    ids(): Set<string>;
    count(): number;
    has(urn: string): boolean;
    objects(): TripleObject[];
    objectsById(): Map<string, TripleObject>;
}
export declare class PathView {
    private visibility;
    private endToStarts;
    constructor(visibility: Visibility, endToStarts: Map<number, Set<number>>);
    static fromNodes(visibility: Visibility, nodeIds: Set<number>): PathView;
    follow(relations?: string | string[], opts?: HopOpts): PathView;
    private followOnce;
    pairs(): [string, string][];
}
//# sourceMappingURL=traverse.d.ts.map