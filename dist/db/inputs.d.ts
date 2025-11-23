import type { NodeObjectQuery, NodeSearch, RelationObjectQuery, RelationSearch, Search, SearchObject } from "../types.ts";
export declare function isUrn(value: string): boolean;
export declare function parseNodeSearch(search: NodeSearch): NodeObjectQuery[];
export declare function parseRelation(search: RelationSearch): RelationObjectQuery;
export declare function parseSearch(search: Search): SearchObject;
//# sourceMappingURL=inputs.d.ts.map