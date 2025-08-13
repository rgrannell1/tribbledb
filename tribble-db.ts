import type { Dsl, DslRelation, Triple, TripleObject } from "./types.ts";
import { Index } from "./triple-index.ts";
import { Sets } from "./sets.ts";
import { Triples } from "./triples.ts";
import { TribbleDBPerformanceMetrics } from "./metrics.ts";

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

  constructor(triples: Triple[]) {
    this.index = new Index(triples);
    this.triplesCount = this.index.length;
    this.cursorIndices = new Set<number>();
    this.metrics = new TribbleDBPerformanceMetrics();

    for (let idx = 0; idx < this.triplesCount; idx++) {
      this.cursorIndices.add(idx);
    }
  }

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

  /**
   * Add new triples to the database.
   *
   * @param triples - An array of triples to add.
   */
  add(triples: Triple[]): void {
    const oldLength = this.index.length;

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
    return this.objects(listOnly)[0];
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
    for (const [id, obj] of Object.entries(this.object(listOnly))) {
      obj.id = id;
      output.push(obj);
    }

    return output;
  }

  /*
   * yes, this is a bad name given firstObject.
   */
  object(listOnly: boolean = false): Record<string, TripleObject> {
    const objs: Record<string, TripleObject> = {};

    for (const [source, relation, target] of this.index.triples()) {
      if (!objs[source]) {
        objs[source] = { id: source };
      }
      if (!objs[source][relation]) {
        objs[source][relation] = listOnly ? [target] : target;
      } else if (Array.isArray(objs[source][relation])) {
        (objs[source][relation] as string[]).push(target);
      } else {
        objs[source][relation] = [objs[source][relation] as string, target];
      }
    }

    return objs;
  }

  findMatchingRows(
    params: { source?: Dsl; relation?: string | DslRelation; target?: Dsl },
  ): Set<number> {
    // by default, all triples are in the intersection set. Then, we
    // only keep the triple rows that meet the other criteria too, by
    // insecting all row sets.
    const matchingRowSets: Set<number>[] = [
      this.cursorIndices,
    ];

    const { source, relation, target } = params;
    if (typeof source === 'undefined' && typeof target === 'undefined' && typeof relation === 'undefined') {
      // yes, we could just return everything instead
      throw new Error("At least one search parameter must be defined");
    }

    const allowedKeys = ["source", "relation", "target"];
    for (const key of Object.keys(params)) {
      if (!Object.prototype.hasOwnProperty.call(params, key)) continue;
      if (!allowedKeys.includes(key)) {
        throw new Error(`Unexpected search parameter: ${key}`);
      }
    }

    if (source) {
      if (source.type) {
        const sourceTypeSet = this.index.getSourceTypeSet(source.type);
        if (sourceTypeSet) {
          matchingRowSets.push(sourceTypeSet);
        } else {
          return new Set<number>();
        }
      }

      if (source.id) {
        const sourceIdSet = this.index.getSourceIdSet(source.id);
        if (sourceIdSet) {
          matchingRowSets.push(sourceIdSet);
        } else {
          return new Set<number>();
        }
      }

      if (source.qs) {
        for (const [key, val] of Object.entries(source.qs)) {
          const sourceQsSet = this.index.getSourceQsSet(key, val);
          if (sourceQsSet) {
            matchingRowSets.push(sourceQsSet);
          } else {
            return new Set<number>();
          }
        }
      }
    }

    if (target) {
      if (target.type) {
        const targetTypeSet = this.index.getTargetTypeSet(target.type);
        if (targetTypeSet) {
          matchingRowSets.push(targetTypeSet);
        } else {
          return new Set<number>();
        }
      }

      if (target.id) {
        const targetIdSet = this.index.getTargetIdSet(target.id);
        if (targetIdSet) {
          matchingRowSets.push(targetIdSet);
        } else {
          return new Set<number>();
        }
      }

      if (target.qs) {
        for (const [key, val] of Object.entries(target.qs)) {
          const targetQsSet = this.index.getTargetQsSet(key, val);
          if (targetQsSet) {
            matchingRowSets.push(targetQsSet);
          } else {
            return new Set<number>();
          }
        }
      }
    }

    if (relation) {
      const relationDsl: DslRelation = typeof relation === "string"
        ? { relation: [relation] }
        : relation;

      // in this case, ANY relation in the `relation` list is good enough, so we
      // union rather than intersection (which would always be the null set)
      const unionedRelations = new Set<number>();
      for (const rel of relationDsl.relation) {
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

    // Collect matching triples, applying predicate filters as we go
    for (const index of intersection) {
      const triple = this.index.getTriple(index)!;

      if (
        !source?.predicate && !target?.predicate &&
        !(typeof relation === "object" && relation.predicate)
      ) {
        matchingTriples.add(index);
        continue;
      }

      let isValid = true;

      if (source?.predicate) {
        isValid = isValid && source.predicate(Triples.source(triple));
      }

      if (target?.predicate) {
        isValid = isValid && target.predicate(Triples.target(triple));
      }

      if (typeof relation === "object" && relation.predicate) {
        isValid = isValid && relation.predicate(Triples.relation(triple));
      }

      if (isValid) {
        matchingTriples.add(index);
      }
    }

    return matchingTriples;
  }

  /*
   * Search all triples in the database.
   *
   * @param params - The search parameters.
   * @returns A new TribbleDB instance containing the matching triples.
   */
  search(
    params: { source?: Dsl; relation?: string | DslRelation; target?: Dsl },
  ): TribbleDB {
    const matchingTriples: Triple[] = [];

    for (const rowIdx of this.findMatchingRows(params)) {
      const triple = this.index.getTriple(rowIdx);
      if (triple) {
        matchingTriples.push(triple);
      }
    }

    return new TribbleDB(matchingTriples);
  }

  getMetrics() {
    return {
      index: this.index.metrics,
      db: this.metrics,
    };
  }
}
