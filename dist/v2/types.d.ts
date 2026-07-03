import type { NodeObjectQuery } from "../types.ts";
export type AddReport = {
    added: number;
    duplicates: number;
};
export type ReadOpts = {
    qs?: boolean;
    ignoreQs?: boolean;
};
export type ObjectOpts = {
    arrays?: boolean;
};
export type NodeFilterQuery = NodeObjectQuery & {
    has?: string;
    lacks?: string;
};
export type HopOpts = {
    transitive?: boolean;
    where?: NodeObjectQuery;
};
export type NodeSelector = NodeObjectQuery | string | string[] | Set<string>;
//# sourceMappingURL=types.d.ts.map