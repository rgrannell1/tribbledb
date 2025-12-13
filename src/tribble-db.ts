import type {
  NodeObjectQuery,
  Parser,
  ReadOpts,
  Search,
  TargetValidator,
  Triple,
  TripleObject,
} from "./types.ts";
import { Index } from "./indices/index.ts";
import { hashTriple } from "./hash.ts";
import { asUrn } from "./urn.ts";
import { parseSearch } from "./db/inputs.ts";

/*
 * A searchable triple database
 *
 * Provides methods for adding, searching, and manipulating triples.
 */
export class TribbleDB {
  index: Index;
  private validations: Record<string, TargetValidator>;

  constructor(
    triples: Triple[],
    validations: Record<string, TargetValidator> = {},
  ) {
    this.index = new Index(triples);
    this.validations = validations;
  }

  static of(triples: Triple[]): TribbleDB {
    return new TribbleDB(triples);
  }

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

  add(triples: Triple[]): void {
    this.validateTriples(triples);
    this.index.add(triples);
  }

  delete(triples: Triple[]): TribbleDB {
    this.index.delete(triples);
    return this;
  }

  triples(): Triple[] {
    return this.index.triples();
  }

  sources(): Set<string> {
    return this.index.getUniqueSources();
  }

  relations(): Set<string> {
    return this.index.getUniqueRelations();
  }

  targets(): Set<string> {
    return this.index.getUniqueTargets();
  }

  firstTriple(): Triple | undefined {
    const allTriples = this.triples();
    return allTriples.length > 0 ? allTriples[0] : undefined;
  }

  firstSource(): string | undefined {
    return this.index.getTriple(0)?.[0];
  }

  firstRelation(): string | undefined {
    return this.index.getTriple(0)?.[1];
  }

  firstTarget(): string | undefined {
    return this.index.getTriple(0)?.[2];
  }

  firstObject(listOnly: boolean = false): TripleObject | undefined {
    let firstId: string | undefined = undefined;
    const obj: TripleObject = {};

    for (const [source, relationName, target] of this.index.triples()) {
      if (firstId === undefined) {
        firstId = source;
        obj.id = source;
      }

      if (firstId !== source) {
        continue;
      }

      if (!Object.prototype.hasOwnProperty.call(obj, relationName)) {
        obj[relationName] = listOnly ? [target] : target;
      } else if (Array.isArray(obj[relationName])) {
        if (!(obj[relationName] as string[]).includes(target)) {
          (obj[relationName] as string[]).push(target);
        }
      } else {
        obj[relationName] = obj[relationName] as string === target
          ? obj[relationName]
          : [obj[relationName] as string, target];
      }
    }

    return Object.keys(obj).length > 0 ? obj : undefined;
  }

  objects(listOnly: boolean = false): TripleObject[] {
    const objs = new Map<string, TripleObject>();

    for (const [source, relationName, target] of this.index.triples()) {
      let obj = objs.get(source);
      if (!obj) {
        obj = { id: source };
        objs.set(source, obj);
      }

      const relationRef = obj[relationName];
      if (!relationRef) {
        obj[relationName] = listOnly ? [target] : target;
      } else if (Array.isArray(relationRef)) {
        if (!relationRef.includes(target)) {
          relationRef.push(target);
        }
      } else {
        obj[relationName] = relationRef === target
          ? relationRef
          : [relationRef as string, target];
      }
    }

    return Array.from(objs.values());
  }

  map(fnc: (triple: Triple) => Triple): TribbleDB {
    return new TribbleDB(this.triples().map(fnc));
  }

  flatMap(fnc: (triple: Triple) => Triple[]): TribbleDB {
    return new TribbleDB(this.triples().flatMap(fnc));
  }

  deduplicateTriples(triples: Triple[]): Triple[] {
    const seen = new Set<string>();
    const result: Triple[] = [];

    for (const triple of triples) {
      const tripleHash = hashTriple(triple);
      if (!seen.has(tripleHash)) {
        seen.add(tripleHash);
        result.push(triple);
      }
    }

    return result;
  }

  merge(other: TribbleDB): TribbleDB {
    this.add(other.triples());
    return this;
  }

