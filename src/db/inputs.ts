/*
 * Parse search inputs into an internal representation.
 */

import type {
  NodeObjectQuery,
  NodeSearch,
  RelationObjectQuery,
  RelationSearch,
  Search,
  SearchObject,
} from "../types.ts";

import { asUrn } from "../urn.ts";

/*
 * Check whether a value is a URN (or alternatively, a literal value)
 */
export function isUrn(value: string): boolean {
  return value.startsWith(`urn:`);
}

/*
 * Parse the shorthand NodeSearch type into the internally used
 * NodeObjectQuery type. This is not generally the most performance-critical
 * path (the search itself needs to be optimised more than this step)
 */
export function parseNodeSearch(search: NodeSearch): NodeObjectQuery[] {
  // if it's a single string, return a single search
  if (typeof search === "string") {
    return isUrn(search) ? [asUrn(search)] : [{
      type: "unknown",
      id: search,
    }];
  }

  if (Array.isArray(search)) {
    return search.map((subsearch) => {
      return isUrn(subsearch) ? asUrn(subsearch) : {
        type: "unknown",
        id: subsearch,
      };
    });
  }

  return [search];
}

/*
 * Parse the shorthand relation search into the internally used
 * RelationObjectQuery type.
 */
export function parseRelation(search: RelationSearch): RelationObjectQuery {
  return typeof search === "string" || Array.isArray(search)
    ? { relation: search }
    : search;
}

/*
 * Parse the user-input search onto an internal SearchObject
 */
export function parseSearch(search: Search): SearchObject {
  const source = Array.isArray(search) ? search[0] : search.source;
  const relation = Array.isArray(search) ? search[1] : search.relation;
  const target = Array.isArray(search) ? search[2] : search.target;

  const out: SearchObject = {};
  if (source) {
    out.source = parseNodeSearch(source);
  }
  if (relation) {
    out.relation = parseRelation(relation);
  }
  if (target) {
    out.target = parseNodeSearch(target);
  }

  return out;
}
