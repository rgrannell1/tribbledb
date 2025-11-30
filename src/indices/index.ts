import type { IndexedTriple, ParsedUrn, Triple } from "../types.ts";
import { asUrn } from "../urn.ts";
import { IndexedSet } from "../sets.ts";
import { IndexPerformanceMetrics } from "../metrics.ts";
import { hashTriple } from "../hash.ts";

/*
 * Construct an index to accelerate triple searches. Normally
 * search would be done through a linear table scan, but it can
 * be sped up by mapping each queryable term (e.g `source.id`) to
 * a set of indices of triples which match this term.
 *
 * This implementation uses IndexedSet to map strings to numbers
 * internally for better memory efficiency with long strings.
 */
/*
 * Metadata for efficient deletion - stores all indices needed to remove a triple
 */
type TripleMetadata = {
  sourceTypeIdx: number;
  sourceIdIdx: number;
  sourceQsIndices: number[];
  relation: string;
  targetTypeIdx: number;
  targetIdIdx: number;
  targetQsIndices: number[];
};

export class Index {
  // Internal indexed representation for memory efficiency
  private indexedTriples: IndexedTriple[];
  // Metadata cache for efficient deletion
  private tripleMetadata: Map<number, TripleMetadata>;

  // String indexing sets for memory efficiency
  stringIndex: IndexedSet;
  tripleHashes: Set<string>;
  hashIndices: Map<string, number>;

  sourceType: Map<number, Set<number>>;
  sourceId: Map<number, Set<number>>;
  // note: QS uses a composite key: <key>=<value>
  sourceQs: Map<number, Set<number>>;

  relations: Map<string, Set<number>>;

  targetType: Map<number, Set<number>>;
  targetId: Map<number, Set<number>>;
  targetQs: Map<number, Set<number>>;

  metrics: IndexPerformanceMetrics;
  stringUrn: Map<string, ParsedUrn>;

  constructor(triples: Triple[]) {
    this.indexedTriples = [];
    this.tripleMetadata = new Map();
    this.stringIndex = new IndexedSet();
    this.tripleHashes = new Set();
    this.hashIndices = new Map();

    this.sourceType = new Map();
    this.sourceId = new Map();
    this.sourceQs = new Map();
    this.relations = new Map();
    this.targetType = new Map();
    this.targetId = new Map();
    this.targetQs = new Map();

    // maps strings to URNs
    this.stringUrn = new Map();
    this.add(triples);

    this.metrics = new IndexPerformanceMetrics();
  }

  /*
   * Delete triples from the index
   */
  delete(triples: Triple[]) {
    for (let idx = 0; idx < triples.length; idx++) {
      const triple = triples[idx];
      const tripleHash = hashTriple(triple);
      const tripleIndex = this.hashIndices.get(tripleHash);

      if (tripleIndex === undefined) {
        continue;
      }

      // Remove hashes first
      this.tripleHashes.delete(tripleHash);
      this.hashIndices.delete(tripleHash);

      // Fast cleanup using cached metadata
      const metadata = this.tripleMetadata.get(tripleIndex);
      if (metadata) {
        // Remove from all index maps using cached metadata - no conditionals needed
        this.sourceType.get(metadata.sourceTypeIdx)?.delete(tripleIndex);
        this.sourceId.get(metadata.sourceIdIdx)?.delete(tripleIndex);
        this.relations.get(metadata.relation)?.delete(tripleIndex);
        this.targetType.get(metadata.targetTypeIdx)?.delete(tripleIndex);
        this.targetId.get(metadata.targetIdIdx)?.delete(tripleIndex);

        // Clean up query strings in batch
        for (const qsIdx of metadata.sourceQsIndices) {
          this.sourceQs.get(qsIdx)?.delete(tripleIndex);
        }
        for (const qsIdx of metadata.targetQsIndices) {
          this.targetQs.get(qsIdx)?.delete(tripleIndex);
        }

        this.tripleMetadata.delete(tripleIndex);
      }

      // mark the triple index as undefined
      delete this.indexedTriples[tripleIndex];
    }
  }

