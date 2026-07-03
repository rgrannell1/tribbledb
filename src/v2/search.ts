/*
 * v2 search execution: evaluates a parsed SearchObject (v1's parseSearch
 * output, so the query grammar is shared) against a TripleStore and a base
 * row-set (a view's rows, or all live rows for a root database).
 *
 * Semantics mirror v1's index search exactly: per-subquery constraints are
 * intersected (type ∩ id-union ∩ qs-intersection), subqueries are unioned,
 * positions are intersected, and predicates run last against the survivors.
 */

import type { NodeObjectQuery, SearchObject } from "../types.ts";
import type { TripleStore } from "./store.ts";

/*
 * The index-phase result for one position (source or target):
 * - a set of candidate rows;
 * - "unconstrained": no indexable constraint (predicate-only subqueries),
 *   which in v1 admits every row into the candidate set;
 * - "skip": the position contributes nothing to candidate seeding. This
 *   preserves a v1 quirk: an empty relation list is ignored when other
 *   constraints exist, but yields an empty result when it stands alone.
 */
type PositionRows = Set<number> | "unconstrained" | "skip";

/*
 * Rows matching one node subquery's indexable constraints. The type/id/qs
 * constraints are intersected at NODE level (small sets, one entry per
 * distinct URN), then the surviving nodes' row lists are unioned — so the
 * cost is proportional to the result, and ingest never maintains
 * per-triple type/id/qs posting lists.
 */
function subqueryRows(
  store: TripleStore,
  query: NodeObjectQuery,
  isSource: boolean,
): Set<number> | "unconstrained" | "no-match" {
  const hasQs = query.qs !== undefined && Object.keys(query.qs).length > 0;
  const indexable = query.type !== undefined || query.id !== undefined || hasQs;

  if (!indexable) {
    return "unconstrained";
  }

  const nodeSets: Set<number>[] = [];

  if (query.type !== undefined) {
    const typeId = store.nodes.idOf(query.type);
    const nodes = typeId === undefined
      ? undefined
      : store.nodesByType.get(typeId);

    if (!nodes) {
      return "no-match";
    }
    nodeSets.push(nodes);
  }

  if (query.id !== undefined) {
    const wantedIds = Array.isArray(query.id) ? query.id : [query.id];
    const idUnion = new Set<number>();

    for (const wantedId of wantedIds) {
      const idId = store.nodes.idOf(wantedId);
      const nodes = idId === undefined ? undefined : store.nodesById.get(idId);

      if (nodes) {
        for (const nodeId of nodes) {
          idUnion.add(nodeId);
        }
      }
    }

    if (idUnion.size === 0) {
      return "no-match";
    }
    nodeSets.push(idUnion);
  }

  if (hasQs) {
    for (const [qsKey, qsValue] of Object.entries(query.qs ?? {})) {
      const compositeId = store.nodes.idOf(`${qsKey}=${qsValue}`);
      const nodes = compositeId === undefined
        ? undefined
        : store.nodesByQs.get(compositeId);

      if (!nodes) {
        return "no-match";
      }
      nodeSets.push(nodes);
    }
  }

  const matchedNodes = intersectAll(nodeSets);

  const adjacency = isSource ? store.rowsBySource : store.rowsByTarget;
  const rows = new Set<number>();
  for (const nodeId of matchedNodes) {
    const nodeRows = adjacency.get(nodeId);
    if (nodeRows) {
      for (const row of nodeRows) {
        rows.add(row);
      }
    }
  }

  return rows;
}

function intersectAll(sets: Set<number>[]): Set<number> {
  sets.sort((setA, setB) => setA.size - setB.size);

  const result = new Set<number>();
  const [smallest, ...rest] = sets;

  outer: for (const row of smallest) {
    for (const other of rest) {
      if (!other.has(row)) {
        continue outer;
      }
    }
    result.add(row);
  }

  return result;
}

/*
 * Index-phase rows for one position: union over subqueries, or
 * "unconstrained" when any subquery is predicate-only (v1 behaviour:
 * such subqueries admit every row into the candidate set).
 */
function positionRows(
  store: TripleStore,
  queries: NodeObjectQuery[],
  isSource: boolean,
): PositionRows {
  const union = new Set<number>();

  for (const query of queries) {
    const rows = subqueryRows(store, query, isSource);

    if (rows === "unconstrained") {
      return "unconstrained";
    }
    if (rows === "no-match") {
      continue;
    }
    for (const row of rows) {
      union.add(row);
    }
  }

  return union;
}

function relationRows(
  store: TripleStore,
  relations: string | string[],
): PositionRows {
  const names = Array.isArray(relations) ? relations : [relations];

  if (names.length === 0) {
    return "skip";
  }

  const union = new Set<number>();
  for (const name of names) {
    const relationId = store.relationNames.idOf(name);
    const rows = relationId === undefined
      ? undefined
      : store.rowsByRelation.get(relationId);

    if (rows) {
      for (const row of rows) {
        union.add(row);
      }
    }
  }

  return union;
}

/*
 * v1 predicate semantics: a row passes a position when some subquery's
 * predicate is absent or accepts the row's node string.
 */
function passesNodePredicates(
  queries: NodeObjectQuery[],
  value: string,
): boolean {
  for (const query of queries) {
    if (!query.predicate || query.predicate(value)) {
      return true;
    }
  }
  return false;
}

function baseRowsIterable(
  store: TripleStore,
  baseRows: Set<number> | null,
): Iterable<number> {
  if (baseRows !== null) {
    return baseRows;
  }

  return (function* liveRows() {
    for (let row = 0; row < store.rowCount; row++) {
      if (store.isAlive(row)) {
        yield row;
      }
    }
  })();
}

/*
 * Execute a parsed search. Returns matching rows in ascending row order
 * (insertion order), so materialised results are deterministic.
 */
export function executeSearch(
  store: TripleStore,
  parsed: SearchObject,
  baseRows: Set<number> | null,
): Set<number> {
  const constraints: PositionRows[] = [];

  if (parsed.source) {
    constraints.push(positionRows(store, parsed.source, true));
  }
  if (parsed.relation) {
    constraints.push(relationRows(store, parsed.relation.relation));
  }
  if (parsed.target) {
    constraints.push(positionRows(store, parsed.target, false));
  }

  const indexSets = constraints
    .filter((rows): rows is Set<number> => rows instanceof Set);
  const hasUnconstrained = constraints.includes("unconstrained");

  let candidates: Iterable<number>;
  if (indexSets.length > 0) {
    candidates = intersectAll(indexSets);
  } else if (hasUnconstrained || constraints.length === 0) {
    candidates = baseRowsIterable(store, baseRows);
  } else {
    // every constraint was "skip": v1 returns an empty result here
    return new Set();
  }

  const matched: number[] = [];

  for (const row of candidates) {
    if (indexSets.length > 0) {
      if (baseRows !== null) {
        if (!baseRows.has(row)) continue;
      } else if (!store.isAlive(row)) {
        continue;
      }
    }

    if (parsed.source) {
      const source = store.nodes.valueOf(store.sourceIds[row]);
      if (!passesNodePredicates(parsed.source, source)) continue;
    }

    if (parsed.relation?.predicate) {
      const relation = store.relationNames.valueOf(store.relationIds[row]);
      if (!parsed.relation.predicate(relation)) continue;
    }

    if (parsed.target) {
      const target = store.nodes.valueOf(store.targetIds[row]);
      if (!passesNodePredicates(parsed.target, target)) continue;
    }

    matched.push(row);
  }

  matched.sort((rowA, rowB) => rowA - rowB);
  return new Set(matched);
}
