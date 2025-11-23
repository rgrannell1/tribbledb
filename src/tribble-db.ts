import type {
  NodeSearch,
  RelationSearch,
  TargetValidator,
  Triple,
  TripleObject,
} from "./types.ts";
import { Index } from "./indices/index.ts";
import { Triples } from "./triples.ts";
import { TribbleDBPerformanceMetrics } from "./metrics.ts";
import type { IndexPerformanceMetrics } from "./metrics.ts";
import { asUrn } from "./urn.ts";
import { findMatchingRows, validateInput } from "./db/search.ts";
import type { Search } from "./input-types.ts";
import { parseSearch } from "./db/inputs.ts";

export type TribbleDBMetrics = {
  index: IndexPerformanceMetrics;
  db: TribbleDBPerformanceMetrics;
};

export type SearchParamsObject = {
  source?: NodeSearch | string;
  relation?: string | string[] | RelationSearch;
  target?: NodeSearch | string | string[];
};

export type SearchParamsArray = [
  NodeSearch | string | undefined,
  string | string[] | RelationSearch | undefined,
  NodeSearch | string | undefined,
];

export type SearchParams = SearchParamsObject | SearchParamsArray;

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
    const oldLength = this.index.length;
    this.validateTriples(triples);

    this.index.add(triples);
    this.triplesCount = this.index.length;

    for (let idx = oldLength; idx < this.triplesCount; idx++) {
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
   * Flat map over the triples in the database.
   *
   * @param fn - A mapping function.
   * @returns A new TribbleDB instance containing the flat-mapped triples.
   */
  flatMap(fn: (triple: Triple) => Triple[]): TribbleDB {
    const flatMappedTriples = this.index.triples().flatMap(fn) as Triple[];
    return new TribbleDB(flatMappedTriples);
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

    return obj;
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
   * Parse a source / target node input.
   */
  parseNodeString(node: string) {
    return { type: "unknown", id: node };
  }

  /*
   * Convert a node to a node DSL object.
   */
  nodeAsDSL(node: unknown): NodeSearch | undefined {
    if (typeof node === "undefined") {
      return undefined;
    }

    if (typeof node === "string") {
      return this.parseNodeString(node);
    }

    if (Array.isArray(node)) {
      return { type: "unknown", id: node };
    }

    return node as NodeSearch;
  }

  /*
   * Convert a relation input to a relation DSL object
   */
  relationAsDSL(relation: unknown): RelationSearch | undefined {
    if (typeof relation === "undefined") {
      return undefined;
    }

    if (typeof relation === "string") {
      return { relation: [relation] };
    }

    if (Array.isArray(relation)) {
      return { relation };
    }

    return relation as RelationSearch;
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
      matchingTriples.push(this.index.getTriple(rowIdx)!);
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
}
