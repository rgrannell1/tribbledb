import type {
  Parser,
  ReadOpts,
  TargetValidator,
  TribbleDBMetrics,
  Triple,
  TripleObject,
} from "./types.ts";
import { Index } from "./indices/index.ts";
import { Triples } from "./triples.ts";
import { TribbleDBPerformanceMetrics } from "./metrics.ts";
import { asUrn } from "./urn.ts";
import { findMatchingRows, validateInput } from "./db/search.ts";
import type { Search } from "./types.ts";
import { parseSearch } from "./db/inputs.ts";
import { hashTriple } from "./hash.ts";

/*
 * A searchable triple database
 *
 * Provides methods for adding, searching, and manipulating triples.
 */
export class TribbleDB {
  index: Index;
  triplesCount: number;
  cursorIndices: Set<number>;
  metrics: TribbleDBPerformanceMetrics;
  validations: Record<string, TargetValidator>;

  constructor(
    triples: Triple[],
    validations: Record<string, TargetValidator> = {},
  ) {
    this.index = new Index(triples);
    this.triplesCount = this.index.length;
    this.cursorIndices = new Set<number>();
    this.metrics = new TribbleDBPerformanceMetrics();
    this.validations = validations;

    for (let idx = 0; idx < this.triplesCount; idx++) {
      this.cursorIndices.add(idx);
    }
  }

  /*
   * Clone the database.
   *
   * @returns A new TribbleDB instance, constructed with the same data as the original.
   */
  clone(): TribbleDB {
    const clonedDB = new TribbleDB([]);

    clonedDB.index = this.index;
    clonedDB.triplesCount = this.triplesCount;
    clonedDB.cursorIndices = this.cursorIndices;
    clonedDB.metrics = this.metrics;

    return clonedDB;
  }

  /*
   * Convert an array of triples to a TribbleDB.
   */
  static of(triples: Triple[]): TribbleDB {
    return new TribbleDB(triples);
  }

  /*
   * Convert an array of TripleObject instances to a TribbleDB.
   *
   * @param objects - An array of TripleObject instances.
   *
   * @returns A TribbleDB instance.
   */
  static from(objects: TripleObject[]): TribbleDB {
    const triples: Triple[] = [];

    for (const obj of objects) {
      const { id, ...relations } = obj;
      if (typeof id !== "string") {
        throw new Error("Each TripleObject must have a string id.");
      }

      for (const [relation, target] of Object.entries(relations)) {
        if (Array.isArray(target)) {
          for (const sub of target) {
            triples.push([id, relation, sub]);
          }
        } else {
          triples.push([id, relation, target]);
        }
      }
    }

    return new TribbleDB(triples);
  }

  /*
   * Validate triples against the provided validation functions.
   *
   * @param triples - An array of triples to validate.
   */
  validateTriples(triples: Triple[]): void {
    const messages: string[] = [];

    for (const [source, relation, target] of triples) {
      const validator = this.validations[relation];

      if (!validator) {
        continue;
      }

      const { type } = asUrn(source);

      const res = validator(type, relation, target);
      if (typeof res === "string") {
        messages.push(res);
      }
    }

    if (messages.length > 0) {
      throw new Error(`Triple validation failed:\n- ${messages.join("\n- ")}`);
    }
  }

  /**
   * Add new triples to the database.
   *
   * @param triples - An array of triples to add.
   */
  add(triples: Triple[]): void {
    const oldLength = this.index.arrayLength;
    this.validateTriples(triples);

    this.index.add(triples);
    this.triplesCount = this.index.length;

    for (let idx = oldLength; idx < this.index.arrayLength; idx++) {
      this.cursorIndices.add(idx);
    }
  }

  /**
   * Map over the triples in the database.
   *
   * @param fn - A mapping function.
   * @returns A new TribbleDB instance containing the mapped triples.
   */
  map(fn: (triple: Triple) => Triple): TribbleDB {
    return new TribbleDB(this.index.triples().map(fn));
  }

  /**
   * Flatmap over the triples in the database. This can be used to add new triples
   * to a copy of the database.
   *
   * @param fn - A mapping function.
   * @returns A new TribbleDB instance containing the flat-mapped triples.
   */
  flatMap(fn: (triple: Triple) => Triple[]): TribbleDB {
    const flatMappedTriples = this.index.triples().flatMap(fn) as Triple[];

    // The flatmapped database may benefit from reusing the index structure
    // of the original database
    const newDb = new TribbleDB([]);
    newDb.index = this.index.clone();

    newDb.add(flatMappedTriples);

    return newDb;
  }