  clone(): TribbleDB {
    return new TribbleDB(this.triples(), this.validations);
  }

  readThing(
    urn: string,
    opts: ReadOpts = { qs: false },
  ): TripleObject | undefined {
    const allTriples = this.triples();
    const matchingTriples: Triple[] = [];

    if (opts.qs) {
      const { type, id } = asUrn(urn);
      for (const triple of allTriples) {
        const sourceParsed = asUrn(triple[0]);
        if (sourceParsed.type === type && sourceParsed.id === id) {
          matchingTriples.push(triple);
        }
      }
    } else {
      for (const triple of allTriples) {
        if (triple[0] === urn) {
          matchingTriples.push(triple);
        }
      }
    }

    if (matchingTriples.length === 0) return undefined;

    const obj: TripleObject = { id: matchingTriples[0][0] };
    for (const [, relation, target] of matchingTriples) {
      if (!Object.prototype.hasOwnProperty.call(obj, relation)) {
        obj[relation] = target;
      } else if (Array.isArray(obj[relation])) {
        if (!(obj[relation] as string[]).includes(target)) {
          (obj[relation] as string[]).push(target);
        }
      } else {
        obj[relation] = [obj[relation] as string, target];
      }
    }

    return obj;
  }

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

  parseThing<T>(
    parser: Parser<T>,
    urn: string,
    opts: ReadOpts = { qs: false },
  ): T | undefined {
    const thing = this.readThing(urn, opts);
    return thing ? parser(thing) : undefined;
  }

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

  private intersectSets(set1: Set<number>, set2: Set<number>): Set<number> {
    const result = new Set<number>();
    for (const item of set1) {
      if (set2.has(item)) {
        result.add(item);
      }
    }
    return result;
  }

  search(params: Search): TribbleDB {
    const parsed = parseSearch(params);

    // Get all triples if no constraints
    if (!parsed.source && !parsed.relation && !parsed.target) {
      return new TribbleDB(this.triples(), this.validations);
    }

    // Use index-based search when possible
    let candidateIndices: Set<number> | null = null;

    // Start with relation constraint if present (usually most selective)
    if (parsed.relation) {
      const relationNames = Array.isArray(parsed.relation.relation)
        ? parsed.relation.relation
        : [parsed.relation.relation];

      if (relationNames.length > 0) {
        candidateIndices = new Set<number>();
        for (const relName of relationNames) {
          const ids = this.index.getRelationSet(relName);
          if (ids) {
            for (const idx of ids) {
              candidateIndices.add(idx);
            }
          }
        }
      }
    }

    // Apply source constraint using indices
    if (parsed.source) {
      const sourceIds = this.getTripleIndicesForNodeQueries(
        parsed.source,
        "source",
      );
      if (candidateIndices === null) {
        candidateIndices = sourceIds;
      } else {
        // Intersect with existing candidates
        const intersection = new Set<number>();
        for (const idx of candidateIndices) {
          if (sourceIds.has(idx)) {
            intersection.add(idx);
          }
        }
        candidateIndices = intersection;
      }
    }

    // Apply target constraint using indices
    if (parsed.target) {
      const targetIds = this.getTripleIndicesForNodeQueries(
        parsed.target,
        "target",
      );
      if (candidateIndices === null) {
        candidateIndices = targetIds;
      } else {
        // Intersect with existing candidates
        const intersection = new Set<number>();
        for (const idx of candidateIndices) {
          if (targetIds.has(idx)) {
            intersection.add(idx);
          }
        }
        candidateIndices = intersection;
      }
    }

    // If no candidates found via indices, return empty
    if (candidateIndices === null || candidateIndices.size === 0) {
      return new TribbleDB([], this.validations);
    }

    // Convert triple indices to triples and apply fine-grained filters
    const matchingTriples: Triple[] = [];
    for (const tripleIdx of candidateIndices) {
      const triple = this.index.getTriple(tripleIdx);
      if (!triple) continue;

      const [source, relation, target] = triple;

      // Apply predicate filters if present
      if (parsed.source) {
        let sourceMatches = false;
        for (const sourceQuery of parsed.source) {
          if (sourceQuery.predicate && !sourceQuery.predicate(source)) {
            continue;
          }
          sourceMatches = true;
          break;
        }
        if (!sourceMatches) continue;
      }

      if (parsed.relation?.predicate && !parsed.relation.predicate(relation)) {
        continue;
      }

      if (parsed.target) {
        let targetMatches = false;
        for (const targetQuery of parsed.target) {
          if (targetQuery.predicate && !targetQuery.predicate(target)) {
            continue;
          }
          targetMatches = true;
          break;
        }
        if (!targetMatches) continue;
      }

      matchingTriples.push(triple);
    }

    return new TribbleDB(matchingTriples, this.validations);
  }

