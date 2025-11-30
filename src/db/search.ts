/*
 * TribbleDB search
 */

import type { Index } from "../indices/index.ts";
import type { NodeObjectQuery, SearchObject } from "../types.ts";
import type { RelationObjectQuery } from "../types.ts";
import type { TribbleDBPerformanceMetrics } from "../metrics.ts";
import { Sets } from "../sets.ts";

/*
 * At runtime, validate the user provided a sensible search definition.
 */
export function validateInput(params: SearchObject) {
  const allowedKeys = ["source", "relation", "target"];
  if (!Array.isArray(params)) {
    for (const key of Object.keys(params)) {
      if (!Object.prototype.hasOwnProperty.call(params, key)) continue;
      if (!allowedKeys.includes(key)) {
        throw new Error(`Unexpected search parameter: ${key}`);
      }
    }
  }
}

/*
 * Find all nodes matching the requested types
 */
function nodeTypeMatches(type: string, source: boolean, index: Index) {
  const matches = source
    ? index.getSourceTypeSet(type)
    : index.getTargetTypeSet(type);

  if (matches === undefined || matches.size === 0) {
    return new Set<number>();
  }

  // some matches found, continue by searching the other parameters
  return matches;
}

/*
 * ID match semantics are more complex. We can provide a list of ids. We
 * treat the matching rows as matches(id0) ∪ matches(id1) ∪ ... matches(idn)
 */
function nodeIdMatches(id: string | string[], source: boolean, index: Index) {
  const matches = new Set<number>();

  const ids = Array.isArray(id) ? id : [id];

  for (const subid of ids) {
    const subidRows = source
      ? index.getSourceIdSet(subid)
      : index.getTargetIdSet(subid);

    // union the matching rows into `idRows`
    if (subidRows) {
      Sets.append(matches, subidRows);
    }
  }

  if (matches.size === 0) {
    return new Set<number>();
  }

  return matches;
}

/*
 * QS has different semantics to ID matching. We expect all
 * provided querystrings to match, so the resultset is
 *
 *   matches(k0, v0) ∩ matches(k1, v1) ∩ ... ∩ matches(kn, vn)
 *
 * append each subset to an array, and union them
 */
function nodeQsMatches(
  qs: NonNullable<NodeObjectQuery["qs"]>,
  source: boolean,
  index: Index,
  metrics: TribbleDBPerformanceMetrics,
) {
  const matches: Set<number>[] = [];

  for (const [key, val] of Object.entries(qs)) {
    const qsSet = source
      ? index.getSourceQsSet(key, val)
      : index.getTargetQsSet(key, val);

    // no matches found for specified key:val, so
    // no matches possible. Bail
    if (typeof qsSet === "undefined") {
      return new Set<number>();
    }

    matches.push(qsSet);
  }

  // the intersection of each kv matches gives
  // the set of overall matching nodes
  return Sets.intersection(metrics, matches);
}

/*
 * Find matching positions in the index for the provided node-query.
 */
