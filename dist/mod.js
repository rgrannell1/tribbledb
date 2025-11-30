// src/sets.ts
var IndexedSet = class _IndexedSet {
  #idx;
  #map;
  #reverseMap;
  constructor() {
    this.#idx = 0;
    this.#map = /* @__PURE__ */ new Map();
    this.#reverseMap = /* @__PURE__ */ new Map();
  }
  /*
   * Return the underlying map of values to indices
   */
  map() {
    return this.#map;
  }
  /*
   * Return the underlying map of indices to values
   */
  reverseMap() {
    return this.#reverseMap;
  }
  /*
   * Add a value to the set, and return its index
   */
  add(value) {
    if (this.#map.has(value)) {
      return this.#map.get(value);
    }
    this.#map.set(value, this.#idx);
    this.#reverseMap.set(this.#idx, value);
    this.#idx++;
    return this.#idx - 1;
  }
  /**
   * Set the index for a value in the set
   */
  setIndex(value, index) {
    this.#map.set(value, index);
    this.#reverseMap.set(index, value);
  }
  /**
   * Get the index for a value in the set
   */
  getIndex(value) {
    return this.#map.get(value);
  }
  /**
   * Set the values for an index in the set
   */
  getValue(idx) {
    return this.#reverseMap.get(idx);
  }
  /**
   * Does this structure have a value?
   */
  has(value) {
    return this.#map.has(value);
  }
  clone() {
    const newSet = new _IndexedSet();
    for (const [key, value] of this.#map.entries()) {
      newSet.setIndex(key, value);
    }
    return newSet;
  }
};
var Sets = class {
  /*
   * Compute the intersection of multiple numeric sets.
   * The number of sets will be low (we're not adding ninety
   * query parameters to these URNs) so first sort the
   * sets in ascending size.
   */
  static intersection(metrics, sets) {
    if (sets.length === 0) {
      return /* @__PURE__ */ new Set();
    }
    sets.sort((setA, setB) => {
      return setA.size - setB.size;
    });
    const acc = new Set(sets[0]);
    for (let idx = 1; idx < sets.length; idx++) {
      const currentSet = sets[idx];
      for (const value of acc) {
        metrics.setCheck();
        if (!currentSet.has(value)) {
          acc.delete(value);
        }
      }
      if (acc.size === 0) {
        break;
      }
    }
    return acc;
  }
  /*
   * Union two sets, and store the results in the left-hand-side set.
   */
  static append(set0, set1) {
    for (const item of set1) {
      set0.add(item);
    }
    return set0;
  }
  /*
   * Compute the difference of two sets (set0 - set1)
   */
  static difference(set0, set1) {
    const result = /* @__PURE__ */ new Set();
    for (const item of set0) {
      if (!set1.has(item)) {
        result.add(item);
      }
    }
    return result;
  }
};

// src/tribble/parse.ts
var TribbleParser = class {
  stringIndex;
  constructor() {
    this.stringIndex = new IndexedSet();
  }
  /*
   * Parse a triple-line of tribble format text, and return a triple
   */
  parseTriple(line) {
    const match = line.match(/^(\d+) (\d+) (\d+)$/);
    if (!match) {
      throw new SyntaxError(`Invalid format for triple line: ${line}`);
    }
    const src = this.stringIndex.getValue(parseInt(match[1], 10));
    const rel = this.stringIndex.getValue(parseInt(match[2], 10));
    const tgt = this.stringIndex.getValue(parseInt(match[3], 10));
    if (src === void 0 || rel === void 0 || tgt === void 0) {
      throw new SyntaxError(`Invalid triple reference: ${line}`);
    }
    return [src, rel, tgt];
  }
  /*
   * Parse a declaration line of tribble format text, and
   * update the index.
   */
  parseDeclaration(line) {
    const match = line.match(/^(\d+) "(.*)"$/);
    if (!match) {
      throw new SyntaxError(`Invalid format for declaration line: ${line}`);
    }
    const id = match[1];
    const value = match[2];
    this.stringIndex.setIndex(value, parseInt(id, 10));
  }
  /*
   * Parse a line of tribble format text, and return a triple when possible. Otherwise
   * update the index.
   */
  parse(line) {
    const isTriple = /^(\d+)\s(\d+)\s(\d+)$/;
    if (isTriple.test(line)) {
      return this.parseTriple(line);
    } else {
      this.parseDeclaration(line);
      return;
    }
  }
};

