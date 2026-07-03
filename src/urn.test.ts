import { assertEquals } from "@std/assert";
import {
  parseQueryString,
  parseQueryStringBaseline,
} from "./urn.ts";

// Import peach for fuzzing
import { unwrap } from "peach";
import { QueryString } from "../benchmark/fuzzers.ts";

// ============================================================================
// Parity tests: parseQueryString must match parseQueryStringBaseline
// ============================================================================

Deno.test("parseQueryString parity: empty string", () => {
  const input = "";
  assertEquals(parseQueryString(input), parseQueryStringBaseline(input));
});

Deno.test("parseQueryString parity: single pair", () => {
  const input = "foo=bar";
  assertEquals(parseQueryString(input), parseQueryStringBaseline(input));
});

Deno.test("parseQueryString parity: multiple pairs", () => {
  const input = "a=1&b=2&c=3";
  assertEquals(parseQueryString(input), parseQueryStringBaseline(input));
});

Deno.test("parseQueryString parity: URL encoded values", () => {
  const input = "key=hello%20world&other=foo%26bar";
  assertEquals(parseQueryString(input), parseQueryStringBaseline(input));
});

Deno.test("parseQueryString parity: special characters", () => {
  const input = "name=%C3%A9%C3%A0%C3%BC&emoji=%F0%9F%98%80";
  assertEquals(parseQueryString(input), parseQueryStringBaseline(input));
});

Deno.test("parseQueryString parity: empty value", () => {
  const input = "key=&other=value";
  assertEquals(parseQueryString(input), parseQueryStringBaseline(input));
});

Deno.test("parseQueryString parity: duplicate keys (last wins)", () => {
  const input = "key=first&key=second";
  assertEquals(parseQueryString(input), parseQueryStringBaseline(input));
});

// ============================================================================
// Fuzz test: random query strings from peach
// ============================================================================

Deno.test("parseQueryString parity: fuzz test (1000 random query strings)", () => {
  const FUZZ_COUNT = 1000;
  const PARAMS = {
    NUM_PAIRS: 5,
    KEY_LENGTH: 10,
    VALUE_LENGTH: 15,
  };

  for (let i = 0; i < FUZZ_COUNT; i++) {
    const qs = unwrap(
      QueryString(PARAMS.NUM_PAIRS, PARAMS.KEY_LENGTH, PARAMS.VALUE_LENGTH),
    );

    const optimized = parseQueryString(qs);
    const baseline = parseQueryStringBaseline(qs);

    assertEquals(
      optimized,
      baseline,
      `Mismatch for query string: "${qs}"`,
    );
  }
});
