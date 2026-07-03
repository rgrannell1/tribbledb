/*
 * Types specific to the v2 engine's additive API surface.
 */

import type { NodeObjectQuery } from "../types.ts";

/*
 * Report returned by add(): how many triples were inserted vs already present.
 */
export type AddReport = {
  added: number;
  duplicates: number;
};

/*
 * Read options. `ignoreQs` is the documented spelling; `qs` is kept as a
 * deprecated alias of the v1 option ({ qs: true } means "match the URN's
 * type and id, ignoring its querystring").
 */
export type ReadOpts = {
  qs?: boolean;
  ignoreQs?: boolean;
};

/*
 * Object materialisation options. { arrays: true } wraps every relation
 * value in an array (stable shapes); the v1 boolean `listOnly` argument
 * is accepted as a deprecated equivalent.
 */
export type ObjectOpts = {
  arrays?: boolean;
};

/*
 * Node filters accepted by NodeView.filter(): the search node query plus
 * edge-existence constraints.
 */
export type NodeFilterQuery = NodeObjectQuery & {
  has?: string;
  lacks?: string;
};

/*
 * Options for NodeView/PathView hops.
 */
export type HopOpts = {
  transitive?: boolean;
  where?: NodeObjectQuery;
};

/*
 * Selectors accepted by nodes()/paths().
 */
export type NodeSelector =
  | NodeObjectQuery
  | string
  | string[]
  | Set<string>;
