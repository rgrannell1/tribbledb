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
  const remainder = delimited[3] ?? "";
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

// src/hash.ts
function hashTriple(triple) {
  const [src, rel, tgt] = triple;
  let hashValue = 0;
  for (let i = 0; i < src.length; i++) {
    hashValue = (hashValue << 5) - hashValue + src.charCodeAt(i);
    hashValue |= 0;
  }
  for (let i = 0; i < rel.length; i++) {
    hashValue = (hashValue << 5) - hashValue + rel.charCodeAt(i);
    hashValue |= 0;
  }
  for (let i = 0; i < tgt.length; i++) {
    hashValue = (hashValue << 5) - hashValue + tgt.charCodeAt(i);
    hashValue |= 0;
  }
  return hashValue.toString();
}

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
      const tripleHash = hashTriple(triple);
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
        this.relations.get(metadata.relation)?.delete(tripleIndex);
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
    return this.tripleHashes.has(hashTriple(triple));
  }
  /*
   * Get the index of a specific triple
   */
  getTripleIndex(triple) {
    const hash = hashTriple(triple);
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
      const targetIdx = this.stringIndex.add(target);
      const sourceTypeIdx = this.stringIndex.add(parsedSource.type);
      const sourceIdIdx = this.stringIndex.add(parsedSource.id);
      const targetTypeIdx = this.stringIndex.add(parsedTarget.type);
      const targetIdIdx = this.stringIndex.add(parsedTarget.id);
      const hash = hashTriple(triple);
      if (this.tripleHashes.has(hash)) {
        continue;
      }
      this.tripleHashes.add(hash);
      const idx = this.indexedTriples.length;
      this.hashIndices.set(hash, idx);
      this.indexedTriples.push([sourceIdx, relation, targetIdx]);
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
      let relationSet = this.relations.get(relation);
      if (!relationSet) {
        relationSet = /* @__PURE__ */ new Set();
        this.relations.set(relation, relationSet);
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
        relation,
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
    return this.indexedTriples.filter((triple) => triple !== void 0).map(([sourceIdx, relation, targetIdx]) => [
      this.stringIndex.getValue(sourceIdx),
      relation,
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
    const [sourceIdx, relation, targetIdx] = indexedTriple;
    return [
      this.stringIndex.getValue(sourceIdx),
      relation,
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
    this.metrics.mapRead();
    return this.relations.get(relation);
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
    const cloneRelationMap = (original) => {
      const newMap = /* @__PURE__ */ new Map();
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
};

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
  validations;
  constructor(triples, validations = {}) {
    this.index = new Index(triples);
    this.validations = validations;
  }
  static of(triples) {
    return new _TribbleDB(triples);
  }
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
  add(triples) {
    this.validateTriples(triples);
    this.index.add(triples);
  }
  delete(triples) {
    this.index.delete(triples);
    return this;
  }
  triples() {
    return this.index.triples();
  }
  sources() {
    const sources = /* @__PURE__ */ new Set();
    const allTriples = this.index.triples();
    for (const [source] of allTriples) {
      sources.add(source);
    }
    return sources;
  }
  relations() {
    const relations = /* @__PURE__ */ new Set();
    const allTriples = this.index.triples();
    for (const [, relation] of allTriples) {
      relations.add(relation);
    }
    return relations;
  }
  targets() {
    const targets = /* @__PURE__ */ new Set();
    const allTriples = this.index.triples();
    for (const [, , target] of allTriples) {
      targets.add(target);
    }
    return targets;
  }
  firstTriple() {
    const allTriples = this.triples();
    return allTriples.length > 0 ? allTriples[0] : void 0;
  }
  firstSource() {
    return this.index.getTriple(0)?.[0];
  }
  firstRelation() {
    return this.index.getTriple(0)?.[1];
  }
  firstTarget() {
    return this.index.getTriple(0)?.[2];
  }
  firstObject(listOnly = false) {
    let firstId = void 0;
    const obj = {};
    for (const [source, relationName, target] of this.index.triples()) {
      if (firstId === void 0) {
        firstId = source;
        obj.id = source;
      }
      if (firstId !== source) {
        continue;
      }
      if (!Object.prototype.hasOwnProperty.call(obj, relationName)) {
        obj[relationName] = listOnly ? [target] : target;
      } else if (Array.isArray(obj[relationName])) {
        if (!obj[relationName].includes(target)) {
          obj[relationName].push(target);
        }
      } else {
        obj[relationName] = obj[relationName] === target ? obj[relationName] : [obj[relationName], target];
      }
    }
    return Object.keys(obj).length > 0 ? obj : void 0;
  }
  objects(listOnly = false) {
    const objs = /* @__PURE__ */ new Map();
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
        obj[relationName] = relationRef === target ? relationRef : [relationRef, target];
      }
    }
    return Array.from(objs.values());
  }
  map(fnc) {
    return new _TribbleDB(this.triples().map(fnc));
  }
  flatMap(fnc) {
    return new _TribbleDB(this.triples().flatMap(fnc));
  }
  deduplicateTriples(triples) {
    const seen = /* @__PURE__ */ new Set();
    const result = [];
    for (const triple of triples) {
      const tripleHash = hashTriple(triple);
      if (!seen.has(tripleHash)) {
        seen.add(tripleHash);
        result.push(triple);
      }
    }
    return result;
  }
  merge(other) {
    this.add(other.triples());
    return this;
  }
  clone() {
    return new _TribbleDB(this.triples(), this.validations);
  }
  readThing(urn, opts = { qs: false }) {
    const allTriples = this.triples();
    const matchingTriples = [];
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
    if (matchingTriples.length === 0) return void 0;
    const obj = { id: matchingTriples[0][0] };
    for (const [, relation, target] of matchingTriples) {
      if (!Object.prototype.hasOwnProperty.call(obj, relation)) {
        obj[relation] = target;
      } else if (Array.isArray(obj[relation])) {
        if (!obj[relation].includes(target)) {
          obj[relation].push(target);
        }
      } else {
        obj[relation] = [obj[relation], target];
      }
    }
    return obj;
  }
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
  parseThing(parser, urn, opts = { qs: false }) {
    const thing = this.readThing(urn, opts);
    return thing ? parser(thing) : void 0;
  }
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
  intersectSets(set1, set2) {
    const result = /* @__PURE__ */ new Set();
    for (const item of set1) {
      if (set2.has(item)) {
        result.add(item);
      }
    }
    return result;
  }
  search(params) {
    const parsed = parseSearch(params);
    if (!parsed.source && !parsed.relation && !parsed.target) {
      return new _TribbleDB(this.triples(), this.validations);
    }
    let candidateIndices = null;
    if (parsed.relation) {
      const relationNames = Array.isArray(parsed.relation.relation) ? parsed.relation.relation : [parsed.relation.relation];
      if (relationNames.length > 0) {
        candidateIndices = /* @__PURE__ */ new Set();
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
    if (parsed.source) {
      const sourceIds = this.getTripleIndicesForNodeQueries(
        parsed.source,
        "source"
      );
      if (candidateIndices === null) {
        candidateIndices = sourceIds;
      } else {
        const intersection = /* @__PURE__ */ new Set();
        for (const idx of candidateIndices) {
          if (sourceIds.has(idx)) {
            intersection.add(idx);
          }
        }
        candidateIndices = intersection;
      }
    }
    if (parsed.target) {
      const targetIds = this.getTripleIndicesForNodeQueries(
        parsed.target,
        "target"
      );
      if (candidateIndices === null) {
        candidateIndices = targetIds;
      } else {
        const intersection = /* @__PURE__ */ new Set();
        for (const idx of candidateIndices) {
          if (targetIds.has(idx)) {
            intersection.add(idx);
          }
        }
        candidateIndices = intersection;
      }
    }
    if (candidateIndices === null || candidateIndices.size === 0) {
      return new _TribbleDB([], this.validations);
    }
    const matchingTriples = [];
    for (const tripleIdx of candidateIndices) {
      const triple = this.index.getTriple(tripleIdx);
      if (!triple) continue;
      const [source, relation, target] = triple;
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
    return new _TribbleDB(matchingTriples, this.validations);
  }
  getTripleIndicesForNodeQueries(queries, position) {
    const result = /* @__PURE__ */ new Set();
    for (const query of queries) {
      const hasIndexableConstraints = query.type !== void 0 || query.id !== void 0 || query.qs !== void 0 && Object.keys(query.qs).length > 0;
      if (!hasIndexableConstraints) {
        for (let idx = 0; idx < this.index.arrayLength; idx++) {
          result.add(idx);
        }
        continue;
      }
      const queryMatches = [];
      if (query.type !== void 0) {
        const typeSet = position === "source" ? this.index.getSourceTypeSet(query.type) : this.index.getTargetTypeSet(query.type);
        if (typeSet) {
          queryMatches.push(typeSet);
        } else {
          continue;
        }
      }
      if (query.id !== void 0) {
        const ids = Array.isArray(query.id) ? query.id : [query.id];
        const idUnion = /* @__PURE__ */ new Set();
        for (const nodeId of ids) {
          const idSet = position === "source" ? this.index.getSourceIdSet(nodeId) : this.index.getTargetIdSet(nodeId);
          if (idSet) {
            for (const idx of idSet) {
              idUnion.add(idx);
            }
          }
        }
        if (idUnion.size > 0) {
          queryMatches.push(idUnion);
        } else {
          continue;
        }
      }
      if (query.qs !== void 0) {
        const qsKeys = Object.keys(query.qs);
        if (qsKeys.length > 0) {
          const qsSets = [];
          for (const key of qsKeys) {
            const qsSet = position === "source" ? this.index.getSourceQsSet(key, query.qs[key]) : this.index.getTargetQsSet(key, query.qs[key]);
            if (qsSet) {
              qsSets.push(qsSet);
            } else {
              qsSets.length = 0;
              break;
            }
          }
          if (qsSets.length > 0) {
            let qsIntersection = qsSets[0];
            for (let idx = 1; idx < qsSets.length; idx++) {
              qsIntersection = this.intersectSets(qsIntersection, qsSets[idx]);
              if (qsIntersection.size === 0) break;
            }
            queryMatches.push(qsIntersection);
          } else {
            continue;
          }
        }
      }
      if (queryMatches.length === 0) {
        continue;
      }
      let queryResult = queryMatches[0];
      for (let idx = 1; idx < queryMatches.length; idx++) {
        queryResult = this.intersectSets(queryResult, queryMatches[idx]);
        if (queryResult.size === 0) break;
      }
      for (const idx of queryResult) {
        result.add(idx);
      }
    }
    return result;
  }
  searchTriples(params) {
    const parsed = parseSearch(params);
    if (!parsed.source && !parsed.relation && !parsed.target) {
      return this.triples();
    }
    let candidateIndices = null;
    if (parsed.relation) {
      const relationNames = Array.isArray(parsed.relation.relation) ? parsed.relation.relation : [parsed.relation.relation];
      if (relationNames.length > 0) {
        candidateIndices = /* @__PURE__ */ new Set();
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
    if (parsed.source) {
      const sourceIds = this.getTripleIndicesForNodeQueries(
        parsed.source,
        "source"
      );
      if (candidateIndices === null) {
        candidateIndices = sourceIds;
      } else {
        const intersection = /* @__PURE__ */ new Set();
        for (const idx of candidateIndices) {
          if (sourceIds.has(idx)) {
            intersection.add(idx);
          }
        }
        candidateIndices = intersection;
      }
    }
    if (parsed.target) {
      const targetIds = this.getTripleIndicesForNodeQueries(
        parsed.target,
        "target"
      );
      if (candidateIndices === null) {
        candidateIndices = targetIds;
      } else {
        const intersection = /* @__PURE__ */ new Set();
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
    const matchingTriples = [];
    for (const tripleIdx of candidateIndices) {
      const triple = this.index.getTriple(tripleIdx);
      if (!triple) continue;
      const [source, relation, target] = triple;
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
  searchFlatmap(search, fnc) {
    const matchingTriples = this.searchTriples(search);
    const transformedTriples = matchingTriples.flatMap(fnc);
    const originalHashes = /* @__PURE__ */ new Set();
    const transformedHashes = /* @__PURE__ */ new Set();
    const transformedByHash = /* @__PURE__ */ new Map();
    for (const triple of matchingTriples) {
      originalHashes.add(hashTriple(triple));
    }
    for (const triple of transformedTriples) {
      const hash = hashTriple(triple);
      transformedHashes.add(hash);
      transformedByHash.set(hash, triple);
    }
    const triplesToDelete = [];
    for (const triple of matchingTriples) {
      const hash = hashTriple(triple);
      if (!transformedHashes.has(hash)) {
        triplesToDelete.push(triple);
      }
    }
    const triplesToAdd = [];
    for (const hash of transformedHashes) {
      if (!originalHashes.has(hash)) {
        triplesToAdd.push(transformedByHash.get(hash));
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
  get triplesCount() {
    return this.index.length;
  }
};
export {
  TribbleDB,
  TribbleParser,
  TribbleStringifier,
  asUrn,
  parseUrn
};
