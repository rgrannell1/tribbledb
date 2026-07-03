/*
 * String interner: maps strings to dense numeric ids and back.
 * Identity and index structures in the v2 engine only handle these ids;
 * strings appear at ingest and at materialisation.
 */

export class Interner {
  #ids: Map<string, number>;
  #values: string[];
  #maxIds: number;

  constructor(maxIds: number) {
    this.#ids = new Map();
    this.#values = [];
    this.#maxIds = maxIds;
  }

  /*
   * Intern a string, returning its id. Idempotent.
   */
  intern(value: string): number {
    const existing = this.#ids.get(value);
    if (existing !== undefined) {
      return existing;
    }

    const id = this.#values.length;
    if (id >= this.#maxIds) {
      throw new Error(`Interner exceeded ${this.#maxIds} distinct strings.`);
    }

    this.#ids.set(value, id);
    this.#values.push(value);
    return id;
  }

  /*
   * Look up the id of a string without interning it.
   */
  idOf(value: string): number | undefined {
    return this.#ids.get(value);
  }

  /*
   * Resolve an id back to its string.
   */
  valueOf(id: number): string {
    return this.#values[id];
  }

  get size(): number {
    return this.#values.length;
  }
}