export function nodeMatches(
  query: NodeObjectQuery,
  source: boolean,
  index: Index,
  metrics: TribbleDBPerformanceMetrics,
  cursorIndices: Set<number>,
): Set<number> {
  // Compute type, id, qs, and then predicate matches step by step.

  let typeRows: Set<number> | undefined = undefined;
  if (query.type) {
    typeRows = nodeTypeMatches(query.type, source, index);

    // we requested matches for this type, but found none. So there's
    // no possibility of this search returning results. Bail
    if (typeRows.size === 0) {
      return new Set<number>();
    }
  }

  let idRows: Set<number> | undefined = undefined;

  if (query.id) {
    idRows = nodeIdMatches(query.id, source, index);
    // No ids matched, so the query cannot succeed, bail
    if (idRows.size === 0) {
      return new Set<number>();
    }
  }

  let qsRows: Set<number> | undefined = undefined;

  if (query.qs && Object.keys(query.qs).length > 0) {
    qsRows = nodeQsMatches(query.qs, source, index, metrics);

    // no matching QS, so bail
    if (qsRows.size === 0) {
      return new Set<number>();
    }
  }

  /*
   * Intersect typeRows, idRows, and qsRows to compute a preliminary set
   * of matches. If none are defined, then return all rows. Otherwise, intersect all rows
   * with each defined term `typeRows`, `idRows`, `qsRows`
   */
  if (typeRows === undefined && idRows === undefined && qsRows === undefined) {
    const pred = query.predicate;

    if (!pred) {
      return cursorIndices;
    }

    const indexCopy = new Set([...cursorIndices]);

    for (const idx of indexCopy) {
      // Handle gaps: getTriple might return undefined for deleted indices
      const triple = index.getTriple(idx);
      if (!triple) {
        indexCopy.delete(idx);
        continue;
      }

      if (!pred(source ? triple[0] : triple[2])) {
        indexCopy.delete(idx); // Safe in JS
      }
    }

    return indexCopy;
  }

  const matches: Set<number>[] = [cursorIndices];
  if (typeRows !== undefined) {
    matches.push(typeRows);
  }

  if (idRows !== undefined) {
    matches.push(idRows);
  }

  if (qsRows !== undefined) {
    matches.push(qsRows);
  }

  const matchingRows = Sets.intersection(metrics, matches);
  if (!query.predicate) {
    return matchingRows;
  }

  /*
   * Finally (because it's expensive!), check predicates against
   * the remaining matching rows. Provide the underlying source or
   * target value to the predicate.
   */
  const pred = query.predicate;

  for (const idx of matchingRows) {
    const triple = index.getTriple(idx)!;

    if (!pred(source ? triple[0] : triple[2])) {
      matchingRows.delete(idx); // Safe in JS
    }
  }

  return matchingRows;
}

/*
 * Find nodes that match the queries provided. We union the results#
 * of each subquery.
 */
export function findMatchingNodes(
  query: NodeObjectQuery[],
  source: boolean,
  index: Index,
  metrics: TribbleDBPerformanceMetrics,
  cursorIndices: Set<number>,
) {
  const matches = new Set<number>();

  for (const subquery of query) {
    Sets.append(
      matches,
      nodeMatches(subquery, source, index, metrics, cursorIndices),
    );
  }

  return matches;
}

/*
 * Find all triples rows the matching indices,
 * by unioning the results of each relation, and
 * then potentially filtering by a predicate
 */
export function findMatchingRelations(
  query: RelationObjectQuery,
  index: Index,
) {
  const relations = Array.isArray(query.relation)
    ? query.relation
    : [query.relation];

  const matches = new Set<number>();
  for (const rel of relations) {
    const relationSet = index.getRelationSet(rel);

    if (relationSet) {
      Sets.append(matches, relationSet);
    }
  }

  if (!query.predicate) {
    return matches;
  }

  const pred = query.predicate;

  for (const idx of matches) {
    // Handle gaps: getTriple might return undefined for deleted indices
    const triple = index.getTriple(idx);
    if (!triple) {
      matches.delete(idx);
      continue;
    }

    if (!pred(triple[1])) {
      matches.delete(idx);
    }
  }

  return matches;
}

/*
 * Find triples that match the provided query
 */
export function findMatchingRows(
  params: SearchObject,
  index: Index,
  cursorIndices: Set<number>,
  metrics: TribbleDBPerformanceMetrics,
): Set<number> {
  // by default, all triples are in the intersection set. Then, we
  // only keep the triple rows that meet the other criteria too, by
  // intersecting all row sets.

  const { source, relation, target } = params;
  const matchingRowSets: Set<number>[] = [];

  if (source) {
    const input = Array.isArray(source) ? source : [source];
    const matches = findMatchingNodes(
      input,
      true,
      index,
      metrics,
      cursorIndices,
    );

    matchingRowSets.push(matches);
  }

  if (relation) {
    matchingRowSets.push(findMatchingRelations(relation, index));
  }

  if (target) {
    const input = Array.isArray(target) ? target : [target];
    const matches = findMatchingNodes(
      input,
      false,
      index,
      metrics,
      cursorIndices,
    );

    matchingRowSets.push(matches);
  }

  return Sets.intersection(metrics, matchingRowSets);
}
