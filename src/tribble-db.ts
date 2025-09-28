import type {
  NodeSearch,
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

type SubqueryResult = {
  names: string[];
  rows: number[][];
};

export type TribbleDBMetrics = {
  index: IndexPerformanceMetrics;
  db: TribbleDBPerformanceMetrics;
};

export type SearchParamsObject = {
  source?: NodeSearch | string;
  relation?: string | string[] | RelationSearch;
  target?: NodeSearch | string;
};

export type SearchParamsArray = [
  NodeSearch | string | undefined,
  string | string[] | RelationSearch | undefined,
  NodeSearch | string | undefined,
];

export type SearchParams = SearchParamsObject | SearchParamsArray;

/*
 * Combine subquery results into a single result set.

[
  {
    names: [ "person", "works_at", "company" ],
    rows: [ [ 5, 8, 11 ], [ 14, 8, 17 ] ]
  },
  {
    names: [ "company", "location", "city" ],
    rows: [ [ 11, 19, 22 ], [ 17, 19, 25 ] ]
  }
]

 */
function joinSubqueryResults(
  metrics: TribbleDBPerformanceMetrics,
  acc: SubqueryResult,
  tripleResult: SubqueryResult,
): SubqueryResult {
  const joinedNames = acc.names.concat(tripleResult.names);

  if (acc.rows.length === 0 || tripleResult.rows.length === 0) {
    return {
      names: joinedNames,
      rows: [],
    };
  }

  // TODO this is too simplistic, due to query parameters
  const endings: Map<number, number[]> = new Map();
  const starts: Map<number, number[]> = new Map();

  // index the starts and endings for more efficient joins
  for (let idx = 0; idx < acc.rows.length; idx++) {
    const refId = acc.rows[idx][2];

    if (!endings.has(refId)) {
      endings.set(refId, []);
    }

    endings.get(refId)!.push(idx);
  }

  for (let idx = 0; idx < tripleResult.rows.length; idx++) {
    const refId = tripleResult.rows[idx][0];

    if (!starts.has(refId)) {
      starts.set(refId, []);
    }

    starts.get(refId)!.push(idx);
  }

  // find the endings that are also starts (words are hard)
  const commonLinks = Sets.intersection(metrics, [
    new Set(endings.keys()),
    new Set(starts.keys()),
  ]);

  const joinedRows: number[][] = [];

  for (const link of commonLinks) {
    const startRowIndices = starts.get(link)!;
    const endRowsIndices = endings.get(link)!;

    // cross-product
    for (const startRowIndex of startRowIndices) {
      for (const endRowIndex of endRowsIndices) {
        const joinedRow = acc.rows[startRowIndex].concat(
          tripleResult.rows[endRowIndex],
        );
        joinedRows.push(joinedRow);
      }
    }
  }

  return {
    names: joinedNames,
    rows: joinedRows,
  };
}

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

  nodeAsDSL(node: unknown): NodeSearch | undefined {
    if (typeof node === "undefined") {
      return undefined;
    }

    if (typeof node === "string") {
      return { type: "unknown", id: node };
    }

    return node as NodeSearch;
  }

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
    // insecting all row sets.
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

    const expandedSource = this.nodeAsDSL(source);
    const expandedRelation = this.relationAsDSL(relation);
    const expandedTarget = this.nodeAsDSL(target);

    if (expandedSource) {
      if (expandedSource.type) {
        const sourceTypeSet = this.index.getSourceTypeSet(expandedSource.type);
        if (sourceTypeSet) {
          matchingRowSets.push(sourceTypeSet);
        } else {
          return new Set<number>();
        }
      }

      if (expandedSource.id) {
        const sourceIdSet = this.index.getSourceIdSet(expandedSource.id);
        if (sourceIdSet) {
          matchingRowSets.push(sourceIdSet);
        } else {
          return new Set<number>();
        }
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
        const targetIdSet = this.index.getTargetIdSet(expandedTarget.id);
        if (targetIdSet) {
          matchingRowSets.push(targetIdSet);
        } else {
          return new Set<number>();
        }
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

    if (expandedRelation) {
      if (expandedRelation.relation) {
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
    }

    const intersection = Sets.intersection(this.metrics, matchingRowSets);
    const matchingTriples: Set<number> = new Set();

    // Collect matching triples, applying predicate filters as we go
    for (const index of intersection) {
      const triple = this.index.getTriple(index)!;

      if (
        !expandedSource?.predicate && !expandedTarget?.predicate &&
        !expandedRelation?.predicate
      ) {
        matchingTriples.add(index);
        continue;
      }

      let isValid = true;

      if (expandedSource?.predicate) {
        isValid = isValid && expandedSource.predicate(Triples.source(triple));
      }

      if (expandedTarget?.predicate) {
        isValid = isValid && expandedTarget.predicate(Triples.target(triple));
      }

      if (typeof expandedRelation === "object" && expandedRelation.predicate) {
        isValid = isValid &&
          expandedRelation.predicate(Triples.relation(triple));
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

  search2(query: Record<string, NodeSearch | RelationSearch>) {
    const bindings = Object.entries(query);
    const subqueryResults: {
      names: string[];
      rows: number[][];
    }[] = [];

    for (let idx = 0; idx < bindings.length - 2; idx += 2) {
      const tripleSlice = bindings.slice(idx, idx + 3);
      const pattern = {
        source: tripleSlice[0][1],
        relation: tripleSlice[1][1],
        target: tripleSlice[2][1],
      };

      const bindingNames = tripleSlice.map((pair) => pair[0]);

      const tripleRows = this.#findMatchingRows(pattern as any);
      const rowData = Array.from(tripleRows).flatMap((row) => {
        const contents = this.index.getTripleIndices(row);

        return typeof contents === "undefined" ? [] : [contents];
      });

      subqueryResults.push({
        names: bindingNames,
        rows: rowData,
      });
    }

    const queryResult = subqueryResults.reduce(
      joinSubqueryResults.bind(this, this.metrics),
    );

    const outputNames = queryResult.names;
    const objects = [];

    for (const row of queryResult.rows) {
      const data: Record<string, string> = {};
      for (let idx = 0; idx < outputNames.length; idx++) {
        const label = outputNames[idx];
        data[label] = this.index.stringIndex.getValue(row[idx])!;
      }

      objects.push(data);
    }

    return objects;
  }

  getMetrics(): TribbleDBMetrics {
    return {
      index: this.index.metrics,
      db: this.metrics,
    };
  }
}
