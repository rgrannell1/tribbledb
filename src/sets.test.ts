import { assertEquals, assertStrictEquals } from "jsr:@std/assert";
import { IndexedSet, Sets } from "./sets.ts";
import { TribbleDBPerformanceMetrics } from "./metrics.ts";

Deno.test("IndexedSet: constructor initializes empty set", () => {
  const set = new IndexedSet();
  assertEquals(set.getIndex("test"), undefined);
  assertEquals(set.getValue(0), undefined);
  assertEquals(set.has("test"), false);
});

Deno.test("IndexedSet: add returns correct index for new value", () => {
  const set = new IndexedSet();
  const idx = set.add("first");
  assertEquals(idx, 0);
  assertEquals(set.getIndex("first"), 0);
  assertEquals(set.getValue(0), "first");
});

Deno.test("IndexedSet: add returns existing index for duplicate value", () => {
  const set = new IndexedSet();
  const idx1 = set.add("test");
  const idx2 = set.add("test");
  assertEquals(idx1, idx2);
  assertEquals(idx1, 0);
});

Deno.test("IndexedSet: add increments index for different values", () => {
  const set = new IndexedSet();
  assertEquals(set.add("first"), 0);
  assertEquals(set.add("second"), 1);
  assertEquals(set.add("third"), 2);
});

Deno.test("IndexedSet: setIndex sets custom index for value", () => {
  const set = new IndexedSet();
  set.setIndex("test", 42);
  assertEquals(set.getIndex("test"), 42);
  assertEquals(set.getValue(42), "test");
});

Deno.test("IndexedSet: getIndex returns undefined for non-existent value", () => {
  const set = new IndexedSet();
  assertEquals(set.getIndex("nonexistent"), undefined);
});

Deno.test("IndexedSet: getValue returns undefined for non-existent index", () => {
  const set = new IndexedSet();
  assertEquals(set.getValue(999), undefined);
});

Deno.test("IndexedSet: has returns true for existing value", () => {
  const set = new IndexedSet();
  set.add("test");
  assertEquals(set.has("test"), true);
});

Deno.test("IndexedSet: has returns false for non-existent value", () => {
  const set = new IndexedSet();
  assertEquals(set.has("test"), false);
});

Deno.test("IndexedSet: map returns underlying map", () => {
  const set = new IndexedSet();
  set.add("first");
  set.add("second");
  const map = set.map();
  assertEquals(map.get("first"), 0);
  assertEquals(map.get("second"), 1);
  assertEquals(map.size, 2);
});

Deno.test("IndexedSet: reverseMap returns underlying reverse map", () => {
  const set = new IndexedSet();
  set.add("first");
  set.add("second");
  const reverseMap = set.reverseMap();
  assertEquals(reverseMap.get(0), "first");
  assertEquals(reverseMap.get(1), "second");
  assertEquals(reverseMap.size, 2);
});

Deno.test("IndexedSet: clone creates independent copy", () => {
  const original = new IndexedSet();
  original.add("first");
  original.add("second");

  const cloned = original.clone();

  assertEquals(cloned.getIndex("first"), 0);
  assertEquals(cloned.getIndex("second"), 1);
  assertEquals(cloned.getValue(0), "first");
  assertEquals(cloned.getValue(1), "second");

  cloned.add("third");
  assertEquals(original.has("third"), false);
  assertEquals(cloned.has("third"), true);
});

Deno.test("IndexedSet: clone preserves custom indices", () => {
  const original = new IndexedSet();
  original.setIndex("test", 100);
  original.setIndex("other", 200);

  const cloned = original.clone();

  assertEquals(cloned.getIndex("test"), 100);
  assertEquals(cloned.getIndex("other"), 200);
  assertEquals(cloned.getValue(100), "test");
  assertEquals(cloned.getValue(200), "other");
});

Deno.test("Sets.intersection: returns empty set for empty input", () => {
  const metrics = new TribbleDBPerformanceMetrics();
  const result = Sets.intersection(metrics, []);
  assertEquals(result.size, 0);
});