  private getTripleIndicesForNodeQueries(
    queries: NodeObjectQuery[],
    position: "source" | "target",
  ): Set<number> {
    const result = new Set<number>();

    // Union of all query results (OR between queries)
    for (const query of queries) {
      const hasIndexableConstraints = query.type !== undefined ||
        query.id !== undefined ||
        (query.qs !== undefined && Object.keys(query.qs).length > 0);

      // If only predicate is specified (no indexable constraints), return all indices
      // The predicate will be applied later
      if (!hasIndexableConstraints) {
        // Return all triple indices - predicates will filter these later
        for (let idx = 0; idx < this.index.arrayLength; idx++) {
          result.add(idx);
        }
        continue;
      }

      const queryMatches: Set<number>[] = [];

      // Get candidates by type
      if (query.type !== undefined) {
        const typeSet = position === "source"
          ? this.index.getSourceTypeSet(query.type)
          : this.index.getTargetTypeSet(query.type);

        if (typeSet) {
          queryMatches.push(typeSet);
        } else {
          // No matches for this constraint means this query can't match anything
          continue;
        }
      }

      // Get candidates by id (union within query.id array, intersection with other constraints)
      if (query.id !== undefined) {
        const ids = Array.isArray(query.id) ? query.id : [query.id];
        const idUnion = new Set<number>();

        for (const nodeId of ids) {
          const idSet = position === "source"
            ? this.index.getSourceIdSet(nodeId)
            : this.index.getTargetIdSet(nodeId);

          if (idSet) {
            for (const idx of idSet) {
              idUnion.add(idx);
            }
          }
        }

        if (idUnion.size > 0) {
          queryMatches.push(idUnion);
        } else {
          // No matches for this constraint means this query can't match anything
          continue;
        }
      }

      // Get candidates by query string (intersection of all qs pairs)
      if (query.qs !== undefined) {
        const qsKeys = Object.keys(query.qs);
        if (qsKeys.length > 0) {
          const qsSets: Set<number>[] = [];

          for (const key of qsKeys) {
            const qsSet = position === "source"
              ? this.index.getSourceQsSet(key, query.qs[key])
              : this.index.getTargetQsSet(key, query.qs[key]);

            if (qsSet) {
              qsSets.push(qsSet);
            } else {
              // No matches for this qs pair means this query can't match anything
              qsSets.length = 0;
              break;
            }
          }

          if (qsSets.length > 0) {
            // Intersect all qs constraints
            let qsIntersection = qsSets[0];
            for (let idx = 1; idx < qsSets.length; idx++) {
              qsIntersection = this.intersectSets(qsIntersection, qsSets[idx]);
              if (qsIntersection.size === 0) break;
            }
            queryMatches.push(qsIntersection);
          } else {
            // Had qs constraints but none matched
            continue;
          }
        }
      }

      // Intersect all constraints within this query
      if (queryMatches.length === 0) {
        // No constraints means match all (but this shouldn't happen in practice)
        continue;
      }

      let queryResult = queryMatches[0];
      for (let idx = 1; idx < queryMatches.length; idx++) {
        queryResult = this.intersectSets(queryResult, queryMatches[idx]);
        if (queryResult.size === 0) break;
      }

      // Union this query's results with overall result
      for (const idx of queryResult) {
        result.add(idx);
      }
    }

    return result;
  }

