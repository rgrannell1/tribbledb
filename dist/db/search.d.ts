import type { Index } from "../indices/index.ts";
import type { NodeObjectQuery, SearchObject } from "../types.ts";
import type { RelationObjectQuery } from "../types.ts";
import type { TribbleDBPerformanceMetrics } from "../metrics.ts";
export declare function validateInput(params: SearchObject): void;
export declare function nodeMatches(query: NodeObjectQuery, source: boolean, index: Index, metrics: TribbleDBPerformanceMetrics, cursorIndices: Set<number>): Set<number>;
export declare function findMatchingNodes(query: NodeObjectQuery[], source: boolean, index: Index, metrics: TribbleDBPerformanceMetrics, cursorIndices: Set<number>): Set<number>;
export declare function findMatchingRelations(query: RelationObjectQuery, index: Index): Set<number>;
export declare function findMatchingRows(params: SearchObject, index: Index, cursorIndices: Set<number>, metrics: TribbleDBPerformanceMetrics): Set<number>;
//# sourceMappingURL=search.d.ts.map