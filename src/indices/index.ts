import type { IndexedTriple, ParsedUrn, Triple } from "../types.ts";
import { asUrn } from "../urn.ts";
import { IndexedSet } from "../sets.ts";
import { IndexPerformanceMetrics } from "../metrics.ts";

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
  stringIndex: IndexedSet;
  tripleHashes: Set<string>;
  hashIndices: Map<string, number>;

  sourceType: Map<number, Set<number>>;
  sourceId: Map<number, Set<number>>;
  // note: QS uses a composite key: <key>=<value>
  sourceQs: Map<number, Set<number>>;

  relations: Map<number, Set<number>>;

  targetType: Map<number, Set<number>>;
  targetId: Map<number, Set<number>>;
  targetQs: Map<number, Set<number>>;

  metrics: IndexPerformanceMetrics;
  stringUrn: Map<string, ParsedUrn>;

  constructor(triples: Triple[]) {
    this.indexedTriples = [];
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
      const tripleIndex = this.getTripleIndex(triple);

      if (tripleIndex !== undefined) {
        const tripleHash = this.hashTriple(triple);
        this.tripleHashes.delete(tripleHash);
        this.hashIndices.delete(tripleHash);
        this.cleanupSearchMaps(tripleIndex);

        // Mark the entry as deleted by setting it to undefined
        delete this.indexedTriples[tripleIndex];
      }
    }
  }

  /*
   * Remove a triple index from all search maps
   */
  private cleanupSearchMaps(tripleIndex: number) {
    const indexedTriple = this.indexedTriples[tripleIndex];
    if (!indexedTriple) {
      return
    };

    const [sourceIdx, relationIdx, targetIdx] = indexedTriple;

    // Convert indices back to strings
    const source = this.stringIndex.getValue(sourceIdx);
    const relation = this.stringIndex.getValue(relationIdx);
    const target = this.stringIndex.getValue(targetIdx);

    if (typeof source === "undefined" || typeof relation === "undefined" || typeof target === "undefined") {
      return
    };

    // Parse source and target to get their components (use cached if available)
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

    // Get string indices for precise removal
    const sourceTypeIdx = this.stringIndex.getIndex(parsedSource.type);
    const sourceIdIdx = this.stringIndex.getIndex(parsedSource.id);
    const targetTypeIdx = this.stringIndex.getIndex(parsedTarget.type);
    const targetIdIdx = this.stringIndex.getIndex(parsedTarget.id);

    // Remove from specific sets only
    if (sourceTypeIdx !== undefined) {
      this.sourceType.get(sourceTypeIdx)?.delete(tripleIndex);
    }
    if (sourceIdIdx !== undefined) {
      this.sourceId.get(sourceIdIdx)?.delete(tripleIndex);
    }
    this.relations.get(relationIdx)?.delete(tripleIndex);
    if (targetTypeIdx !== undefined) {
      this.targetType.get(targetTypeIdx)?.delete(tripleIndex);
    }
    if (targetIdIdx !== undefined) {
      this.targetId.get(targetIdIdx)?.delete(tripleIndex);
    }

    // Clean up query string maps
    for (const [key, value] of Object.entries(parsedSource.qs)) {
      const keyValueIdx = this.stringIndex.getIndex(`${key}=${value}`);
      if (keyValueIdx !== undefined) {
        this.sourceQs.get(keyValueIdx)?.delete(tripleIndex);
      }
    }

    for (const [key, value] of Object.entries(parsedTarget.qs)) {
      const keyValueIdx = this.stringIndex.getIndex(`${key}=${value}`);
      if (keyValueIdx !== undefined) {
        this.targetQs.get(keyValueIdx)?.delete(tripleIndex);
      }
    }
  }  /*
   * Return the triples that are absent from the index
   *
   */
  difference(triples: Triple[]): Triple[] {
    return triples.filter((triple) => !this.hasTriple(triple));
  }

  /*
   * Check if a triple is present in the index
   *
   */
  hasTriple(triple: Triple): boolean {
    return this.tripleHashes.has(this.hashTriple(triple));
  }

  /*
   * Generate a simple hash for a triple
   *
   */
  hashTriple(triple: Triple): string {
    const str = `${triple[0]}${triple[1]}${triple[2]}`;

    let hash = 0;
    for (let i = 0, len = str.length; i < len; i++) {
        const chr = str.charCodeAt(i);
        hash = (hash << 5) - hash + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return hash.toString();
  }

  /*
   * Get the index of a specific triple
   *
   */
  getTripleIndex(triple: Triple): number | undefined {
    const hash = this.hashTriple(triple);
    return this.hashIndices.get(hash)
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
      const sourceTypeIdx = this.stringIndex.add(parsedSource.type);
      const sourceIdIdx = this.stringIndex.add(parsedSource.id);
      const relationIdx = this.stringIndex.add(relation);
      const targetTypeIdx = this.stringIndex.add(parsedTarget.type);
      const targetIdIdx = this.stringIndex.add(parsedTarget.id);

      // Already present, and no need to add twice.
      if (this.tripleHashes.has(this.hashTriple(triple))) {
        continue;
      }
      const hash = this.hashTriple(triple);
      this.tripleHashes.add(hash);

      // Get the actual index where this triple will be stored
      const idx = this.indexedTriples.length;

      // add it to a map of hashes to indices
      this.hashIndices.set(hash, idx);

      // Store the indexed triple
      this.indexedTriples.push([
        this.stringIndex.add(source),
        relationIdx,
        this.stringIndex.add(target),
      ]);

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
        if (!this.sourceQs.has(qsIdx)) {
          this.sourceQs.set(qsIdx, new Set());
        }

        this.sourceQs.get(qsIdx)!.add(idx);
      }

      let relationSet = this.relations.get(relationIdx);
      if (!relationSet) {
        relationSet = new Set();
        this.relations.set(relationIdx, relationSet);
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
        if (!this.targetQs.has(qsIdx)) {
          this.targetQs.set(qsIdx, new Set());
        }

        this.targetQs.get(qsIdx)!.add(idx);
      }
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
      .filter(triple => triple !== undefined)
      .map(([sourceIdx, relationIdx, targetIdx]) => [
        this.stringIndex.getValue(sourceIdx)!,
        this.stringIndex.getValue(relationIdx)!,
        this.stringIndex.getValue(targetIdx)!,
      ]);
  }

  /*
   * Get a specific triple by index
   *
   */
  getTriple(index: number): Triple | undefined {
    if (index < 0 || index >= this.indexedTriples.length) {
      return undefined;
    }

    const indexedTriple = this.indexedTriples[index];
    if (!indexedTriple) {
      return undefined;
    }

    const [sourceIdx, relationIdx, targetIdx] = indexedTriple;
    return [
      this.stringIndex.getValue(sourceIdx)!,
      this.stringIndex.getValue(relationIdx)!,
      this.stringIndex.getValue(targetIdx)!,
    ];
  }

  /*
   * Get the string indices for a specific triple by triple index
   *
   */
  getTripleIndices(index: number): [number, number, number] | undefined {
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

  /*
   * Deep-clone the index
   */
  clone() {
    const newIndex = new Index([]);
    newIndex.indexedTriples = this.indexedTriples.slice();
    newIndex.stringIndex = this.stringIndex.clone();
    newIndex.tripleHashes = new Set(this.tripleHashes);

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

    newIndex.sourceType = cloneMap(this.sourceType);
    newIndex.sourceId = cloneMap(this.sourceId);
    newIndex.sourceQs = cloneMap(this.sourceQs);
    newIndex.relations = cloneMap(this.relations);
    newIndex.targetType = cloneMap(this.targetType);
    newIndex.targetId = cloneMap(this.targetId);
    newIndex.targetQs = cloneMap(this.targetQs);

    newIndex.stringUrn = new Map(this.stringUrn);
    newIndex.metrics = this.metrics.clone();

    return newIndex;
  }
}