  private searchTriples(params: Search): Triple[] {
    const parsed = parseSearch(params);

    // Get all triples if no constraints
    if (!parsed.source && !parsed.relation && !parsed.target) {
      return this.triples();
    }

    // Use index-based search
    let candidateIndices: Set<number> | null = null;

    // Start with relation constraint if present
    if (parsed.relation) {
      const relationNames = Array.isArray(parsed.relation.relation)
        ? parsed.relation.relation
        : [parsed.relation.relation];

      if (relationNames.length > 0) {
        candidateIndices = new Set<number>();
        for (const relName of relationNames) {
          const ids = this.index.getRelationSet(relName);
          if (ids) {
            for (const idx of ids) {
              candidateIndices.add(idx);
            }
          }
        }
      }
    }

    // Apply source constraint
    if (parsed.source) {
      const sourceIds = this.getTripleIndicesForNodeQueries(
        parsed.source,
        "source",
      );
      if (candidateIndices === null) {
        candidateIndices = sourceIds;
      } else {
        const intersection = new Set<number>();
        for (const idx of candidateIndices) {
          if (sourceIds.has(idx)) {
            intersection.add(idx);
          }
        }
        candidateIndices = intersection;
      }
    }

    // Apply target constraint
    if (parsed.target) {
      const targetIds = this.getTripleIndicesForNodeQueries(
        parsed.target,
        "target",
      );
      if (candidateIndices === null) {
        candidateIndices = targetIds;
      } else {
        const intersection = new Set<number>();
        for (const idx of candidateIndices) {
          if (targetIds.has(idx)) {
            intersection.add(idx);
          }
        }
        candidateIndices = intersection;
      }
    }

    if (candidateIndices === null || candidateIndices.size === 0) {
      return [];
    }

    // Convert to triples with predicate filters
    const matchingTriples: Triple[] = [];
    for (const tripleIdx of candidateIndices) {
      const triple = this.index.getTriple(tripleIdx);
      if (!triple) continue;

      const [source, relation, target] = triple;

      // Apply predicate filters
      if (parsed.source) {
        let sourceMatches = false;
        for (const sourceQuery of parsed.source) {
          if (sourceQuery.predicate && !sourceQuery.predicate(source)) {
            continue;
          }
          sourceMatches = true;
          break;
        }
        if (!sourceMatches) continue;
      }

      if (parsed.relation?.predicate && !parsed.relation.predicate(relation)) {
        continue;
      }

      if (parsed.target) {
        let targetMatches = false;
        for (const targetQuery of parsed.target) {
          if (targetQuery.predicate && !targetQuery.predicate(target)) {
            continue;
          }
          targetMatches = true;
          break;
        }
        if (!targetMatches) continue;
      }

      matchingTriples.push(triple);
    }

    return matchingTriples;
  }

  /*
   * Search for triples matching a search-query, and applies a transformation function
   * to each matching triple in-place.
   */
  searchFlatmap(search: Search, fnc: (triple: Triple) => Triple[]): TribbleDB {
    const matchingTriples = this.searchTriples(search);

    // Apply the flatmap function
    const transformedTriples = matchingTriples.flatMap(fnc);

    // Compute diffs efficiently using Sets
    const originalHashes = new Set<string>();
    const transformedHashes = new Set<string>();
    const transformedByHash = new Map<string, Triple>();

    for (const triple of matchingTriples) {
      originalHashes.add(hashTriple(triple));
    }

    for (const triple of transformedTriples) {
      const hash = hashTriple(triple);
      transformedHashes.add(hash);
      transformedByHash.set(hash, triple);
    }

    // Only delete triples that are no longer present
    const triplesToDelete: Triple[] = [];
    for (const triple of matchingTriples) {
      const hash = hashTriple(triple);
      if (!transformedHashes.has(hash)) {
        triplesToDelete.push(triple);
      }
    }

    // Only add triples that are new
    const triplesToAdd: Triple[] = [];
    for (const hash of transformedHashes) {
      if (!originalHashes.has(hash)) {
        triplesToAdd.push(transformedByHash.get(hash)!);
      }
    }

    if (triplesToDelete.length > 0) {
      this.delete(triplesToDelete);
    }
    if (triplesToAdd.length > 0) {
      this.add(triplesToAdd);
    }

    return this;
  }

  get triplesCount(): number {
    return this.index.length;
  }
}