  /*
   * Deduplicate an array of triples using hash-based comparison.
   *
   * @param triples - An array of triples that may contain duplicates.
   * @returns A new array with duplicate triples removed.
   */
  deduplicateTriples(triples: Triple[]): Triple[] {
    const seen = new Set<string>();
    const result: Triple[] = [];

    for (const triple of triples) {
      const hash = hashTriple(triple);
      if (!seen.has(hash)) {
        seen.add(hash);
        result.push(triple);
      }
    }

    return result;
  }

  /*
   * Perform an in-place flatmap over this database. This works by:
   * - Searching the database to get a subset of triples
   * - Flatmapping those triples
   * - Deleting any triples from the original subset that are no longer present after the flatmap
   * - Adding all new triples to the database
   *
   * @param search - The search parameters to subset the database.
   * @param fn - A mapping function to apply to each triple in the search result.
   *
   * @returns This TribbleDB instance.
   */
  searchFlatmap(search: Search, fn: (triple: Triple) => Triple[]): TribbleDB {
    const parsed = parseSearch(search);
    validateInput(parsed);

    const originalHashMap = new Map<string, Triple>();
    const transformedHashMap = new Map<string, Triple>();
    const matchingTriples: Triple[] = [];

    for (
      const rowIdx of findMatchingRows(
        parsed,
        this.index,
        this.cursorIndices,
        this.metrics,
      )
    ) {
      const triple = this.index.getTriple(rowIdx);
      if (triple !== undefined) {
        originalHashMap.set(hashTriple(triple), triple);
        matchingTriples.push(triple);
      }
    }

    const transformedTriples = matchingTriples.flatMap(fn);

    for (const triple of transformedTriples) {
      transformedHashMap.set(hashTriple(triple), triple);
    }

    // allow delete-by-hash
    const triplesToDelete: Triple[] = [];
    const triplesToAdd: Triple[] = [];

    // remove triples no longer present
    for (const [hash, triple] of originalHashMap) {
      if (!transformedHashMap.has(hash)) {
        triplesToDelete.push(triple);
      }
    }

    // add triples not previously present
    for (const [hash, triple] of transformedHashMap) {
      if (!originalHashMap.has(hash)) {
        triplesToAdd.push(triple);
      }
    }

    this.delete(triplesToDelete);
    this.add(triplesToAdd);

    return this;
  }

  /**
   * Get the first triple in the database.
   *
   * @returns The first triple, or undefined if there are no triples.
   */
  firstTriple(): Triple | undefined {
    return this.index.length > 0 ? this.index.getTriple(0) : undefined;
  }

  /*
   * Get the first source in the database.
   */
  firstSource(): string | undefined {
    const first = this.firstTriple();
    return first ? Triples.source(first) : undefined;
  }

  /**
   * Get the first relation in the database.
   */
  firstRelation(): string | undefined {
    const first = this.firstTriple();
    return first ? Triples.relation(first) : undefined;
  }

  /**
   * Get the first target in the database.
   */
  firstTarget(): string | undefined {
    const first = this.firstTriple();
    return first ? Triples.target(first) : undefined;
  }

  /*
   * Get the first object in the database.
   */
  firstObject(listOnly: boolean = false): TripleObject | undefined {
    let firstId = undefined;
    const obj: TripleObject = {};

    for (const [source, relation, target] of this.index.triples()) {
      if (firstId === undefined) {
        firstId = source;
        obj.id = source;
      }

      if (firstId !== source) {
        // This could be slow, though this method should only be pointed at things with a single object in them
        // in future, lets raise an error if this is pointed at a datasource with more than one object
        continue;
      }

      if (!obj[relation]) {
        obj[relation] = listOnly ? [target] : target;
      } else if (Array.isArray(obj[relation])) {
        if (!(obj[relation] as string[]).includes(target)) {
          (obj[relation] as string[]).push(target);
        }
      } else {
        obj[relation] = obj[relation] as string === target
          ? obj[relation]
          : [obj[relation] as string, target];
      }
    }

    return Object.keys(obj).length > 0 ? obj : undefined;
  }

  /*
   * Get all triples in the database.
   *
   * @returns An array of all triples.
   */
  triples(): Triple[] {
    return this.index.triples();
  }

  /**
   * Get all unique sources in the database.
   *
   * @returns A set of all unique sources.
   */
  sources(): Set<string> {
    return new Set(
      this.index.triples().map(Triples.source),
    );
  }

  /**
   * Get all unique relations in the database.
   *
   * @returns A set of all unique relations.
   */
  relations(): Set<string> {
    return new Set(
      this.index.triples().map(Triples.relation),
    );
  }

  /**
   * Get all unique targets in the database.
   *
   * @returns A set of all unique targets.
   */
  targets(): Set<string> {
    return new Set(
      this.index.triples().map(Triples.target),
    );
  }