Deno.test("Sets.intersection: returns copy of single set", () => {
  const metrics = new TribbleDBPerformanceMetrics();
  const set1 = new Set([1, 2, 3]);
  const result = Sets.intersection(metrics, [set1]);

  assertEquals(result.size, 3);
  assertEquals(result.has(1), true);
  assertEquals(result.has(2), true);
  assertEquals(result.has(3), true);

  result.add(4);
  assertEquals(set1.has(4), false);
});

Deno.test("Sets.intersection: finds common elements in two sets", () => {
  const metrics = new TribbleDBPerformanceMetrics();
  const set1 = new Set([1, 2, 3, 4]);
  const set2 = new Set([3, 4, 5, 6]);
  const result = Sets.intersection(metrics, [set1, set2]);

  assertEquals(result.size, 2);
  assertEquals(result.has(3), true);
  assertEquals(result.has(4), true);
});

Deno.test("Sets.intersection: finds common elements in multiple sets", () => {
  const metrics = new TribbleDBPerformanceMetrics();
  const set1 = new Set([1, 2, 3, 4, 5]);
  const set2 = new Set([2, 3, 4, 5, 6]);
  const set3 = new Set([3, 4, 5, 6, 7]);
  const result = Sets.intersection(metrics, [set1, set2, set3]);

  assertEquals(result.size, 3);
  assertEquals(result.has(3), true);
  assertEquals(result.has(4), true);
  assertEquals(result.has(5), true);
});

Deno.test("Sets.intersection: returns empty set when no common elements", () => {
  const metrics = new TribbleDBPerformanceMetrics();
  const set1 = new Set([1, 2, 3]);
  const set2 = new Set([4, 5, 6]);
  const result = Sets.intersection(metrics, [set1, set2]);

  assertEquals(result.size, 0);
});

Deno.test("Sets.intersection: sorts sets by size for optimization", () => {
  const metrics = new TribbleDBPerformanceMetrics();
  const small = new Set([1, 2]);
  const medium = new Set([1, 2, 3, 4]);
  const large = new Set([1, 2, 3, 4, 5, 6, 7, 8]);
  const result = Sets.intersection(metrics, [large, small, medium]);

  assertEquals(result.size, 2);
  assertEquals(result.has(1), true);
  assertEquals(result.has(2), true);
});

Deno.test("Sets.intersection: breaks early when accumulator is empty", () => {
  const metrics = new TribbleDBPerformanceMetrics();
  const set1 = new Set([1, 2, 3]);
  const set2 = new Set([4, 5, 6]);
  const set3 = new Set([7, 8, 9]);
  const result = Sets.intersection(metrics, [set1, set2, set3]);

  assertEquals(result.size, 0);
});

Deno.test("Sets.intersection: increments setCheck metric", () => {
  const metrics = new TribbleDBPerformanceMetrics();
  const set1 = new Set([1, 2, 3]);
  const set2 = new Set([2, 3, 4]);
  Sets.intersection(metrics, [set1, set2]);

  assertEquals(metrics.setCheckCount > 0, true);
});

Deno.test("Sets.intersection: works with string sets", () => {
  const metrics = new TribbleDBPerformanceMetrics();
  const set1 = new Set(["apple", "banana", "cherry"]);
  const set2 = new Set(["banana", "cherry", "date"]);
  const result = Sets.intersection(metrics, [set1, set2]);

  assertEquals(result.size, 2);
  assertEquals(result.has("banana"), true);
  assertEquals(result.has("cherry"), true);
});

Deno.test("Sets.append: adds all elements from second set to first", () => {
  const set1 = new Set([1, 2, 3]);
  const set2 = new Set([4, 5, 6]);
  const result = Sets.append(set1, set2);

  assertStrictEquals(result, set1);
  assertEquals(result.size, 6);
  assertEquals(result.has(1), true);
  assertEquals(result.has(2), true);
  assertEquals(result.has(3), true);
  assertEquals(result.has(4), true);
  assertEquals(result.has(5), true);
  assertEquals(result.has(6), true);
});

