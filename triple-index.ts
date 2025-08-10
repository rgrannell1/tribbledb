import { Triples } from "./triples.ts";
import type { IndexedTriple, Triple } from "./types.ts";
import { asUrn } from "./urn.ts";
import { IndexedSet } from "./sets.ts";
import { IndexPerformanceMetrics } from "./metrics.ts";

/*
 * Construct an index to accelerate triple searches. Normally
 * search would be done through a linear table scan, but it can
 * be sped up by mapping each queryable term (e.g `source.id`) to
 * a set of indices of triples which match this term.
 *
 * This implementation uses IndexedSet to map strings to numbers
 * internally for better memory efficiency with long strings.
 */
export class Index {
  // Internal indexed representation for memory efficiency
  private indexedTriples: IndexedTriple[];

  // String indexing sets for memory efficiency
  private stringIndex: IndexedSet;

  sourceType: Map<number, Set<number>>;
  sourceId: Map<number, Set<number>>;
  // note: QS uses a composite key: <key>=<value>
  sourceQs: Map<number, Set<number>>;

  relations: Map<number, Set<number>>;

  targetType: Map<number, Set<number>>;
  targetId: Map<number, Set<number>>;
  targetQs: Map<number, Set<number>>;

  metrics: IndexPerformanceMetrics;

  constructor(triples: Triple[]) {
    this.indexedTriples = [];
    this.stringIndex = new IndexedSet();

    this.sourceType = new Map();
    this.sourceId = new Map();
    this.sourceQs = new Map();
    this.relations = new Map();
    this.targetType = new Map();
    this.targetId = new Map();
    this.targetQs = new Map();
    this.indexTriples(triples);
    this.metrics = new IndexPerformanceMetrics();
  }

  /*
   * Associate each triple onto an appropriate map `Term := <id>: <value>`
   */
  indexTriples(triples: Triple[]) {
    for (let idx = 0; idx < triples.length; idx++) {
      this.indexTriple(triples[idx], idx);
    }
  }

  /*
   * Index a single triple at the given index position
   */
  private indexTriple(triple: Triple, idx: number) {
    const parsedSource = asUrn(Triples.source(triple));
    const relation = Triples.relation(triple);
    const parsedTarget = asUrn(Triples.target(triple));

    // Convert strings to indices using the IndexedSet
    const sourceTypeIdx = this.stringIndex.add(parsedSource.type);
    const sourceIdIdx = this.stringIndex.add(parsedSource.id);
    const relationIdx = this.stringIndex.add(relation);
    const targetTypeIdx = this.stringIndex.add(parsedTarget.type);
    const targetIdIdx = this.stringIndex.add(parsedTarget.id);

    // Store the indexed triple
    this.indexedTriples.push([
      this.stringIndex.add(Triples.source(triple)),
      relationIdx,
      this.stringIndex.add(Triples.target(triple)),
    ]);

    // source.type
    if (!this.sourceType.has(sourceTypeIdx)) {
      this.sourceType.set(sourceTypeIdx, new Set());
    }
    this.sourceType.get(sourceTypeIdx)!.add(idx);

    // source.id
    if (!this.sourceId.has(sourceIdIdx)) {
      this.sourceId.set(sourceIdIdx, new Set());
    }
    this.sourceId.get(sourceIdIdx)!.add(idx);

    // source.qs
    for (const [key, val] of Object.entries(parsedSource.qs)) {
      const qsIdx = this.stringIndex.add(`${key}=${val}`);
      if (!this.sourceQs.has(qsIdx)) {
        this.sourceQs.set(qsIdx, new Set());
      }

      this.sourceQs.get(qsIdx)!.add(idx);
    }

    // relation
    if (!this.relations.has(relationIdx)) {
      this.relations.set(relationIdx, new Set());
    }
    this.relations.get(relationIdx)!.add(idx);

    // target.type
    if (!this.targetType.has(targetTypeIdx)) {
      this.targetType.set(targetTypeIdx, new Set());
    }
    this.targetType.get(targetTypeIdx)!.add(idx);

    // target.id
    if (!this.targetId.has(targetIdIdx)) {
      this.targetId.set(targetIdIdx, new Set());
    }
    this.targetId.get(targetIdIdx)!.add(idx);

    // target.qs
    for (const [key, val] of Object.entries(parsedTarget.qs)) {
      const qsIdx = this.stringIndex.add(`${key}=${val}`);
      if (!this.targetQs.has(qsIdx)) {
        this.targetQs.set(qsIdx, new Set());
      }

      this.targetQs.get(qsIdx)!.add(idx);
    }
  }

