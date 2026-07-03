/*
 * Node-oriented traversal layer: NodeView (a set of nodes over a shared
 * store) and PathView (the provenance-tracking variant). All hops and
 * filters operate on interned ids; strings appear only at terminals.
 */

import type { NodeObjectQuery, TripleObject } from "../types.ts";
import type { TripleStore } from "./store.ts";
import type { HopOpts, NodeFilterQuery, NodeSelector } from "./types.ts";

/*
 * The visibility context a traversal runs under: the store plus the row-set
 * of the owning database view (null for a live root database).
 */
export type Visibility = {
  store: TripleStore;
  rows: Set<number> | null;
};

function isRowVisible(visibility: Visibility, row: number): boolean {
  if (visibility.rows !== null) {
    return visibility.rows.has(row);
  }
  return visibility.store.isAlive(row);
}

/*
 * Check a node against a node query's type/id/qs/predicate constraints.
 */
export function matchesNodeQuery(
  store: TripleStore,
  nodeId: number,
  query: NodeObjectQuery,
): boolean {
  const meta = store.nodeMeta.get(nodeId);
  if (!meta) {
    return false;
  }

  if (query.type !== undefined) {
    if (store.nodes.idOf(query.type) !== meta.typeId) {
      return false;
    }
  }

  if (query.id !== undefined) {
    const wanted = Array.isArray(query.id) ? query.id : [query.id];
    const matched = wanted.some((candidate) => {
      return store.nodes.idOf(candidate) === meta.idId;
    });
    if (!matched) {
      return false;
    }
  }

  if (query.qs !== undefined) {
    for (const [qsKey, qsValue] of Object.entries(query.qs)) {
      const compositeId = store.nodes.idOf(`${qsKey}=${qsValue}`);
      if (compositeId === undefined || !meta.qsIds.includes(compositeId)) {
        return false;
      }
    }
  }

  if (query.predicate && !query.predicate(store.nodes.valueOf(nodeId))) {
    return false;
  }

  return true;
}

/*
 * Resolve a node selector to a set of interned node ids.
 */
export function resolveSelector(
  visibility: Visibility,
  selector: NodeSelector,
): Set<number> {
  const { store } = visibility;

  if (typeof selector === "string") {
    return resolveUrns(store, [selector]);
  }
  if (Array.isArray(selector)) {
    return resolveUrns(store, selector);
  }
  if (selector instanceof Set) {
    return resolveUrns(store, selector);
  }

  return resolveQuery(store, selector);
}

function resolveUrns(store: TripleStore, urns: Iterable<string>): Set<number> {
  const nodeIds = new Set<number>();

  for (const urn of urns) {
    const nodeId = store.nodes.idOf(urn);
    if (nodeId !== undefined && store.nodeMeta.has(nodeId)) {
      nodeIds.add(nodeId);
    }
  }

  return nodeIds;
}

function resolveQuery(
  store: TripleStore,
  query: NodeObjectQuery,
): Set<number> {
  let candidates: Iterable<number> | undefined = undefined;

  if (query.type !== undefined) {
    const typeId = store.nodes.idOf(query.type);
    candidates = typeId === undefined
      ? []
      : store.nodesByType.get(typeId) ?? [];
  } else if (query.id !== undefined) {
    const wanted = Array.isArray(query.id) ? query.id : [query.id];
    const union = new Set<number>();

    for (const candidateId of wanted) {
      const idId = store.nodes.idOf(candidateId);
      const nodeIds = idId === undefined
        ? undefined
        : store.nodesById.get(idId);

      if (nodeIds) {
        for (const nodeId of nodeIds) {
          union.add(nodeId);
        }
      }
    }
    candidates = union;
  } else {
    candidates = store.nodeMeta.keys();
  }

  const matched = new Set<number>();
  for (const nodeId of candidates) {
    if (matchesNodeQuery(store, nodeId, query)) {
      matched.add(nodeId);
    }
  }

  return matched;
}