// src/tribble/stringify.ts
var TribbleStringifier = class {
  stringIndex;
  constructor() {
    this.stringIndex = new IndexedSet();
  }
  /*
   * Convert a triple to tribble format and return the encoding.
   */
  stringify(triple) {
    const message = [];
    const [source, relation, target] = triple;
    for (const value of triple) {
      if (!this.stringIndex.has(value)) {
        const newId = this.stringIndex.add(value);
        const stringifiedValue = value === "null" || value === null ? JSON.stringify("null") : JSON.stringify(value.toString());
        message.push(`${newId} ${stringifiedValue}`);
      }
    }
    message.push(
      `${this.stringIndex.getIndex(source)} ${this.stringIndex.getIndex(relation)} ${this.stringIndex.getIndex(target)}`
    );
    return message.join("\n");
  }
};

// src/urn.ts
function parseUrn(urn) {
  const delimited = urn.split(":", 4);
  const type = delimited[2];
  const remainder = delimited[3];
  const idx = remainder.indexOf("?");
  const queryString = idx !== -1 ? remainder.slice(idx + 1) : "";
  const id = idx !== -1 ? remainder.slice(0, idx) : remainder;
  const qs = queryString ? Object.fromEntries(new URLSearchParams(queryString)) : {};
  return {
    type,
    id,
    qs
  };
}
function asUrn(value, namespace = "r\xF3") {
  if (typeof value !== "string" || !value.startsWith(`urn:${namespace}:`)) {
    return {
      type: "unknown",
      id: value,
      qs: {}
    };
  }
  return parseUrn(value);
}

// src/metrics.ts
var IndexPerformanceMetrics = class _IndexPerformanceMetrics {
  mapReadCount;
  constructor() {
    this.mapReadCount = 0;
  }
  mapRead() {
    this.mapReadCount++;
  }
  clone() {
    const clone = new _IndexPerformanceMetrics();
    clone.mapReadCount = this.mapReadCount;
    return clone;
  }
};
var TribbleDBPerformanceMetrics = class _TribbleDBPerformanceMetrics {
  setCheckCount;
  constructor() {
    this.setCheckCount = 0;
  }
  setCheck() {
    this.setCheckCount++;
  }
  clone() {
    const clone = new _TribbleDBPerformanceMetrics();
    clone.setCheckCount = this.setCheckCount;
    return clone;
  }
};

