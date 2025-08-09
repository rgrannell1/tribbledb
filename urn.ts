/*
 * URNs in this library follow the schema:
 *
 *   urn:<namespace>:<type>:<id>[?<querystring>]
 *
 * Information can be contextualised by query-string. E.g (in triple format)
 *
 *   ["urn:ró:bird:apus-apus?photo=123", "in-flight", "true"]
 *
 * Any triples matching this specification will have the relation-target applied semantically. E.g
 *
 *   urn:ró:bird:apus-apus?photo=123&context=captivity
 *
 * matches
 *
 *   urn:ró:bird:apus-apus
 *
 * does not. The pattern
 *
 *   ["urn:ró:bird:apus-apus", "name", "Swift"]
 *
 * matches all swifts, regardless of query parameters.
 */

import { ParsedUrn } from "./types.ts";

/*
 * Parses a URN string into its components.
 *
 * @param urn - The URN string to parse.
 * @param namespace - The namespace to use (default: "ró").
 * @returns The parsed URN components.
 */
export function parseUrn(urn: string, namespace: string = "ró"): ParsedUrn {
  if (!urn.startsWith(`urn:${namespace}:`)) {
    throw new Error(`Invalid URN for namespace ${namespace}: ${urn}`);
  }

  const type = urn.split(":")[2];
  const [urnPart, queryString] = urn.split("?");
  const id = urnPart.split(":")[3];
  const qs = queryString
    ? Object.fromEntries(new URLSearchParams(queryString))
    : {};

  return {
    type,
    id,
    qs,
  };
}

/*
 * Converts a string value to a URN.
 */
export function asUrn(value: string, namespace: string = "ró"): ParsedUrn {
  try {
    return parseUrn(value, namespace);
  } catch (_) {
    return {
      type: "unknown",
      id: value,
      qs: {},
    };
  }
}
