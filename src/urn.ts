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

import type { ParsedUrn } from "./types.ts";

/*
 * Parses a URN string into its components.
 *
 * Note: this code is a bottleneck, so it's written in a slightly horrible way for performance. Limited
 * validations for the same reason.
 *
 * @param urn - The URN string to parse.
 * @param namespace - The namespace to use (default: "ró").
 * @returns The parsed URN components.
 */
export function parseUrn(urn: string): ParsedUrn {
  const delimited = urn.split(":", 4);
  const type = delimited[2];
  const remainder = delimited[3] ?? "";

  const idx = remainder.indexOf("?");
  const queryString = idx !== -1 ? remainder.slice(idx + 1) : "";
  const id = idx !== -1 ? remainder.slice(0, idx) : remainder;

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
 *
 * @param value - The string value to convert.
 * @param namespace - The namespace to use (default: "ró").
 *
 * @returns The parsed URN components, or "unknown" type if not a valid URN.
 */
export function asUrn(value: string, namespace: string = "ró"): ParsedUrn {
  if (typeof value !== "string" || !value.startsWith(`urn:${namespace}:`)) {
    return {
      type: "unknown",
      id: value,
      qs: {},
    };
  }

  return parseUrn(value);
}