// src/indices/index.ts
var Index = class _Index {
  // Internal indexed representation for memory efficiency
  indexedTriples;
  // Metadata cache for efficient deletion
  tripleMetadata;
  // String indexing sets for memory efficiency
  stringIndex;
  tripleHashes;
  hashIndices;
  sourceType;
  sourceId;
  // note: QS uses a composite key: <key>=<value>
  sourceQs;
  relations;
  targetType;
  targetId;
  targetQs;
  metrics;
  stringUrn;
  constructor(triples) {
    this.indexedTriples = [];
    this.tripleMetadata = /* @__PURE__ */ new Map();
    this.stringIndex = new IndexedSet();
    this.tripleHashes = /* @__PURE__ */ new Set();
    this.hashIndices = /* @__PURE__ */ new Map();
    this.sourceType = /* @__PURE__ */ new Map();
    this.sourceId = /* @__PURE__ */ new Map();
    this.sourceQs = /* @__PURE__ */ new Map();
    this.relations = /* @__PURE__ */ new Map();
    this.targetType = /* @__PURE__ */ new Map();
    this.targetId = /* @__PURE__ */ new Map();
    this.targetQs = /* @__PURE__ */ new Map();
    this.stringUrn = /* @__PURE__ */ new Map();
    this.add(triples);
    this.metrics = new IndexPerformanceMetrics();
  }
  /*
   * Delete triples from the index
   */
  delete(triples) {
    for (let idx = 0; idx < triples.length; idx++) {
      const triple = triples[idx];
      const tripleHash = this.hashTriple(triple);
      const tripleIndex = this.hashIndices.get(tripleHash);
      if (tripleIndex === void 0) {
        continue;
      }
      this.tripleHashes.delete(tripleHash);
      this.hashIndices.delete(tripleHash);
      const metadata = this.tripleMetadata.get(tripleIndex);
      if (metadata) {
        this.sourceType.get(metadata.sourceTypeIdx)?.delete(tripleIndex);
        this.sourceId.get(metadata.sourceIdIdx)?.delete(tripleIndex);
        this.relations.get(metadata.relationIdx)?.delete(tripleIndex);
        this.targetType.get(metadata.targetTypeIdx)?.delete(tripleIndex);
        this.targetId.get(metadata.targetIdIdx)?.delete(tripleIndex);
        for (const qsIdx of metadata.sourceQsIndices) {
          this.sourceQs.get(qsIdx)?.delete(tripleIndex);
        }
        for (const qsIdx of metadata.targetQsIndices) {
          this.targetQs.get(qsIdx)?.delete(tripleIndex);
        }
        this.tripleMetadata.delete(tripleIndex);
      }
      delete this.indexedTriples[tripleIndex];
    }
  }
  /*
   * Return the triples that are absent from the index
   */
  difference(triples) {
    return triples.filter((triple) => !this.hasTriple(triple));
  }
  /*
   * Check if a triple is present in the index
   */
  hasTriple(triple) {
    return this.tripleHashes.has(this.hashTriple(triple));
  }
  /*
   * Generate a simple hash for a triple
   */
  hashTriple(triple) {
    const str = `${triple[0]}${triple[1]}${triple[2]}`;
    let hash = 0;
    for (let i = 0, len = str.length; i < len; i++) {
      const chr = str.charCodeAt(i);
      hash = (hash << 5) - hash + chr;
      hash |= 0;
    }
    return hash.toString();
  }
  /*
   * Get the index of a specific triple
   */
  getTripleIndex(triple) {
    const hash = this.hashTriple(triple);
    return this.hashIndices.get(hash);
  }
  /*
   * Add new triples to the index incrementally
   */
  add(triples) {
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
      const sourceIdx = this.stringIndex.add(source);
      const relationIdx = this.stringIndex.add(relation);
      const targetIdx = this.stringIndex.add(target);
      const sourceTypeIdx = this.stringIndex.add(parsedSource.type);
      const sourceIdIdx = this.stringIndex.add(parsedSource.id);
      const targetTypeIdx = this.stringIndex.add(parsedTarget.type);
      const targetIdIdx = this.stringIndex.add(parsedTarget.id);
      const hash = this.hashTriple(triple);
      if (this.tripleHashes.has(hash)) {
        continue;
      }
      this.tripleHashes.add(hash);
      const idx = this.indexedTriples.length;
      this.hashIndices.set(hash, idx);
      this.indexedTriples.push([sourceIdx, relationIdx, targetIdx]);
      const sourceQsIndices = [];
      const targetQsIndices = [];
      let sourceTypeSet = this.sourceType.get(sourceTypeIdx);
      if (!sourceTypeSet) {
        sourceTypeSet = /* @__PURE__ */ new Set();
        this.sourceType.set(sourceTypeIdx, sourceTypeSet);
      }
      sourceTypeSet.add(idx);
      let sourceIdSet = this.sourceId.get(sourceIdIdx);
      if (!sourceIdSet) {
        sourceIdSet = /* @__PURE__ */ new Set();
        this.sourceId.set(sourceIdIdx, sourceIdSet);
      }
      sourceIdSet.add(idx);
      for (const [key, val] of Object.entries(parsedSource.qs)) {
        const qsIdx = this.stringIndex.add(`${key}=${val}`);
        sourceQsIndices.push(qsIdx);
        let sourceQsSet = this.sourceQs.get(qsIdx);
        if (!sourceQsSet) {
          sourceQsSet = /* @__PURE__ */ new Set();
          this.sourceQs.set(qsIdx, sourceQsSet);
        }
        sourceQsSet.add(idx);
      }
      let relationSet = this.relations.get(relationIdx);
      if (!relationSet) {
        relationSet = /* @__PURE__ */ new Set();
        this.relations.set(relationIdx, relationSet);
      }
      relationSet.add(idx);
      let targetTypeSet = this.targetType.get(targetTypeIdx);
      if (!targetTypeSet) {
        targetTypeSet = /* @__PURE__ */ new Set();
        this.targetType.set(targetTypeIdx, targetTypeSet);
      }
      targetTypeSet.add(idx);
      let targetIdSet = this.targetId.get(targetIdIdx);
      if (!targetIdSet) {
        targetIdSet = /* @__PURE__ */ new Set();
        this.targetId.set(targetIdIdx, targetIdSet);
      }
      targetIdSet.add(idx);
      for (const [key, val] of Object.entries(parsedTarget.qs)) {
        const qsIdx = this.stringIndex.add(`${key}=${val}`);
        targetQsIndices.push(qsIdx);
        let targetQsSet = this.targetQs.get(qsIdx);
        if (!targetQsSet) {
          targetQsSet = /* @__PURE__ */ new Set();
          this.targetQs.set(qsIdx, targetQsSet);
        }
        targetQsSet.add(idx);
      }
      this.tripleMetadata.set(idx, {
        sourceTypeIdx,
        sourceIdIdx,
        sourceQsIndices,
        relationIdx,
        targetTypeIdx,
        targetIdIdx,
        targetQsIndices
      });
    }
  }
  /*
   * Get the number of triples in the index
   */
  get length() {
    return this.tripleHashes.size;
  }
  /*
   * Get the actual array length including gaps (for cursor index management)
   */
  get arrayLength() {
    return this.indexedTriples.length;
  }
  /*
   * Reconstruct the original triples from the indexed representation
   */
  triples() {
    return this.indexedTriples.filter((triple) => triple !== void 0).map(([sourceIdx, relationIdx, targetIdx]) => [
      this.stringIndex.getValue(sourceIdx),
      this.stringIndex.getValue(relationIdx),
      this.stringIndex.getValue(targetIdx)
    ]);
  }
  /*
   * Get a specific triple by index
   */
  getTriple(index) {
    if (index < 0 || index >= this.indexedTriples.length) {
      return void 0;
    }
    const indexedTriple = this.indexedTriples[index];
    if (!indexedTriple) {
      return void 0;
    }
    const [sourceIdx, relationIdx, targetIdx] = indexedTriple;
    return [
      this.stringIndex.getValue(sourceIdx),
      this.stringIndex.getValue(relationIdx),
      this.stringIndex.getValue(targetIdx)
    ];
  }
  /*
   * Get the string indices for a specific triple by triple index
   */
  getTripleIndices(index) {
    if (index < 0 || index >= this.indexedTriples.length) {
      return void 0;
    }
    return this.indexedTriples[index];
  }
  /*
   * Helper methods to convert string keys to indices for external API compatibility
   */
  getSourceTypeSet(type) {
    const typeIdx = this.stringIndex.getIndex(type);
    if (typeIdx === void 0) {
      return void 0;
    }
    this.metrics.mapRead();
    return this.sourceType.get(typeIdx);
  }
  getSourceIdSet(id) {
    const idIdx = this.stringIndex.getIndex(id);
    if (idIdx === void 0) {
      return void 0;
    }
    this.metrics.mapRead();
    return this.sourceId.get(idIdx);
  }
  getSourceQsSet(key, val) {
    const qsIdx = this.stringIndex.getIndex(`${key}=${val}`);
    if (qsIdx === void 0) {
      return void 0;
    }
    this.metrics.mapRead();
    return this.sourceQs.get(qsIdx);
  }
  getRelationSet(relation) {
    const relationIdx = this.stringIndex.getIndex(relation);
    if (relationIdx === void 0) {
      return void 0;
    }
    this.metrics.mapRead();
    return this.relations.get(relationIdx);
  }
  getTargetTypeSet(type) {
    const typeIdx = this.stringIndex.getIndex(type);
    if (typeIdx === void 0) {
      return void 0;
    }
    this.metrics.mapRead();
    return this.targetType.get(typeIdx);
  }
  getTargetIdSet(id) {
    const idIdx = this.stringIndex.getIndex(id);
    if (idIdx === void 0) {
      return void 0;
    }
    this.metrics.mapRead();
    return this.targetId.get(idIdx);
  }
  getTargetQsSet(key, val) {
    const qsIdx = this.stringIndex.getIndex(`${key}=${val}`);
    if (qsIdx === void 0) {
      return void 0;
    }
    this.metrics.mapRead();
    return this.targetQs.get(qsIdx);
  }
  /*
   * Deep-clone the index
   */
  clone() {
    const newIndex = new _Index([]);
    newIndex.indexedTriples = this.indexedTriples.slice();
    newIndex.tripleMetadata = new Map(this.tripleMetadata);
    newIndex.stringIndex = this.stringIndex.clone();
    newIndex.tripleHashes = new Set(this.tripleHashes);
    newIndex.hashIndices = new Map(this.hashIndices);
    const cloneMap = (original) => {
      const newMap = /* @__PURE__ */ new Map();
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
};

// src/triples.ts
var Triples = class {
  static source(triple) {
    return triple[0];
  }
  static relation(triple) {
    return triple[1];
  }
  static target(triple) {
    return triple[2];
  }
};

// src/db/search.ts
function validateInput(params) {
  const allowedKeys = ["source", "relation", "target"];
  if (!Array.isArray(params)) {
    for (const key of Object.keys(params)) {
      if (!Object.prototype.hasOwnProperty.call(params, key)) continue;
      if (!allowedKeys.includes(key)) {
        throw new Error(`Unexpected search parameter: ${key}`);
      }
    }
  }
}
function nodeTypeMatches(type, source, index) {
  const matches = source ? index.getSourceTypeSet(type) : index.getTargetTypeSet(type);
  if (matches === void 0 || matches.size === 0) {
    return /* @__PURE__ */ new Set();
  }
  return matches;
}
function nodeIdMatches(id, source, index) {
  const matches = /* @__PURE__ */ new Set();
  const ids = Array.isArray(id) ? id : [id];
  for (const subid of ids) {
    const subidRows = source ? index.getSourceIdSet(subid) : index.getTargetIdSet(subid);
    if (subidRows) {
      Sets.append(matches, subidRows);
    }
  }
  if (matches.size === 0) {
    return /* @__PURE__ */ new Set();
  }
  return matches;
}
function nodeQsMatches(qs, source, index, metrics) {
  const matches = [];
  for (const [key, val] of Object.entries(qs)) {
    const qsSet = source ? index.getSourceQsSet(key, val) : index.getTargetQsSet(key, val);
    if (typeof qsSet === "undefined") {
      return /* @__PURE__ */ new Set();
    }
    matches.push(qsSet);
  }
  return Sets.intersection(metrics, matches);
}
function nodeMatches(query, source, index, metrics, cursorIndices) {
  let typeRows = void 0;
  if (query.type) {
    typeRows = nodeTypeMatches(query.type, source, index);
    if (typeRows.size === 0) {
      return /* @__PURE__ */ new Set();
    }
  }
  let idRows = void 0;
  if (query.id) {
    idRows = nodeIdMatches(query.id, source, index);
    if (idRows.size === 0) {
      return /* @__PURE__ */ new Set();
    }
  }
  let qsRows = void 0;
  if (query.qs && Object.keys(query.qs).length > 0) {
    qsRows = nodeQsMatches(query.qs, source, index, metrics);
    if (qsRows.size === 0) {
      return /* @__PURE__ */ new Set();
    }
  }
  if (typeRows === void 0 && idRows === void 0 && qsRows === void 0) {
    const pred2 = query.predicate;
    if (!pred2) {
      return cursorIndices;
    }
    const indexCopy = /* @__PURE__ */ new Set([...cursorIndices]);
    for (const idx of indexCopy) {
      const triple = index.getTriple(idx);
      if (!triple) {
        indexCopy.delete(idx);
        continue;
      }
      if (!pred2(source ? triple[0] : triple[2])) {
        indexCopy.delete(idx);
      }
    }
    return indexCopy;
  }
  const matches = [cursorIndices];
  if (typeRows !== void 0) {
    matches.push(typeRows);
  }
  if (idRows !== void 0) {
    matches.push(idRows);
  }
  if (qsRows !== void 0) {
    matches.push(qsRows);
  }
  const matchingRows = Sets.intersection(metrics, matches);
  if (!query.predicate) {
    return matchingRows;
  }
  const pred = query.predicate;
  for (const idx of matchingRows) {
    const triple = index.getTriple(idx);
    if (!pred(source ? triple[0] : triple[2])) {
      matchingRows.delete(idx);
    }
  }
  return matchingRows;
}
function findMatchingNodes(query, source, index, metrics, cursorIndices) {
  const matches = /* @__PURE__ */ new Set();
  for (const subquery of query) {
    Sets.append(
      matches,
      nodeMatches(subquery, source, index, metrics, cursorIndices)
    );
  }
  return matches;
}
function findMatchingRelations(query, index) {
  const relations = Array.isArray(query.relation) ? query.relation : [query.relation];
  const matches = /* @__PURE__ */ new Set();
  for (const rel of relations) {
    const relationSet = index.getRelationSet(rel);
    if (relationSet) {
      Sets.append(matches, relationSet);
    }
  }
  if (!query.predicate) {
    return matches;
  }
  const pred = query.predicate;
  for (const idx of matches) {
    const triple = index.getTriple(idx);
    if (!triple) {
      matches.delete(idx);
      continue;
    }
    if (!pred(triple[1])) {
      matches.delete(idx);
    }
  }
  return matches;
}
function findMatchingRows(params, index, cursorIndices, metrics) {
  const { source, relation, target } = params;
  const matchingRowSets = [];
  if (source) {
    const input = Array.isArray(source) ? source : [source];
    const matches = findMatchingNodes(
      input,
      true,
      index,
      metrics,
      cursorIndices
    );
    matchingRowSets.push(matches);
  }
  if (relation) {
    matchingRowSets.push(findMatchingRelations(relation, index));
  }
  if (target) {
    const input = Array.isArray(target) ? target : [target];
    const matches = findMatchingNodes(
      input,
      false,
      index,
      metrics,
      cursorIndices
    );
    matchingRowSets.push(matches);
  }
  if (matchingRowSets.length === 0) {
    return cursorIndices;
  }
  return Sets.intersection(metrics, matchingRowSets);
}

// src/db/inputs.ts
function isUrn(value) {
  return value.startsWith(`urn:`);
}
function parseNodeSearch(search) {
  if (typeof search === "string") {
    return isUrn(search) ? [asUrn(search)] : [{
      type: "unknown",
      id: search
    }];
  }
  if (Array.isArray(search)) {
    return search.map((subsearch) => {
      return isUrn(subsearch) ? asUrn(subsearch) : {
        type: "unknown",
        id: subsearch
      };
    });
  }
  return [search];
}
function parseRelation(search) {
  return typeof search === "string" || Array.isArray(search) ? { relation: search } : search;
}
function parseSearch(search) {
  const source = Array.isArray(search) ? search[0] : search.source;
  const relation = Array.isArray(search) ? search[1] : search.relation;
  const target = Array.isArray(search) ? search[2] : search.target;
  const out = {};
  if (source) {
    out.source = parseNodeSearch(source);
  }
  if (relation) {
    out.relation = parseRelation(relation);
  }
  if (target) {
    out.target = parseNodeSearch(target);
  }
  return out;
}

// src/tribble-db.ts
var TribbleDB = class _TribbleDB {
  index;
  triplesCount;
  cursorIndices;
  metrics;
  validations;
  constructor(triples, validations = {}) {
    this.index = new Index(triples);
    this.triplesCount = this.index.length;
    this.cursorIndices = /* @__PURE__ */ new Set();
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
  clone() {
    const clonedDB = new _TribbleDB([]);
    clonedDB.index = this.index;
    clonedDB.triplesCount = this.triplesCount;
    clonedDB.cursorIndices = this.cursorIndices;
    clonedDB.metrics = this.metrics;
    return clonedDB;
  }
  /*
   * Convert an array of triples to a TribbleDB.
   */
  static of(triples) {
    return new _TribbleDB(triples);
  }
  /*
   * Convert an array of TripleObject instances to a TribbleDB.
   *
   * @param objects - An array of TripleObject instances.
   *
   * @returns A TribbleDB instance.
   */
  static from(objects) {
    const triples = [];
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
    return new _TribbleDB(triples);
  }
  /*
   * Validate triples against the provided validation functions.
   *
   * @param triples - An array of triples to validate.
   */
  validateTriples(triples) {
    const messages = [];
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
      throw new Error(`Triple validation failed:
- ${messages.join("\n- ")}`);
    }
  }
  /**
   * Add new triples to the database.
   *
   * @param triples - An array of triples to add.
   */
  add(triples) {
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
  map(fn) {
    return new _TribbleDB(this.index.triples().map(fn));
  }
  /**
   * Flatmap over the triples in the database. This can be used to add new triples
   * to a copy of the database.
   *
   * @param fn - A mapping function.
   * @returns A new TribbleDB instance containing the flat-mapped triples.
   */
  flatMap(fn) {
    const flatMappedTriples = this.index.triples().flatMap(fn);
    const newDb = new _TribbleDB([]);
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
  deduplicateTriples(triples) {
    const seen = /* @__PURE__ */ new Set();
    const result = [];
    for (const triple of triples) {
      const hash = this.index.hashTriple(triple);
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
  searchFlatmap(search, fn) {
    const searchResults = this.search(search);
    const matchingTriples = searchResults.triples();
    const transformedTriples = matchingTriples.flatMap(fn);
    const deduplicatedTransformed = this.deduplicateTriples(transformedTriples);
    const originalHashMap = /* @__PURE__ */ new Map();
    for (const triple of matchingTriples) {
      const hash = this.index.hashTriple(triple);
      originalHashMap.set(hash, triple);
    }
    const transformedHashMap = /* @__PURE__ */ new Map();
    for (const triple of deduplicatedTransformed) {
      const hash = this.index.hashTriple(triple);
      transformedHashMap.set(hash, triple);
    }
    const triplesToDelete = [];
    const triplesToAdd = [];
    for (const [hash, triple] of originalHashMap) {
      if (!transformedHashMap.has(hash)) {
        triplesToDelete.push(triple);
      }
    }
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
  firstTriple() {
    return this.index.length > 0 ? this.index.getTriple(0) : void 0;
  }
  /*
   * Get the first source in the database.
   */
  firstSource() {
    const first = this.firstTriple();
    return first ? Triples.source(first) : void 0;
  }
  /**
   * Get the first relation in the database.
   */
  firstRelation() {
    const first = this.firstTriple();
    return first ? Triples.relation(first) : void 0;
  }
  /**
   * Get the first target in the database.
   */
  firstTarget() {
    const first = this.firstTriple();
    return first ? Triples.target(first) : void 0;
  }
  /*
   * Get the first object in the database.
   */
  firstObject(listOnly = false) {
    let firstId = void 0;
    const obj = {};
    for (const [source, relation, target] of this.index.triples()) {
      if (firstId === void 0) {
        firstId = source;
        obj.id = source;
      }
      if (firstId !== source) {
        continue;
      }
      if (!obj[relation]) {
        obj[relation] = listOnly ? [target] : target;
      } else if (Array.isArray(obj[relation])) {
        if (!obj[relation].includes(target)) {
          obj[relation].push(target);
        }
      } else {
        obj[relation] = obj[relation] === target ? obj[relation] : [obj[relation], target];
      }
    }
    return Object.keys(obj).length > 0 ? obj : void 0;
  }
  /*
   * Get all triples in the database.
   *
   * @returns An array of all triples.
   */
  triples() {
    return this.index.triples();
  }
  /**
   * Get all unique sources in the database.
   *
   * @returns A set of all unique sources.
   */
  sources() {
    return new Set(
      this.index.triples().map(Triples.source)
    );
  }
  /**
   * Get all unique relations in the database.
   *
   * @returns A set of all unique relations.
   */
  relations() {
    return new Set(
      this.index.triples().map(Triples.relation)
    );
  }
  /**
   * Get all unique targets in the database.
   *
   * @returns A set of all unique targets.
   */
  targets() {
    return new Set(
      this.index.triples().map(Triples.target)
    );
  }
  /*
   * Get all unique objects represented by the triples.
   *
   * @returns An array of unique TripleObject instances.
   */
  objects(listOnly = false) {
    const output = [];
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
  #object(listOnly = false) {
    const objs = {};
    for (const [source, relation, target] of this.index.triples()) {
      if (!objs[source]) {
        objs[source] = { id: source };
      }
      const relationRef = objs[source][relation];
      if (!relationRef) {
        objs[source][relation] = listOnly ? [target] : target;
      } else if (Array.isArray(relationRef)) {
        if (!relationRef.includes(target)) {
          relationRef.push(target);
        }
      } else {
        objs[source][relation] = relationRef === target ? relationRef : [relationRef, target];
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
  search(params) {
    const parsed = parseSearch(params);
    validateInput(parsed);
    const matchingTriples = [];
    for (const rowIdx of findMatchingRows(
      parsed,
      this.index,
      this.cursorIndices,
      this.metrics
    )) {
      const triple = this.index.getTriple(rowIdx);
      if (triple !== void 0) {
        matchingTriples.push(triple);
      }
    }
    return new _TribbleDB(matchingTriples);
  }
  /*
   * Get performance metrics for the database.
   */
  getMetrics() {
    return {
      index: this.index.metrics,
      db: this.metrics
    };
  }
  /*
   * Read a single object from the data by urn. If not a urn, the
   * value is used as an id and the type is the default type `unknown`. By default,
   * query-strings are disregarded.
   */
  readThing(urn, opts = { qs: false }) {
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
  readThings(urns, opts = { qs: false }) {
    const results = [];
    for (const urn of urns) {
      const thing = this.readThing(urn, opts);
      if (thing !== void 0) {
        results.push(thing);
      }
    }
    return results;
  }
  /*
   * Read and parse a triple object. On missing data or parse failure return undefined (or throw an exception)
   */
  parseThing(parser, urn, opts = { qs: false }) {
    const thing = this.readThing(urn, opts);
    if (thing) {
      return parser(thing);
    } else {
      return void 0;
    }
  }
  /*
   * Read and parse a collection of triple objects. Skip over missing data or parse failures.
   */
  parseThings(parser, urns, opts = { qs: false }) {
    const results = [];
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
  merge(other) {
    this.add(other.triples());
    return this;
  }
  /*
   * Delete triples from the database.
   *
   * @param triples - An array of triples to delete.
   * @returns This TribbleDB instance.
   */
  delete(triples) {
    const indicesToDelete = /* @__PURE__ */ new Set();
    for (const triple of triples) {
      const tripleIndex = this.index.getTripleIndex(triple);
      if (tripleIndex !== void 0) {
        indicesToDelete.add(tripleIndex);
      }
    }
    this.index.delete(triples);
    this.triplesCount = this.index.length;
    for (const idx of indicesToDelete) {
      this.cursorIndices.delete(idx);
    }
    return this;
  }
};
export {
  TribbleDB,
  TribbleParser,
  TribbleStringifier,
  asUrn,
  parseUrn
};
