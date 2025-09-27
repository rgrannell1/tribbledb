// src/sets.ts
var IndexedSet = class {
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
};

// src/tribble/parse.ts
var TribbleParser = class {
  stringIndex;
  constructor() {
    this.stringIndex = new IndexedSet();
  }
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
  parseDeclaration(line) {
    const match = line.match(/^(\d+) "(.*)"$/);
    if (!match) {
      throw new SyntaxError(`Invalid format for declaration line: ${line}`);
    }
    const id = match[1];
    const value = match[2];
    this.stringIndex.setIndex(value, parseInt(id, 10));
  }
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
  stringify(triple) {
    const message = [];
    const [source, relation, target] = triple;
    for (const value of [source, relation, target]) {
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

// src/metrics.ts
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

// src/indices/index.ts
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
  stringUrn;
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
    this.stringUrn = /* @__PURE__ */ new Map();
    this.add(triples);
    this.metrics = new IndexPerformanceMetrics();
  }
  /*
   * Add new triples to the index incrementally
   */
  add(triples) {
    const startIdx = this.indexedTriples.length;
    for (let jdx = 0; jdx < triples.length; jdx++) {
      const idx = startIdx + jdx;
      const triple = triples[jdx];
      const parsedSource = this.stringUrn.has(triple[0]) ? this.stringUrn.get(triple[0]) : this.stringUrn.set(triple[0], asUrn(triple[0])).get(triple[0]);
      const relation = triple[1];
      const parsedTarget = this.stringUrn.has(triple[2]) ? this.stringUrn.get(triple[2]) : this.stringUrn.set(triple[2], asUrn(triple[2])).get(triple[2]);
      const sourceTypeIdx = this.stringIndex.add(parsedSource.type);
      const sourceIdIdx = this.stringIndex.add(parsedSource.id);
      const relationIdx = this.stringIndex.add(relation);
      const targetTypeIdx = this.stringIndex.add(parsedTarget.type);
      const targetIdIdx = this.stringIndex.add(parsedTarget.id);
      this.indexedTriples.push([
        this.stringIndex.add(triple[0]),
        relationIdx,
        this.stringIndex.add(triple[2])
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

// src/tribble-db.ts
function joinSubqueryResults(metrics, acc, tripleResult) {
  const joinedNames = acc.names.concat(tripleResult.names);
  if (acc.rows.length === 0 || tripleResult.rows.length === 0) {
    return {
      names: joinedNames,
      rows: []
    };
  }
  const endings = /* @__PURE__ */ new Map();
  const starts = /* @__PURE__ */ new Map();
  for (let idx = 0; idx < acc.rows.length; idx++) {
    const refId = acc.rows[idx][2];
    if (!endings.has(refId)) {
      endings.set(refId, []);
    }
    endings.get(refId).push(idx);
  }
  for (let idx = 0; idx < tripleResult.rows.length; idx++) {
    const refId = tripleResult.rows[idx][0];
    if (!starts.has(refId)) {
      starts.set(refId, []);
    }
    starts.get(refId).push(idx);
  }
  const commonLinks = Sets.intersection(metrics, [
    new Set(endings.keys()),
    new Set(starts.keys())
  ]);
  const joinedRows = [];
  for (const link of commonLinks) {
    const startRowIndices = starts.get(link);
    const endRowsIndices = endings.get(link);
    for (const startRowIndex of startRowIndices) {
      for (const endRowIndex of endRowsIndices) {
        const joinedRow = acc.rows[startRowIndex].concat(
          tripleResult.rows[endRowIndex]
        );
        joinedRows.push(joinedRow);
      }
    }
  }
  return {
    names: joinedNames,
    rows: joinedRows
  };
}
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
    const output = [];
    for (const [id, obj] of Object.entries(this.object(listOnly))) {
      obj.id = id;
      output.push(obj);
    }
    return output;
  }
  /*
   * yes, this is a bad name given firstObject.
   */
  object(listOnly = false) {
    const objs = {};
    for (const [source, relation, target] of this.index.triples()) {
      if (!objs[source]) {
        objs[source] = { id: source };
      }
      if (!objs[source][relation]) {
        objs[source][relation] = listOnly ? [target] : target;
      } else if (Array.isArray(objs[source][relation])) {
        objs[source][relation].push(target);
      } else {
        objs[source][relation] = [objs[source][relation], target];
      }
    }
    return objs;
  }
  #findMatchingRows(params) {
    const matchingRowSets = [
      this.cursorIndices
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
          return /* @__PURE__ */ new Set();
        }
      }
      if (source.id) {
        const sourceIdSet = this.index.getSourceIdSet(source.id);
        if (sourceIdSet) {
          matchingRowSets.push(sourceIdSet);
        } else {
          return /* @__PURE__ */ new Set();
        }
      }
      if (source.qs) {
        for (const [key, val] of Object.entries(source.qs)) {
          const sourceQsSet = this.index.getSourceQsSet(key, val);
          if (sourceQsSet) {
            matchingRowSets.push(sourceQsSet);
          } else {
            return /* @__PURE__ */ new Set();
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
          return /* @__PURE__ */ new Set();
        }
      }
      if (target.id) {
        const targetIdSet = this.index.getTargetIdSet(target.id);
        if (targetIdSet) {
          matchingRowSets.push(targetIdSet);
        } else {
          return /* @__PURE__ */ new Set();
        }
      }
      if (target.qs) {
        for (const [key, val] of Object.entries(target.qs)) {
          const targetQsSet = this.index.getTargetQsSet(key, val);
          if (targetQsSet) {
            matchingRowSets.push(targetQsSet);
          } else {
            return /* @__PURE__ */ new Set();
          }
        }
      }
    }
    if (relation) {
      const relationDsl = typeof relation === "string" ? { relation: [relation] } : relation;
      if (relationDsl.relation) {
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
          return /* @__PURE__ */ new Set();
        }
      }
    }
    const intersection = Sets.intersection(this.metrics, matchingRowSets);
    const matchingTriples = /* @__PURE__ */ new Set();
    for (const index of intersection) {
      const triple = this.index.getTriple(index);
      if (!source?.predicate && !target?.predicate && !(typeof relation === "object" && relation.predicate)) {
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
  search(params) {
    const matchingTriples = [];
    for (const rowIdx of this.#findMatchingRows(params)) {
      const triple = this.index.getTriple(rowIdx);
      if (triple) {
        matchingTriples.push(triple);
      }
    }
    return new _TribbleDB(matchingTriples);
  }
  search2(query) {
    const bindings = Object.entries(query);
    const subqueryResults = [];
    for (let idx = 0; idx < bindings.length - 2; idx += 2) {
      const tripleSlice = bindings.slice(idx, idx + 3);
      const pattern = {
        source: tripleSlice[0][1],
        relation: tripleSlice[1][1],
        target: tripleSlice[2][1]
      };
      const bindingNames = tripleSlice.map((pair) => pair[0]);
      const tripleRows = this.#findMatchingRows(pattern);
      const rowData = Array.from(tripleRows).flatMap((row) => {
        const contents = this.index.getTripleIndices(row);
        return typeof contents === "undefined" ? [] : [contents];
      });
      subqueryResults.push({
        names: bindingNames,
        rows: rowData
      });
    }
    const queryResult = subqueryResults.reduce(
      joinSubqueryResults.bind(this, this.metrics)
    );
    const outputNames = queryResult.names;
    const objects = [];
    for (const row of queryResult.rows) {
      const data = {};
      for (let idx = 0; idx < outputNames.length; idx++) {
        const label = outputNames[idx];
        data[label] = this.index.stringIndex.getValue(row[idx]);
      }
      objects.push(data);
    }
    return objects;
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
  TribbleParser,
  TribbleStringifier,
  asUrn,
  parseUrn
};