  /*
   * Get all unique objects represented by the triples.
   *
   * @returns An array of unique TripleObject instances.
   */
  objects(listOnly: boolean = false): TripleObject[] {
    const output: TripleObject[] = [];
    for (const [id, obj] of Object.entries(this.#object(listOnly))) {
      obj.id = id;
      output.push(obj);
    }

    return output;
  }

  /*
   * Internal function; convert all triples to an object representation.
   *
   * @param listOnly - Whether to always represent relation values as lists.
   */
  #object(listOnly: boolean = false): Record<string, TripleObject> {
    const objs: Record<string, TripleObject> = {};

    for (const [source, relation, target] of this.index.triples()) {
      if (!objs[source]) {
        objs[source] = { id: source };
      }
      const relationRef = objs[source][relation];
      if (!relationRef) {
        objs[source][relation] = listOnly ? [target] : target;
      } else if (Array.isArray(relationRef)) {
        if (!relationRef.includes(target)) {
          (relationRef as string[]).push(target);
        }
      } else {
        objs[source][relation] = relationRef === target
          ? relationRef
          : [relationRef as string, target];
      }
    }

    return objs;
  }

  /*
   * Search across all triples in the database. There are two forms of query possible:
   *
   * - Object: { source?, relation?, target }
   * - Array: [ source?, relation?, target? ]
   *
   * @param params - The search parameters.
   * @returns A new TribbleDB instance containing the matching triples.
   */
  search(
    params: Search,
  ): TribbleDB {
    const parsed = parseSearch(params);
    validateInput(parsed);

    const matchingTriples: Triple[] = [];

    for (
      const rowIdx of findMatchingRows(
        parsed,
        this.index,
        this.cursorIndices,
        this.metrics,
      )
    ) {
      const triple = this.index.getTriple(rowIdx);
      if (triple !== undefined) {
        matchingTriples.push(triple);
      }
    }

    return new TribbleDB(matchingTriples);
  }

  /*
   * Get performance metrics for the database.
   */
  getMetrics(): TribbleDBMetrics {
    return {
      index: this.index.metrics,
      db: this.metrics,
    };
  }

  /*
   * Read a single object from the data by urn. If not a urn, the
   * value is used as an id and the type is the default type `unknown`. By default,
   * query-strings are disregarded.
   */
  readThing(
    urn: string,
    opts: ReadOpts = { qs: false },
  ): TripleObject | undefined {
    if (opts.qs) {
      const { type, id } = asUrn(urn);
      return this.search({ source: { type, id } }).firstObject();
    } else {
      return this.search({ source: urn }).firstObject();
    }
  }

  /*
   * Read a set of URNs, and return any matching results. Ordered but not guaranteed to
   * return a match for all provided URNs.
   */
  readThings(
    urns: Set<string> | string[],
    opts: ReadOpts = { qs: false },
  ): TripleObject[] {
    const results: TripleObject[] = [];

    for (const urn of urns) {
      const thing = this.readThing(urn, opts);
      if (thing !== undefined) {
        results.push(thing);
      }
    }

    return results;
  }

  /*
   * Read and parse a triple object. On missing data or parse failure return undefined (or throw an exception)
   */
  parseThing<T>(
    parser: Parser<T>,
    urn: string,
    opts: ReadOpts = { qs: false },
  ): T | undefined {
    const thing = this.readThing(urn, opts);
    if (thing) {
      return parser(thing);
    } else {
      return undefined;
    }
  }

  /*
   * Read and parse a collection of triple objects. Skip over missing data or parse failures.
   */
  parseThings<T>(
    parser: Parser<T>,
    urns: Set<string> | string[],
    opts: ReadOpts = { qs: false },
  ): T[] {
    const results: T[] = [];

    for (const urn of urns) {
      const res = this.parseThing(parser, urn, opts);
      if (res) {
        results.push(res);
      }
    }

    return results;
  }

  /*
   * Merge another TribbleDB into this one.
   *
   * @param other - The other TribbleDB to merge.
   * @returns This TribbleDB instance.
   */
  merge(other: TribbleDB): TribbleDB {
    // deduplicating the index will prevent double-triple writes.
    this.add(other.triples());

    return this;
  }

  /*
   * Delete triples from the database.
   *
   * @param triples - An array of triples to delete.
   * @returns This TribbleDB instance.
   */
  delete(triples: Triple[]): TribbleDB {
    const indicesToDelete = new Set<number>();

    for (const triple of triples) {
      const tripleIndex = this.index.getTripleIndex(triple);
      if (tripleIndex !== undefined) {
        indicesToDelete.add(tripleIndex);
      }
    }

    this.index.delete(triples);
    this.triplesCount = this.index.length;

    // Update cursorIndices to reflect deleted triples
    for (const idx of indicesToDelete) {
      this.cursorIndices.delete(idx);
    }

    return this;
  }
}