/*
 * Resolve hop relations to a set of interned relation ids.
 * null means "any relation"; an empty set matches nothing.
 */
function resolveRelationIds(
  store: TripleStore,
  relations?: string | string[],
): Set<number> | null {
  if (relations === undefined) {
    return null;
  }

  const names = Array.isArray(relations) ? relations : [relations];
  const relationIds = new Set<number>();

  for (const name of names) {
    const relationId = store.relationNames.idOf(name);
    if (relationId !== undefined) {
      relationIds.add(relationId);
    }
  }

  return relationIds;
}

/*
 * One hop from a single node: yields the nodes reached over visible rows.
 */
function* hopFromNode(
  visibility: Visibility,
  nodeId: number,
  forward: boolean,
  relationIds: Set<number> | null,
  where?: NodeObjectQuery,
): Generator<number> {
  const { store } = visibility;
  const adjacency = forward
    ? store.rowsBySource.get(nodeId)
    : store.rowsByTarget.get(nodeId);

  if (!adjacency) {
    return;
  }

  for (const row of adjacency) {
    if (!isRowVisible(visibility, row)) {
      continue;
    }
    if (relationIds !== null && !relationIds.has(store.relationIds[row])) {
      continue;
    }

    const reached = forward ? store.targetIds[row] : store.sourceIds[row];
    if (where !== undefined && !matchesNodeQuery(store, reached, where)) {
      continue;
    }

    yield reached;
  }
}

function hopOnce(
  visibility: Visibility,
  frontier: Set<number>,
  forward: boolean,
  relationIds: Set<number> | null,
  where?: NodeObjectQuery,
): Set<number> {
  const reached = new Set<number>();

  for (const nodeId of frontier) {
    for (
      const nextId of hopFromNode(
        visibility,
        nodeId,
        forward,
        relationIds,
        where,
      )
    ) {
      reached.add(nextId);
    }
  }

  return reached;
}

/*
 * Nodes reachable in one hop, or in one-or-more hops when transitive.
 */
function hop(
  visibility: Visibility,
  startNodes: Set<number>,
  forward: boolean,
  relations?: string | string[],
  opts: HopOpts = {},
): Set<number> {
  const relationIds = resolveRelationIds(visibility.store, relations);

  if (!opts.transitive) {
    return hopOnce(visibility, startNodes, forward, relationIds, opts.where);
  }

  const reachable = new Set<number>();
  let frontier = startNodes;

  while (frontier.size > 0) {
    const next = hopOnce(
      visibility,
      frontier,
      forward,
      relationIds,
      opts.where,
    );
    const fresh = new Set<number>();

    for (const nodeId of next) {
      if (!reachable.has(nodeId)) {
        reachable.add(nodeId);
        fresh.add(nodeId);
      }
    }
    frontier = fresh;
  }

  return reachable;
}

/*
 * Does the node have at least one visible outgoing edge of this relation?
 */
function hasOutgoingRelation(
  visibility: Visibility,
  nodeId: number,
  relation: string,
): boolean {
  const { store } = visibility;
  const relationId = store.relationNames.idOf(relation);
  if (relationId === undefined) {
    return false;
  }

  const adjacency = store.rowsBySource.get(nodeId);
  if (!adjacency) {
    return false;
  }

  for (const row of adjacency) {
    if (
      store.relationIds[row] === relationId && isRowVisible(visibility, row)
    ) {
      return true;
    }
  }
  return false;
}

/*
 * Build a stable, array-valued TripleObject from a node's visible rows.
 * Returns undefined for nodes with no visible outgoing edges.
 */
