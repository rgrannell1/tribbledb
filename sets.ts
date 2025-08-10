import { TribbleDBPerformanceMetrics } from "./metrics.ts";

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

  map() {
    return this.#map;
  }

  reverseMap() {
    return this.#reverseMap;
  }

  add(value: string) {
    if (this.#map.has(value)) {
      return this.#map.get(value)!;
    }

    this.#map.set(value, this.#idx);
    this.#reverseMap.set(this.#idx, value);
    this.#idx++;

    return this.#idx - 1;
  }

  getIndex(value: string): number | undefined {
    return this.#map.get(value);
  }

  getValue(idx: number): string | undefined {
    return this.#reverseMap.get(idx);
  }

  has(value: string): boolean {
    return this.#map.has(value);
  }
}

export class Sets {
  /*
   * Compute the intersection of multiple numeric sets.
   * The number of sets will be low (we're not adding ninety
   * query parameters to these URNs) so first sort the
   * sets in ascending size. This could be done much, much more
   * efficiently with a dataset that allows cheap intersections though...TODO
   */
  static intersection<T>(metrics: TribbleDBPerformanceMetrics, sets: Set<T>[]): Set<T> {
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
}