  /*
   * Add new triples to the index incrementally
   */
  add(newTriples: Triple[]) {
    const startIdx = this.indexedTriples.length;

    // Index the new triples
    for (let idx = 0; idx < newTriples.length; idx++) {
      this.indexTriple(newTriples[idx], startIdx + idx);
    }
  }

  /*
   * Get the number of triples in the index
   */
  get length(): number {
    return this.indexedTriples.length;
  }

  /*
   * Reconstruct the original triples from the indexed representation
   */
  triples(): Triple[] {
    return this.indexedTriples.map(([sourceIdx, relationIdx, targetIdx]) => [
      this.stringIndex.getValue(sourceIdx)!,
      this.stringIndex.getValue(relationIdx)!,
      this.stringIndex.getValue(targetIdx)!,
    ]);
  }

  /*
   * Get a specific triple by index
   */
  getTriple(index: number): Triple | undefined {
    if (index < 0 || index >= this.indexedTriples.length) {
      return undefined;
    }

    const [sourceIdx, relationIdx, targetIdx] = this.indexedTriples[index];
    return [
      this.stringIndex.getValue(sourceIdx)!,
      this.stringIndex.getValue(relationIdx)!,
      this.stringIndex.getValue(targetIdx)!,
    ];
  }

  /*
   * Helper methods to convert string keys to indices for external API compatibility
   */

  getSourceTypeSet(type: string): Set<number> | undefined {
    const typeIdx = this.stringIndex.getIndex(type);

    if (typeIdx === undefined) {
      return undefined;
    }
    this.metrics.mapRead();

    return this.sourceType.get(typeIdx);
  }

  getSourceIdSet(id: string): Set<number> | undefined {
    const idIdx = this.stringIndex.getIndex(id);

    if (idIdx === undefined) {
      return undefined;
    }
    this.metrics.mapRead();

    return this.sourceId.get(idIdx);
  }

  getSourceQsSet(key: string, val: string): Set<number> | undefined {
    const qsIdx = this.stringIndex.getIndex(`${key}=${val}`);

    if (qsIdx === undefined) {
      return undefined;
    }
    this.metrics.mapRead();

    return this.sourceQs.get(qsIdx);
  }

  getRelationSet(relation: string): Set<number> | undefined {
    const relationIdx = this.stringIndex.getIndex(relation);

    if (relationIdx === undefined) {
      return undefined;
    }
    this.metrics.mapRead();

    return this.relations.get(relationIdx);
  }

  getTargetTypeSet(type: string): Set<number> | undefined {
    const typeIdx = this.stringIndex.getIndex(type);

    if (typeIdx === undefined) {
      return undefined;
    }
    this.metrics.mapRead();

    return this.targetType.get(typeIdx);
  }

  getTargetIdSet(id: string): Set<number> | undefined {
    const idIdx = this.stringIndex.getIndex(id);
    if (idIdx === undefined) {
      return undefined;
    }
    this.metrics.mapRead();
    return this.targetId.get(idIdx);
  }

  getTargetQsSet(key: string, val: string): Set<number> | undefined {
    const qsIdx = this.stringIndex.getIndex(`${key}=${val}`);
    if (qsIdx === undefined) {
      return undefined;
    }
    this.metrics.mapRead();
    return this.targetQs.get(qsIdx);
  }
}
