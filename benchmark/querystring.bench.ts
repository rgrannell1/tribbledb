import { unwrap } from "https://deno.land/x/peach_ts@0.4.2/src/mod.ts";
import {
  parseQueryString,
  parseQueryStringBaseline,
} from "../src/urn.ts";
import { QueryString } from "./fuzzers.ts";

const PARAMS = {
  NUM_PAIRS: 3,
  KEY_LENGTH: 10,
  VALUE_LENGTH: 10,
};

// Generate test data once
function generateQueryStrings(count: number): string[] {
  const result: string[] = [];
  for (let i = 0; i < count; i++) {
    result.push(
      unwrap(QueryString(PARAMS.NUM_PAIRS, PARAMS.KEY_LENGTH, PARAMS.VALUE_LENGTH)),
    );
  }
  return result;
}

const SAMPLE_SIZE = 1000;
const testData = generateQueryStrings(SAMPLE_SIZE);

// ============================================================================
// Benchmark: Baseline (URLSearchParams)
// ============================================================================
Deno.bench({
  name: `parseQueryString baseline (${SAMPLE_SIZE} strings, ${PARAMS.NUM_PAIRS} pairs each)`,
  group: "parseQueryString",
  baseline: true,
  fn: () => {
    for (const qs of testData) {
      parseQueryStringBaseline(qs);
    }
  },
});

// ============================================================================
// Benchmark: Optimized implementation
// ============================================================================
Deno.bench({
  name: `parseQueryString optimized (${SAMPLE_SIZE} strings, ${PARAMS.NUM_PAIRS} pairs each)`,
  group: "parseQueryString",
  fn: () => {
    for (const qs of testData) {
      parseQueryString(qs);
    }
  },
});

// ============================================================================
// Benchmark: Empty string edge case
// ============================================================================
Deno.bench({
  name: "parseQueryString baseline (empty)",
  group: "parseQueryString-empty",
  baseline: true,
  fn: () => {
    for (let i = 0; i < SAMPLE_SIZE; i++) {
      parseQueryStringBaseline("");
    }
  },
});

Deno.bench({
  name: "parseQueryString optimized (empty)",
  group: "parseQueryString-empty",
  fn: () => {
    for (let i = 0; i < SAMPLE_SIZE; i++) {
      parseQueryString("");
    }
  },
});

// ============================================================================
// Benchmark: Single pair
// ============================================================================
const singlePairData = generateQueryStrings(SAMPLE_SIZE).map(() =>
  unwrap(QueryString(1, PARAMS.KEY_LENGTH, PARAMS.VALUE_LENGTH))
);

Deno.bench({
  name: "parseQueryString baseline (single pair)",
  group: "parseQueryString-single",
  baseline: true,
  fn: () => {
    for (const qs of singlePairData) {
      parseQueryStringBaseline(qs);
    }
  },
});

Deno.bench({
  name: "parseQueryString optimized (single pair)",
  group: "parseQueryString-single",
  fn: () => {
    for (const qs of singlePairData) {
      parseQueryString(qs);
    }
  },
});