  /*
   * Return the triples that are absent from the index
   */
  difference(triples: Triple[]): Triple[] {
    return triples.filter((triple) => !this.hasTriple(triple));
  }

  /*
   * Check if a triple is present in the index
   */
  hasTriple(triple: Triple): boolean {
    return this.tripleHashes.has(hashTriple(triple));
  }

  /*
   * Get the index of a specific triple
   */
  getTripleIndex(triple: Triple): number | undefined {
    const hash = hashTriple(triple);
    return this.hashIndices.get(hash);
  }

  /*
   * Add new triples to the index incrementally
   */
  add(triples: Triple[]) {
    // Index the new triples
    for (let jdx = 0; jdx < triples.length; jdx++) {
      const triple = triples[jdx];

      const source = triple[0];
      const relation = triple[1];
      const target = triple[2];

      let parsedSource = this.stringUrn.get(source);
      if (!parsedSource) {
        parsedSource = asUrn(source);
        this.stringUrn.set(source, parsedSource);
      }

      let parsedTarget = this.stringUrn.get(target);
      if (!parsedTarget) {
        parsedTarget = asUrn(target);
        this.stringUrn.set(target, parsedTarget);
      }

      // Convert strings to indices using the IndexedSet
      const sourceIdx = this.stringIndex.add(source);
      const targetIdx = this.stringIndex.add(target);

      const sourceTypeIdx = this.stringIndex.add(parsedSource.type);
      const sourceIdIdx = this.stringIndex.add(parsedSource.id);
      const targetTypeIdx = this.stringIndex.add(parsedTarget.type);
      const targetIdIdx = this.stringIndex.add(parsedTarget.id);

      // Already present, and no need to add twice.
      const hash = hashTriple(triple);
      if (this.tripleHashes.has(hash)) {
        continue;
      }
      this.tripleHashes.add(hash);

      // Get the actual index where this triple will be stored
      const idx = this.indexedTriples.length;

      // add it to a map of hashes to indices
      this.hashIndices.set(hash, idx);

      // Store the indexed triple (reuse already computed indices)
      this.indexedTriples.push([sourceIdx, relation, targetIdx]);

      // Collect query string indices for metadata
      const sourceQsIndices: number[] = [];
      const targetQsIndices: number[] = [];

      // source.type
      let sourceTypeSet = this.sourceType.get(sourceTypeIdx);
      if (!sourceTypeSet) {
        sourceTypeSet = new Set();
        this.sourceType.set(sourceTypeIdx, sourceTypeSet);
      }
      sourceTypeSet.add(idx);

      // source.id
      let sourceIdSet = this.sourceId.get(sourceIdIdx);
      if (!sourceIdSet) {
        sourceIdSet = new Set();
        this.sourceId.set(sourceIdIdx, sourceIdSet);
      }
      sourceIdSet.add(idx);

      // source.qs
      for (const [key, val] of Object.entries(parsedSource.qs)) {
        const qsIdx = this.stringIndex.add(`${key}=${val}`);
        sourceQsIndices.push(qsIdx);
        let sourceQsSet = this.sourceQs.get(qsIdx);
        if (!sourceQsSet) {
          sourceQsSet = new Set();
          this.sourceQs.set(qsIdx, sourceQsSet);
        }
        sourceQsSet.add(idx);
      }

      // relations
      let relationSet = this.relations.get(relation);
      if (!relationSet) {
        relationSet = new Set();
        this.relations.set(relation, relationSet);
      }
      relationSet.add(idx);

      // target.type
      let targetTypeSet = this.targetType.get(targetTypeIdx);
      if (!targetTypeSet) {
        targetTypeSet = new Set();
        this.targetType.set(targetTypeIdx, targetTypeSet);
      }
      targetTypeSet.add(idx);

      // target.id
      let targetIdSet = this.targetId.get(targetIdIdx);
      if (!targetIdSet) {
        targetIdSet = new Set();
        this.targetId.set(targetIdIdx, targetIdSet);
      }
      targetIdSet.add(idx);

      // target.qs
      for (const [key, val] of Object.entries(parsedTarget.qs)) {
        const qsIdx = this.stringIndex.add(`${key}=${val}`);
        targetQsIndices.push(qsIdx);
        let targetQsSet = this.targetQs.get(qsIdx);
        if (!targetQsSet) {
          targetQsSet = new Set();
          this.targetQs.set(qsIdx, targetQsSet);
        }
        targetQsSet.add(idx);
      }

      // Store metadata for efficient deletion
      this.tripleMetadata.set(idx, {
        sourceTypeIdx,
        sourceIdIdx,
        sourceQsIndices,
        relation,
        targetTypeIdx,
        targetIdIdx,
        targetQsIndices,
      });
    }
  }
  /*
   * Get the number of triples in the index
   */
  get length(): number {
    return this.tripleHashes.size;
  }