Deno.test("Sets.append: handles overlapping elements", () => {
  const set1 = new Set([1, 2, 3]);
  const set2 = new Set([3, 4, 5]);
  const result = Sets.append(set1, set2);

  assertEquals(result.size, 5);
  assertEquals(result.has(1), true);
  assertEquals(result.has(2), true);
  assertEquals(result.has(3), true);
  assertEquals(result.has(4), true);
  assertEquals(result.has(5), true);
});

Deno.test("Sets.append: handles empty second set", () => {
  const set1 = new Set([1, 2, 3]);
  const set2 = new Set<number>();
  const result = Sets.append(set1, set2);

  assertEquals(result.size, 3);
  assertEquals(result.has(1), true);
  assertEquals(result.has(2), true);
  assertEquals(result.has(3), true);
});

Deno.test("Sets.append: handles empty first set", () => {
  const set1 = new Set<number>();
  const set2 = new Set([1, 2, 3]);
  const result = Sets.append(set1, set2);

  assertEquals(result.size, 3);
  assertEquals(result.has(1), true);
  assertEquals(result.has(2), true);
  assertEquals(result.has(3), true);
});

Deno.test("Sets.append: works with string sets", () => {
  const set1 = new Set(["apple", "banana"]);
  const set2 = new Set(["cherry", "date"]);
  const result = Sets.append(set1, set2);

  assertEquals(result.size, 4);
  assertEquals(result.has("apple"), true);
  assertEquals(result.has("banana"), true);
  assertEquals(result.has("cherry"), true);
  assertEquals(result.has("date"), true);
});

Deno.test("Sets.difference: returns elements in first set but not second", () => {
  const set1 = new Set([1, 2, 3, 4, 5]);
  const set2 = new Set([3, 4, 5, 6, 7]);
  const result = Sets.difference(set1, set2);

  assertEquals(result.size, 2);
  assertEquals(result.has(1), true);
  assertEquals(result.has(2), true);
  assertEquals(result.has(3), false);
  assertEquals(result.has(4), false);
  assertEquals(result.has(5), false);
});

Deno.test("Sets.difference: returns all elements when no overlap", () => {
  const set1 = new Set([1, 2, 3]);
  const set2 = new Set([4, 5, 6]);
  const result = Sets.difference(set1, set2);

  assertEquals(result.size, 3);
  assertEquals(result.has(1), true);
  assertEquals(result.has(2), true);
  assertEquals(result.has(3), true);
});

Deno.test("Sets.difference: returns empty set when first set is subset", () => {
  const set1 = new Set([1, 2, 3]);
  const set2 = new Set([1, 2, 3, 4, 5]);
  const result = Sets.difference(set1, set2);

  assertEquals(result.size, 0);
});

Deno.test("Sets.difference: handles empty first set", () => {
  const set1 = new Set<number>();
  const set2 = new Set([1, 2, 3]);
  const result = Sets.difference(set1, set2);

  assertEquals(result.size, 0);
});

Deno.test("Sets.difference: handles empty second set", () => {
  const set1 = new Set([1, 2, 3]);
  const set2 = new Set<number>();
  const result = Sets.difference(set1, set2);

  assertEquals(result.size, 3);
  assertEquals(result.has(1), true);
  assertEquals(result.has(2), true);
  assertEquals(result.has(3), true);
});

Deno.test("Sets.difference: works with string sets", () => {
  const set1 = new Set(["apple", "banana", "cherry"]);
  const set2 = new Set(["banana", "date"]);
  const result = Sets.difference(set1, set2);

  assertEquals(result.size, 2);
  assertEquals(result.has("apple"), true);
  assertEquals(result.has("cherry"), true);
  assertEquals(result.has("banana"), false);
});

Deno.test("Sets.difference: does not modify original sets", () => {
  const set1 = new Set([1, 2, 3, 4]);
  const set2 = new Set([3, 4, 5, 6]);
  const result = Sets.difference(set1, set2);

  assertEquals(set1.size, 4);
  assertEquals(set2.size, 4);
  assertEquals(result.size, 2);
});
