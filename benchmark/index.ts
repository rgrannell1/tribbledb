/*
 * Benchmark TribbleDB on representative workloads
 *
 */

// sample sizes {1,000, 10,000, 100,000}
// triple mixes: { value, typed, typed + qs }

// experiments:
// - insert time
// - delete time {10%, 50%, 100%}
// - search time { type only, id only, qs only, type + id, type + qs, id + qs, type + id + qs }
// - firstObject time
// - searchFlatmap time { 10%, 50%, 100% replacement }

// - hashtriple time
// - objects time
// - deduplicate triples time
// - readParsedThings time