function buildNodeObject(
  visibility: Visibility,
  nodeId: number,
): TripleObject | undefined {
  const { store } = visibility;
  const adjacency = store.rowsBySource.get(nodeId);
  if (!adjacency) {
    return undefined;
  }

  const rows = [...adjacency]
    .filter((row) => isRowVisible(visibility, row))
    .sort((rowA, rowB) => rowA - rowB);

  if (rows.length === 0) {
    return undefined;
  }

  const obj: TripleObject = { id: store.nodes.valueOf(nodeId) };
  for (const row of rows) {
    const relation = store.relationNames.valueOf(store.relationIds[row]);
    const target = store.nodes.valueOf(store.targetIds[row]);

    const existing = obj[relation];
    if (existing === undefined) {
      obj[relation] = [target];
    } else if (!(existing as string[]).includes(target)) {
      (existing as string[]).push(target);
    }
  }

  return obj;
}

export class NodeView {
  private visibility: Visibility;
  private nodeIds: Set<number>;

  constructor(visibility: Visibility, nodeIds: Set<number>) {
    this.visibility = visibility;
    this.nodeIds = nodeIds;
  }

  follow(relations?: string | string[], opts: HopOpts = {}): NodeView {
    const reached = hop(this.visibility, this.nodeIds, true, relations, opts);
    return new NodeView(this.visibility, reached);
  }

  referencedBy(relations?: string | string[], opts: HopOpts = {}): NodeView {
    const reached = hop(this.visibility, this.nodeIds, false, relations, opts);
    return new NodeView(this.visibility, reached);
  }

  filter(query: NodeFilterQuery): NodeView {
    const { has, lacks, ...nodeQuery } = query;
    const kept = new Set<number>();

    for (const nodeId of this.nodeIds) {
      if (!matchesNodeQuery(this.visibility.store, nodeId, nodeQuery)) {
        continue;
      }
      if (
        has !== undefined && !hasOutgoingRelation(this.visibility, nodeId, has)
      ) {
        continue;
      }
      if (
        lacks !== undefined &&
        hasOutgoingRelation(this.visibility, nodeId, lacks)
      ) {
        continue;
      }
      kept.add(nodeId);
    }

    return new NodeView(this.visibility, kept);
  }

  union(other: NodeView): NodeView {
    this.assertSameStore(other);
    const combined = new Set(this.nodeIds);
    for (const nodeId of other.nodeIds) {
      combined.add(nodeId);
    }
    return new NodeView(this.visibility, combined);
  }

  intersect(other: NodeView): NodeView {
    this.assertSameStore(other);
    const kept = new Set<number>();
    for (const nodeId of this.nodeIds) {
      if (other.nodeIds.has(nodeId)) {
        kept.add(nodeId);
      }
    }
    return new NodeView(this.visibility, kept);
  }

  subtract(other: NodeView): NodeView {
    this.assertSameStore(other);
    const kept = new Set<number>();
    for (const nodeId of this.nodeIds) {
      if (!other.nodeIds.has(nodeId)) {
        kept.add(nodeId);
      }
    }
    return new NodeView(this.visibility, kept);
  }

  private assertSameStore(other: NodeView): void {
    if (other.visibility.store !== this.visibility.store) {
      throw new Error("Cannot combine NodeViews from different databases.");
    }
  }

  private sortedNodeIds(): number[] {
    return [...this.nodeIds].sort((idA, idB) => idA - idB);
  }

  urns(): Set<string> {
    const { store } = this.visibility;
    const result = new Set<string>();
    for (const nodeId of this.sortedNodeIds()) {
      result.add(store.nodes.valueOf(nodeId));
    }
    return result;
  }

  /*
   * The id components of the nodes; qs-variant URNs collapse onto one id.
   */
  ids(): Set<string> {
    const { store } = this.visibility;
    const result = new Set<string>();
    for (const nodeId of this.sortedNodeIds()) {
      const meta = store.nodeMeta.get(nodeId)!;
      result.add(store.nodes.valueOf(meta.idId));
    }
    return result;
  }

  count(): number {
    return this.nodeIds.size;
  }

  has(urn: string): boolean {
    const nodeId = this.visibility.store.nodes.idOf(urn);
    return nodeId !== undefined && this.nodeIds.has(nodeId);
  }

