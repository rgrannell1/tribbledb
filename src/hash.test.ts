import { assertEquals, assertNotEquals } from "jsr:@std/assert";
import { hash, hashTriple } from "./hash.ts";
import type { Triple } from "./types.ts";

Deno.test("hash: returns 0 for empty string", () => {
  const result = hash("");
  assertEquals(result, 0);
});

Deno.test("hash: returns consistent value for same string", () => {
  const str = "hello world";
  const hash1 = hash(str);
  const hash2 = hash(str);
  assertEquals(hash1, hash2);
});

Deno.test("hash: returns different values for different strings", () => {
  const hash1 = hash("apple");
  const hash2 = hash("banana");
  assertNotEquals(hash1, hash2);
});

Deno.test("hash: handles single character", () => {
  const result = hash("a");
  assertEquals(typeof result, "number");
  assertNotEquals(result, 0);
});

Deno.test("hash: handles multiple characters", () => {
  const result = hash("abc123");
  assertEquals(typeof result, "number");
});

Deno.test("hash: handles unicode characters", () => {
  const result = hash("ró");
  assertEquals(typeof result, "number");
  assertNotEquals(result, hash("ro"));
});

Deno.test("hash: handles special characters", () => {
  const result = hash("!@#$%^&*()");
  assertEquals(typeof result, "number");
});

Deno.test("hash: handles whitespace", () => {
  const result = hash("   ");
  assertEquals(typeof result, "number");
  assertNotEquals(result, 0);
});

Deno.test("hash: handles newlines and tabs", () => {
  const result = hash("line1\nline2\ttab");
  assertEquals(typeof result, "number");
});

Deno.test("hash: different lengths produce different hashes", () => {
  const hash1 = hash("a");
  const hash2 = hash("aa");
  const hash3 = hash("aaa");
  assertNotEquals(hash1, hash2);
  assertNotEquals(hash2, hash3);
  assertNotEquals(hash1, hash3);
});

Deno.test("hash: order matters", () => {
  const hash1 = hash("abc");
  const hash2 = hash("cba");
  assertNotEquals(hash1, hash2);
});

Deno.test("hash: case sensitivity", () => {
  const hash1 = hash("Hello");
  const hash2 = hash("hello");
  assertNotEquals(hash1, hash2);
});

Deno.test("hash: long string", () => {
  const longStr = "a".repeat(1000);
  const result = hash(longStr);
  assertEquals(typeof result, "number");
});

Deno.test("hashTriple: returns consistent string for same triple", () => {
  const triple: Triple = ["person:alice", "name", "Alice"];
  const hash1 = hashTriple(triple);
  const hash2 = hashTriple(triple);
  assertEquals(hash1, hash2);
  assertEquals(typeof hash1, "string");
});

Deno.test("hashTriple: different triples produce different hashes", () => {
  const triple1: Triple = ["person:alice", "name", "Alice"];
  const triple2: Triple = ["person:bob", "name", "Bob"];
  const hash1 = hashTriple(triple1);
  const hash2 = hashTriple(triple2);
  assertNotEquals(hash1, hash2);
});

Deno.test("hashTriple: changing source changes hash", () => {
  const triple1: Triple = ["person:alice", "name", "Alice"];
  const triple2: Triple = ["person:bob", "name", "Alice"];
  const hash1 = hashTriple(triple1);
  const hash2 = hashTriple(triple2);
  assertNotEquals(hash1, hash2);
});

Deno.test("hashTriple: changing relation changes hash", () => {
  const triple1: Triple = ["person:alice", "name", "Alice"];
  const triple2: Triple = ["person:alice", "age", "Alice"];
  const hash1 = hashTriple(triple1);
  const hash2 = hashTriple(triple2);
  assertNotEquals(hash1, hash2);
});

Deno.test("hashTriple: changing target changes hash", () => {
  const triple1: Triple = ["person:alice", "name", "Alice"];
  const triple2: Triple = ["person:alice", "name", "Bob"];
  const hash1 = hashTriple(triple1);
  const hash2 = hashTriple(triple2);
  assertNotEquals(hash1, hash2);
});

Deno.test("hashTriple: handles empty strings in triple", () => {
  const triple: Triple = ["", "", ""];
  const result = hashTriple(triple);
  assertEquals(typeof result, "string");
  assertEquals(result, "0");
});

Deno.test("hashTriple: handles URN format", () => {
  const triple: Triple = ["urn:ró:amphibian:proteus", "habitat", "caves"];
  const result = hashTriple(triple);
  assertEquals(typeof result, "string");
});

Deno.test("hashTriple: handles unicode in triple", () => {
  const triple: Triple = ["urn:ró:person", "name", "José"];
  const result = hashTriple(triple);
  assertEquals(typeof result, "string");
});

Deno.test("hashTriple: handles special characters", () => {
  const triple: Triple = ["subject!@#", "relation$%^", "target&*()"];
  const result = hashTriple(triple);
  assertEquals(typeof result, "string");
});

Deno.test("hashTriple: order of triple elements matters", () => {
  const triple1: Triple = ["a", "b", "c"];
  const triple2: Triple = ["b", "a", "c"];
  const hash1 = hashTriple(triple1);
  const hash2 = hashTriple(triple2);
  assertNotEquals(hash1, hash2);
});

Deno.test("hashTriple: similar content different positions", () => {
  const triple1: Triple = ["alice", "knows", "bob"];
  const triple2: Triple = ["bob", "knows", "alice"];
  const hash1 = hashTriple(triple1);
  const hash2 = hashTriple(triple2);
  assertNotEquals(hash1, hash2);
});

Deno.test("hashTriple: long strings in triple", () => {
  const longStr = "x".repeat(500);
  const triple: Triple = [longStr, longStr, longStr];
  const result = hashTriple(triple);
  assertEquals(typeof result, "string");
});

Deno.test("hashTriple: whitespace matters", () => {
  const triple1: Triple = ["a", "b", "c"];
  const triple2: Triple = ["a ", "b", "c"];
  const hash1 = hashTriple(triple1);
  const hash2 = hashTriple(triple2);
  assertNotEquals(hash1, hash2);
});

Deno.test("hashTriple: case sensitivity", () => {
  const triple1: Triple = ["Person", "Name", "Alice"];
  const triple2: Triple = ["person", "name", "alice"];
  const hash1 = hashTriple(triple1);
  const hash2 = hashTriple(triple2);
  assertNotEquals(hash1, hash2);
});
