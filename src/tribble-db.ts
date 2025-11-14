import type {
  NodeSearch,
  Predicate,
  RelationSearch,
  TargetValidator,
  Triple,
  TripleObject,
} from "./types.ts";
import { Index } from "./indices/index.ts";
import { Sets } from "./sets.ts";
import { Triples } from "./triples.ts";
import { TribbleDBPerformanceMetrics } from "./metrics.ts";
import type { IndexPerformanceMetrics } from "./metrics.ts";
import { asUrn } from "./urn.ts";

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
        (obj[relation] as string[]).push(target);
      } else {
        obj[relation] = [obj[relation] as string, target];
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
   * Convert a node to a node DSL object.
   */
  nodeAsDSL(node: unknown): NodeSearch | undefined {
    if (typeof node === "undefined") {
      return undefined;
    }

    if (typeof node === "string") {
      return { type: "unknown", id: node };
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

  searchParamsToObject(params: SearchParams): SearchParamsObject {
    if (!Array.isArray(params)) {
      return params;
    }

    const [source, relation, target] = params;

    return {
      source: this.nodeAsDSL(source),
      relation: this.relationAsDSL(relation),
      target: this.nodeAsDSL(target),
    };
  }

  #findMatchingRows(
    params: SearchParams,
  ): Set<number> {
    // by default, all triples are in the intersection set. Then, we
    // only keep the triple rows that meet the other criteria too, by
    // intersecting all row sets.
    const matchingRowSets: Set<number>[] = [
      this.cursorIndices,
    ];

    const { source, relation, target } = this.searchParamsToObject(params);
    if (
      typeof source === "undefined" && typeof target === "undefined" &&
      typeof relation === "undefined"
    ) {
      // yes, we could just return everything instead
      throw new Error("At least one search parameter must be defined");
    }

    const allowedKeys = ["source", "relation", "target"];
    if (!Array.isArray(params)) {
      for (const key of Object.keys(params)) {
        if (!Object.prototype.hasOwnProperty.call(params, key)) continue;
        if (!allowedKeys.includes(key)) {
          throw new Error(`Unexpected search parameter: ${key}`);
        }
      }
    }

    // Expand user-inputs into DLS objects
    const expandedSource = this.nodeAsDSL(source);
    const expandedRelation = this.relationAsDSL(relation);
    const expandedTarget = this.nodeAsDSL(target);

    if (expandedSource) {
      if (expandedSource.type) {
        const sourceTypeSet = this.index.getSourceTypeSet(expandedSource.type);
        if (sourceTypeSet) {
          matchingRowSets.push(sourceTypeSet);
        } else {
          // no type matched, no no rows matching
          return new Set<number>();
        }
      }

      if (expandedSource.id) {
        const ids = Array.isArray(expandedSource.id)
          ? expandedSource.id
          : [expandedSource.id];

        const idSet = new Set<number>();

        for (const id of ids) {
          const sourceIdSet = this.index.getSourceIdSet(id);
          if (sourceIdSet) {
            Sets.append(idSet, sourceIdSet);
          } else {
            return new Set<number>();
          }
        }

        matchingRowSets.push(idSet);
      }

      if (expandedSource.qs) {
        for (const [key, val] of Object.entries(expandedSource.qs)) {
          const sourceQsSet = this.index.getSourceQsSet(key, val);
          if (sourceQsSet) {
            matchingRowSets.push(sourceQsSet);
          } else {
            return new Set<number>();
          }
        }
      }
    }

    if (expandedTarget) {
      if (expandedTarget.type) {
        const targetTypeSet = this.index.getTargetTypeSet(expandedTarget.type);
        if (targetTypeSet) {
          matchingRowSets.push(targetTypeSet);
        } else {
          return new Set<number>();
        }
      }

      if (expandedTarget.id) {
        const ids = Array.isArray(expandedTarget.id)
          ? expandedTarget.id
          : [expandedTarget.id];

        const idSet = new Set<number>();

        for (const id of ids) {
          const targetIdSet = this.index.getTargetIdSet(id);
          if (targetIdSet) {
            Sets.append(idSet, targetIdSet);
          } else {
            return new Set<number>();
          }
        }

        matchingRowSets.push(idSet);
      }

      if (expandedTarget.qs) {
        for (const [key, val] of Object.entries(expandedTarget.qs)) {
          const targetQsSet = this.index.getTargetQsSet(key, val);
          if (targetQsSet) {
            matchingRowSets.push(targetQsSet);
          } else {
            return new Set<number>();
          }
        }
      }
    }

    if (expandedRelation && expandedRelation.relation) {
      // in this case, ANY relation in the `relation` list is good enough, so we
      // union rather than intersection (which would always be the null set)
      const unionedRelations = new Set<number>();
      for (const rel of expandedRelation.relation) {
        const relationSet = this.index.getRelationSet(rel);
        if (relationSet) {
          for (const elem of relationSet) {
            unionedRelations.add(elem);
          }
        }
      }

      if (unionedRelations.size > 0) {
        matchingRowSets.push(unionedRelations);
      } else {
        return new Set<number>();
      }
    }

    const intersection = Sets.intersection(this.metrics, matchingRowSets);
    const matchingTriples: Set<number> = new Set();

    const hasSourcePredicate = expandedSource?.predicate !== undefined;
    const hasTargetPredicate = expandedTarget?.predicate !== undefined;
    const hasRelationPredicate = typeof expandedRelation === "object" &&
      expandedRelation.predicate !== undefined;

    // Collect matching triples, applying predicate filters as we go
    for (const index of intersection) {
      const triple = this.index.getTriple(index)!;

      if (!hasSourcePredicate && !hasTargetPredicate && !hasRelationPredicate) {
        matchingTriples.add(index);
        continue;
      }

      let isValid = true;

      if (hasSourcePredicate) {
        isValid = isValid &&
          (expandedSource.predicate as Predicate)(Triples.source(triple));
      }

      if (hasTargetPredicate && isValid) {
        isValid = isValid &&
          (expandedTarget.predicate as Predicate)(Triples.target(triple));
      }

      if (hasRelationPredicate && isValid) {
        isValid = isValid &&
          (expandedRelation.predicate as Predicate)(Triples.relation(triple));
      }

      if (isValid) {
        matchingTriples.add(index);
      }
    }

    return matchingTriples;
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
    params: SearchParams,
  ): TribbleDB {
    const matchingTriples: Triple[] = [];

    for (const rowIdx of this.#findMatchingRows(params)) {
      const triple = this.index.getTriple(rowIdx);
      if (triple) {
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
}
