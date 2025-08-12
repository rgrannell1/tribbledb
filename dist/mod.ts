// urn.ts
function parseUrn(urn, namespace = "r\xF3") {
  if (!urn.startsWith(`urn:${namespace}:`)) {
    throw new Error(`Invalid URN for namespace ${namespace}: ${urn}`);
  }
  const type = urn.split(":")[2];
  const [urnPart, queryString] = urn.split("?");
  const id = urnPart.split(":")[3];
  const qs = queryString ? Object.fromEntries(new URLSearchParams(queryString)) : {};
  return {
    type,
    id,
    qs
  };
}
function asUrn(value, namespace = "r\xF3") {
  try {
    return parseUrn(value, namespace);
  } catch (_) {
    return {
      type: "unknown",
      id: value,
      qs: {}
    };
  }
}

// triples.ts
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

// sets.ts
var IndexedSet = class {
  #idx;
  #map;
  #reverseMap;
  constructor() {
    this.#idx = 0;
    this.#map = /* @__PURE__ */ new Map();
    this.#reverseMap = /* @__PURE__ */ new Map();
  }
  map() {
    return this.#map;
  }
  reverseMap() {
    return this.#reverseMap;
  }
  add(value) {
    if (this.#map.has(value)) {
      return this.#map.get(value);
    }
    this.#map.set(value, this.#idx);
    this.#reverseMap.set(this.#idx, value);
    this.#idx++;
    return this.#idx - 1;
  }
  getIndex(value) {
    return this.#map.get(value);
  }
  getValue(idx) {
    return this.#reverseMap.get(idx);
  }
  has(value) {
    return this.#map.has(value);
  }
};
var Sets = class {
  /*
   * Compute the intersection of multiple numeric sets.
   * The number of sets will be low (we're not adding ninety
   * query parameters to these URNs) so first sort the
   * sets in ascending size. This could be done much, much more
   * efficiently with a dataset that allows cheap intersections though...TODO
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
};

// metrics.ts
var IndexPerformanceMetrics = class {
  mapReadCount;
  constructor() {
    this.mapReadCount = 0;
  }
  mapRead() {
    this.mapReadCount++;
  }
};
var TribbleDBPerformanceMetrics = class {
  setCheckCount;
  constructor() {
    this.setCheckCount = 0;
  }
  setCheck() {
    this.setCheckCount++;
  }
};

// triple-index.ts
var Index = class {
  // Internal indexed representation for memory efficiency
  indexedTriples;
  // String indexing sets for memory efficiency
  stringIndex;
  sourceType;
  sourceId;
  // note: QS uses a composite key: <key>=<value>
  sourceQs;
  relations;
  targetType;
  targetId;
  targetQs;
  metrics;
  constructor(triples) {
    this.indexedTriples = [];
    this.stringIndex = new IndexedSet();
    this.sourceType = /* @__PURE__ */ new Map();
    this.sourceId = /* @__PURE__ */ new Map();
    this.sourceQs = /* @__PURE__ */ new Map();
    this.relations = /* @__PURE__ */ new Map();
    this.targetType = /* @__PURE__ */ new Map();
    this.targetId = /* @__PURE__ */ new Map();
    this.targetQs = /* @__PURE__ */ new Map();
    this.indexTriples(triples);
    this.metrics = new IndexPerformanceMetrics();
  }
  /*
   * Associate each triple onto an appropriate map `Term := <id>: <value>`
   */
  indexTriples(triples) {
    for (let idx = 0; idx < triples.length; idx++) {
      this.indexTriple(triples[idx], idx);
    }
  }
  /*
   * Index a single triple at the given index position
   */
  indexTriple(triple, idx) {
    const parsedSource = asUrn(Triples.source(triple));
    const relation = Triples.relation(triple);
    const parsedTarget = asUrn(Triples.target(triple));
    const sourceTypeIdx = this.stringIndex.add(parsedSource.type);
    const sourceIdIdx = this.stringIndex.add(parsedSource.id);
    const relationIdx = this.stringIndex.add(relation);
    const targetTypeIdx = this.stringIndex.add(parsedTarget.type);
    const targetIdIdx = this.stringIndex.add(parsedTarget.id);
    this.indexedTriples.push([
      this.stringIndex.add(Triples.source(triple)),
      relationIdx,
      this.stringIndex.add(Triples.target(triple))
    ]);
    if (!this.sourceType.has(sourceTypeIdx)) {
      this.sourceType.set(sourceTypeIdx, /* @__PURE__ */ new Set());
    }
    this.sourceType.get(sourceTypeIdx).add(idx);
    if (!this.sourceId.has(sourceIdIdx)) {
      this.sourceId.set(sourceIdIdx, /* @__PURE__ */ new Set());
    }
    this.sourceId.get(sourceIdIdx).add(idx);
    for (const [key, val] of Object.entries(parsedSource.qs)) {
      const qsIdx = this.stringIndex.add(`${key}=${val}`);
      if (!this.sourceQs.has(qsIdx)) {
        this.sourceQs.set(qsIdx, /* @__PURE__ */ new Set());
      }
      this.sourceQs.get(qsIdx).add(idx);
    }
    if (!this.relations.has(relationIdx)) {
      this.relations.set(relationIdx, /* @__PURE__ */ new Set());
    }
    this.relations.get(relationIdx).add(idx);
    if (!this.targetType.has(targetTypeIdx)) {
      this.targetType.set(targetTypeIdx, /* @__PURE__ */ new Set());
    }
    this.targetType.get(targetTypeIdx).add(idx);
    if (!this.targetId.has(targetIdIdx)) {
      this.targetId.set(targetIdIdx, /* @__PURE__ */ new Set());
    }
    this.targetId.get(targetIdIdx).add(idx);
    for (const [key, val] of Object.entries(parsedTarget.qs)) {
      const qsIdx = this.stringIndex.add(`${key}=${val}`);
      if (!this.targetQs.has(qsIdx)) {
        this.targetQs.set(qsIdx, /* @__PURE__ */ new Set());
      }
      this.targetQs.get(qsIdx).add(idx);
    }
  }
  /*
   * Add new triples to the index incrementally
   */
  add(newTriples) {
    const startIdx = this.indexedTriples.length;
    for (let idx = 0; idx < newTriples.length; idx++) {
      this.indexTriple(newTriples[idx], startIdx + idx);
    }
  }
  /*
   * Get the number of triples in the index
   */
  get length() {
    return this.indexedTriples.length;
  }
  /*
   * Reconstruct the original triples from the indexed representation
   */
  triples() {
    return this.indexedTriples.map(([sourceIdx, relationIdx, targetIdx]) => [
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
    const [sourceIdx, relationIdx, targetIdx] = this.indexedTriples[index];
    return [
      this.stringIndex.getValue(sourceIdx),
      this.stringIndex.getValue(relationIdx),
      this.stringIndex.getValue(targetIdx)
    ];
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
};

// tribble-db.ts
var TribbleDB = class _TribbleDB {
  index;
  triplesCount;
  tripleRows;
  metrics;
  constructor(triples) {
    this.index = new Index(triples);
    this.triplesCount = this.index.length;
    this.tripleRows = /* @__PURE__ */ new Set();
    this.metrics = new TribbleDBPerformanceMetrics();
    for (let idx = 0; idx < this.triplesCount; idx++) {
      this.tripleRows.add(idx);
    }
  }
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
  /**
   * Add new triples to the database.
   *
   * @param triples - An array of triples to add.
   */
  add(triples) {
    const oldLength = this.index.length;
    this.index.add(triples);
    this.triplesCount = this.index.length;
    for (let idx = oldLength; idx < this.triplesCount; idx++) {
      this.tripleRows.add(idx);
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
   * Flat map over the triples in the database.
   *
   * @param fn - A mapping function.
   * @returns A new TribbleDB instance containing the flat-mapped triples.
   */
  flatMap(fn) {
    const flatMappedTriples = this.index.triples().flatMap(fn);
    return new _TribbleDB(flatMappedTriples);
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
    return this.objects(listOnly)[0];
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
    const objs = {};
    for (const [source, relation, target] of this.index.triples()) {
      if (!objs[source]) {
        objs[source] = {};
      }
      if (!objs[source][relation]) {
        objs[source][relation] = listOnly ? [target] : target;
      } else if (Array.isArray(objs[source][relation])) {
        objs[source][relation].push(target);
      } else {
        objs[source][relation] = [objs[source][relation], target];
      }
    }
    const output = [];
    for (const [id, obj] of Object.entries(objs)) {
      obj.id = id;
      output.push(obj);
    }
    return output;
  }
  /*
   * Search all triples in the database.
   *
   * @param params - The search parameters.
   * @returns A new TribbleDB instance containing the matching triples.
   */
  search(params) {
    const matchingRowSets = [
      this.tripleRows
    ];
    const { source, relation, target } = params;
    if (typeof source === "undefined" && typeof target === "undefined" && typeof relation === "undefined") {
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
          return new _TribbleDB([]);
        }
      }
      if (source.id) {
        const sourceIdSet = this.index.getSourceIdSet(source.id);
        if (sourceIdSet) {
          matchingRowSets.push(sourceIdSet);
        } else {
          return new _TribbleDB([]);
        }
      }
      if (source.qs) {
        for (const [key, val] of Object.entries(source.qs)) {
          const sourceQsSet = this.index.getSourceQsSet(key, val);
          if (sourceQsSet) {
            matchingRowSets.push(sourceQsSet);
          } else {
            return new _TribbleDB([]);
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
          return new _TribbleDB([]);
        }
      }
      if (target.id) {
        const targetIdSet = this.index.getTargetIdSet(target.id);
        if (targetIdSet) {
          matchingRowSets.push(targetIdSet);
        } else {
          return new _TribbleDB([]);
        }
      }
      if (target.qs) {
        for (const [key, val] of Object.entries(target.qs)) {
          const targetQsSet = this.index.getTargetQsSet(key, val);
          if (targetQsSet) {
            matchingRowSets.push(targetQsSet);
          } else {
            return new _TribbleDB([]);
          }
        }
      }
    }
    if (relation) {
      const relationDsl = typeof relation === "string" ? { relation: [relation] } : relation;
      const unionedRelations = /* @__PURE__ */ new Set();
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
        return new _TribbleDB([]);
      }
    }
    const intersection = Sets.intersection(this.metrics, matchingRowSets);
    const matchingTriples = [];
    for (const index of intersection) {
      const triple = this.index.getTriple(index);
      if (!source?.predicate && !target?.predicate && !(typeof relation === "object" && relation.predicate)) {
        matchingTriples.push(triple);
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
        matchingTriples.push(triple);
      }
    }
    return new _TribbleDB(matchingTriples);
  }
  getMetrics() {
    return {
      index: this.index.metrics,
      db: this.metrics
    };
  }
};
export {
  TribbleDB,
  asUrn,
  parseUrn
};
