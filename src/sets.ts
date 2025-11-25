import type { TribbleDBPerformanceMetrics } from "./metrics.ts";

/*
 * Indexed set class
 *
 * Allows you to check content membership in O(1), and lookup by key or index in O(1).
 *
 * Used to address content to unique IDs, to waste less memory during indexing.
 */
export class IndexedSet {
  #idx: number;
  #map: Map<string, number>;
  #reverseMap: Map<number, string>;

  constructor() {
    this.#idx = 0;
    this.#map = new Map();
    this.#reverseMap = new Map();
  }

  /*
   * Return the underlying map of values to indices
   */
  map(): Map<string, number> {
    return this.#map;
  }

  /*
   * Return the underlying map of indices to values
   */
  reverseMap(): Map<number, string> {
    return this.#reverseMap;
  }

  /*
   * Add a value to the set, and return its index
   */
  add(value: string): number {
    if (this.#map.has(value)) {
      return this.#map.get(value)!;
    }

    this.#map.set(value, this.#idx);
    this.#reverseMap.set(this.#idx, value);
    this.#idx++;

    return this.#idx - 1;
  }

  /**
   * Set the index for a value in the set
   */
  setIndex(value: string, index: number) {
    this.#map.set(value, index);
    this.#reverseMap.set(index, value);
  }

  /**
   * Get the index for a value in the set
   */
  getIndex(value: string): number | undefined {
    return this.#map.get(value);
  }

  /**
   * Set the values for an index in the set
   */
  getValue(idx: number): string | undefined {
    return this.#reverseMap.get(idx);
  }

  /**
   * Does this structure have a value?
   */
  has(value: string): boolean {
    return this.#map.has(value);
  }

  clone(): IndexedSet {
    const newSet = new IndexedSet();
    for (const [key, value] of this.#map.entries()) {
      newSet.setIndex(key, value);
    }
    return newSet;
  }
}

export class Sets {
  /*
   * Compute the intersection of multiple numeric sets.
   * The number of sets will be low (we're not adding ninety
   * query parameters to these URNs) so first sort the
   * sets in ascending size.
   */
  static intersection<T>(
    metrics: TribbleDBPerformanceMetrics,
    sets: Set<T>[],
  ): Set<T> {
    // empty sets, nothing to check
    if (sets.length === 0) {
      return new Set<T>();
    }

    sets.sort((setA, setB) => {
      return setA.size - setB.size;
    });

    const acc = new Set<T>(sets[0]);

    for (let idx = 1; idx < sets.length; idx++) {
      const currentSet = sets[idx];
      for (const value of acc) {
        metrics.setCheck();
        if (!currentSet.has(value)) {
          acc.delete(value);
        }
      }

      if (acc.size === 0) {
        break;
      }
    }

    return acc;
  }

  /*
   * Union two sets, and store the results in the left-hand-side set.
   */
  static append<T>(set0: Set<T>, set1: Set<T>): Set<T> {
    for (const item of set1) {
      set0.add(item);
    }

    return set0;
  }
}
