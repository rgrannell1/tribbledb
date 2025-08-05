
/*
 * Indexed set class
 *
 * Allows you to check content membership in O(1), and lookup by key or index in O(1).
 *
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

  add(key: string) {
    if (this.#map.has(key)) {
      return this.#map.get(key)!;
    }

    this.#map.set(key, this.#idx);
    this.#reverseMap.set(this.#idx, key);
    this.#idx++;

    return this.#idx - 1;
  }

  get(key: string): number | undefined {
    return this.#map.get(key);
  }

  getIdx(idx: number): string | undefined {
    return this.#reverseMap.get(idx);
  }

  has(key: string): boolean {
    return this.#map.has(key);
  }
}