  /*
   * Materialise nodes with visible outgoing edges as array-valued objects.
   */
  objects(): TripleObject[] {
    const result: TripleObject[] = [];
    for (const nodeId of this.sortedNodeIds()) {
      const obj = buildNodeObject(this.visibility, nodeId);
      if (obj) {
        result.push(obj);
      }
    }
    return result;
  }

  /*
   * As objects(), keyed by URN. Nodes with no visible outgoing edges are
   * absent keys, so "not found" is distinguishable from "empty".
   */
  objectsById(): Map<string, TripleObject> {
    const { store } = this.visibility;
    const result = new Map<string, TripleObject>();

    for (const nodeId of this.sortedNodeIds()) {
      const obj = buildNodeObject(this.visibility, nodeId);
      if (obj) {
        result.set(store.nodes.valueOf(nodeId), obj);
      }
    }
    return result;
  }
}

/*
 * PathView: (start, end) node pairs. Hops advance the end node while
 * retaining the start, so derivation code can fabricate triples from the
 * pairing. Stored as end -> set of starts.
 */
export class PathView {
  private visibility: Visibility;
  private endToStarts: Map<number, Set<number>>;

  constructor(visibility: Visibility, endToStarts: Map<number, Set<number>>) {
    this.visibility = visibility;
    this.endToStarts = endToStarts;
  }

  static fromNodes(visibility: Visibility, nodeIds: Set<number>): PathView {
    const endToStarts = new Map<number, Set<number>>();
    for (const nodeId of nodeIds) {
      endToStarts.set(nodeId, new Set([nodeId]));
    }
    return new PathView(visibility, endToStarts);
  }

  follow(relations?: string | string[], opts: HopOpts = {}): PathView {
    if (!opts.transitive) {
      return new PathView(
        this.visibility,
        this.followOnce(this.endToStarts, relations, opts),
      );
    }

    // transitive: pair each start with every node reachable in >= 1 hops
    const accumulated = new Map<number, Set<number>>();
    let frontier = this.endToStarts;

    while (frontier.size > 0) {
      const next = this.followOnce(frontier, relations, opts);
      const fresh = new Map<number, Set<number>>();

      for (const [endId, startIds] of next) {
        let known = accumulated.get(endId);
        if (!known) {
          known = new Set();
          accumulated.set(endId, known);
        }

        const freshStarts = new Set<number>();
        for (const startId of startIds) {
          if (!known.has(startId)) {
            known.add(startId);
            freshStarts.add(startId);
          }
        }
        if (freshStarts.size > 0) {
          fresh.set(endId, freshStarts);
        }
      }
      frontier = fresh;
    }

    return new PathView(this.visibility, accumulated);
  }

  private followOnce(
    frontier: Map<number, Set<number>>,
    relations?: string | string[],
    opts: HopOpts = {},
  ): Map<number, Set<number>> {
    const relationIds = resolveRelationIds(this.visibility.store, relations);
    const next = new Map<number, Set<number>>();

    for (const [endId, startIds] of frontier) {
      const reached = hopOnce(
        this.visibility,
        new Set([endId]),
        true,
        relationIds,
        opts.where,
      );

      for (const reachedId of reached) {
        let starts = next.get(reachedId);
        if (!starts) {
          starts = new Set();
          next.set(reachedId, starts);
        }
        for (const startId of startIds) {
          starts.add(startId);
        }
      }
    }

    return next;
  }

  pairs(): [string, string][] {
    const { store } = this.visibility;
    const result: [string, string][] = [];

    const sortedEnds = [...this.endToStarts.keys()].sort((idA, idB) =>
      idA - idB
    );
    for (const endId of sortedEnds) {
      const startIds = [...this.endToStarts.get(endId)!].sort((idA, idB) =>
        idA - idB
      );
      for (const startId of startIds) {
        result.push([store.nodes.valueOf(startId), store.nodes.valueOf(endId)]);
      }
    }

    return result;
  }
}