  /*
   * Get the actual array length including gaps (for cursor index management)
   */
  get arrayLength(): number {
    return this.indexedTriples.length;
  }

  /*
   * Reconstruct the original triples from the indexed representation
   */
  triples(): Triple[] {
    return this.indexedTriples
      .filter((triple) => triple !== undefined)
      .map(([sourceIdx, relation, targetIdx]) => [
        this.stringIndex.getValue(sourceIdx)!,
        relation,
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

    const indexedTriple = this.indexedTriples[index];
    if (!indexedTriple) {
      return undefined;
    }

    const [sourceIdx, relation, targetIdx] = indexedTriple;
    return [
      this.stringIndex.getValue(sourceIdx)!,
      relation,
      this.stringIndex.getValue(targetIdx)!,
    ];
  }

  /*
   * Get the string indices for a specific triple by triple index
   */
  getTripleIndices(index: number): [number, string, number] | undefined {
    if (index < 0 || index >= this.indexedTriples.length) {
      return undefined;
    }

    return this.indexedTriples[index];
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
    this.metrics.mapRead();
    return this.relations.get(relation);
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

  /*
   * Deep-clone the index
   */
  clone() {
    const newIndex = new Index([]);
    newIndex.indexedTriples = this.indexedTriples.slice();
    newIndex.tripleMetadata = new Map(this.tripleMetadata);
    newIndex.stringIndex = this.stringIndex.clone();
    newIndex.tripleHashes = new Set(this.tripleHashes);
    newIndex.hashIndices = new Map(this.hashIndices);

    // Clone all maps
    const cloneMap = (
      original: Map<number, Set<number>>,
    ): Map<number, Set<number>> => {
      const newMap = new Map<number, Set<number>>();
      for (const [key, valueSet] of original.entries()) {
        newMap.set(key, new Set(valueSet));
      }
      return newMap;
    };

    const cloneRelationMap = (
      original: Map<string, Set<number>>,
    ): Map<string, Set<number>> => {
      const newMap = new Map<string, Set<number>>();
      for (const [key, valueSet] of original.entries()) {
        newMap.set(key, new Set(valueSet));
      }
      return newMap;
    };

    newIndex.sourceType = cloneMap(this.sourceType);
    newIndex.sourceId = cloneMap(this.sourceId);
    newIndex.sourceQs = cloneMap(this.sourceQs);
    newIndex.relations = cloneRelationMap(this.relations);
    newIndex.targetType = cloneMap(this.targetType);
    newIndex.targetId = cloneMap(this.targetId);
    newIndex.targetQs = cloneMap(this.targetQs);

    newIndex.stringUrn = new Map(this.stringUrn);
    newIndex.metrics = this.metrics.clone();

    return newIndex;
  }
}
