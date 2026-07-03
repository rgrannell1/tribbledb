// src/urn.ts
function parseQueryString(queryString) {
  if (queryString === "") {
    return {};
  }
  const split = queryString.split("&");
  const result = {};
  for (const pair of split) {
    const [key, value] = pair.split("=");
    result[key] = value.indexOf("%") !== -1 ? decodeURIComponent(value) : value;
  }
  return result;
}
function parseUrn(urn) {
  const delimited = urn.split(":", 4);
  const type = delimited[2];
  const remainder = delimited[3] ?? "";
  const idx = remainder.indexOf("?");
  const queryString = idx !== -1 ? remainder.slice(idx + 1) : "";
  const id = idx !== -1 ? remainder.slice(0, idx) : remainder;
  const qs = queryString ? parseQueryString(queryString) : {};
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

// src/v2/interner.ts
var Interner = class {
  #ids;
  #values;
  #maxIds;
  constructor(maxIds) {
    this.#ids = /* @__PURE__ */ new Map();
    this.#values = [];
    this.#maxIds = maxIds;
  }
  /*
   * Intern a string, returning its id. Idempotent.
   */
  intern(value) {
    const existing = this.#ids.get(value);
    if (existing !== void 0) {
      return existing;
    }
    const id = this.#values.length;
    if (id >= this.#maxIds) {
      throw new Error(`Interner exceeded ${this.#maxIds} distinct strings.`);
    }
    this.#ids.set(value, id);
    this.#values.push(value);
    return id;
  }
  /*
   * Look up the id of a string without interning it.
   */
  idOf(value) {
    return this.#ids.get(value);
  }
  /*
   * Resolve an id back to its string.
   */
  valueOf(id) {
    return this.#values[id];
  }
  get size() {
    return this.#values.length;
  }
};

// src/v2/constants.ts
var MAX_NODE_IDS = 2 ** 28;
var MAX_RELATION_IDS = 2 ** 25;
var TARGET_PACK_SPAN = 2 ** 28;

// src/v2/store.ts
function addPosting(lists, key, row) {
  let rows = lists.get(key);
  if (!rows) {
    rows = /* @__PURE__ */ new Set();
    lists.set(key, rows);
  }
  rows.add(row);
}
var TripleStore = class {
  nodes;
  relationNames;
  // parallel columns; row = position
  sourceIds;
  relationIds;
  targetIds;
  // exact identity: sourceId -> (relationId * TARGET_PACK_SPAN + targetId) -> row
  identity;
  // tombstoned rows; column data is retained for live views
  deletedRows;
  // URN components per distinct node, parsed once at intern time
  nodeMeta;
  // row-level posting lists (the only per-triple index writes)
  rowsBySource;
  rowsByTarget;
  rowsByRelation;
  // node-level posting lists, populated once per distinct URN
  nodesByType;
  nodesById;
  nodesByQs;
  constructor() {
    this.nodes = new Interner(MAX_NODE_IDS);
    this.relationNames = new Interner(MAX_RELATION_IDS);
    this.sourceIds = [];
    this.relationIds = [];
    this.targetIds = [];
    this.identity = /* @__PURE__ */ new Map();
    this.deletedRows = /* @__PURE__ */ new Set();
    this.nodeMeta = /* @__PURE__ */ new Map();
    this.rowsBySource = /* @__PURE__ */ new Map();
    this.rowsByTarget = /* @__PURE__ */ new Map();
    this.rowsByRelation = /* @__PURE__ */ new Map();
    this.nodesByType = /* @__PURE__ */ new Map();
    this.nodesById = /* @__PURE__ */ new Map();
    this.nodesByQs = /* @__PURE__ */ new Map();
  }
  /*
   * Intern a node string; on first sight AS A NODE, parse its URN
   * components and register it in the node-level indices. The interner is
   * shared with URN components (types, id parts, qs pairs), so presence
   * in the interner alone does not imply node metadata exists — a string
   * can be seen as a component before appearing as a node.
   */
  internNode(value) {
    const nodeId = this.nodes.intern(value);
    if (this.nodeMeta.has(nodeId)) {
      return nodeId;
    }
    const parsed = asUrn(value);
    const typeId = this.nodes.intern(parsed.type);
    const idId = this.nodes.intern(parsed.id);
    const qsIds = [];
    for (const [qsKey, qsValue] of Object.entries(parsed.qs)) {
      const qsId = this.nodes.intern(`${qsKey}=${qsValue}`);
      qsIds.push(qsId);
      addPosting(this.nodesByQs, qsId, nodeId);
    }
    this.nodeMeta.set(nodeId, { typeId, idId, qsIds });
    addPosting(this.nodesByType, typeId, nodeId);
    addPosting(this.nodesById, idId, nodeId);
    return nodeId;
  }
  identityKey(relationId, targetId) {
    return relationId * TARGET_PACK_SPAN + targetId;
  }
  /*
   * Find the row of an exact triple, dead or alive.
   */
  rowOf(sourceId, relationId, targetId) {
    const inner = this.identity.get(sourceId);
    return inner?.get(this.identityKey(relationId, targetId));
  }
  hasTriple(triple) {
    const sourceId = this.nodes.idOf(triple[0]);
    const relationId = this.relationNames.idOf(triple[1]);
    const targetId = this.nodes.idOf(triple[2]);
    if (sourceId === void 0 || relationId === void 0) {
      return false;
    }
    if (targetId === void 0) {
      return false;
    }
    return this.rowOf(sourceId, relationId, targetId) !== void 0;
  }
  /*
   * Add one triple. Returns true when the triple was new.
   */
  addTriple(triple) {
    return this.addRowByIds(
      this.internNode(triple[0]),
      this.relationNames.intern(triple[1]),
      this.internNode(triple[2])
    );
  }
  /*
   * Add one triple by already-interned ids (the bulk-load fast path).
   * Returns true when the triple was new.
   */
  addRowByIds(sourceId, relationId, targetId) {
    let inner = this.identity.get(sourceId);
    if (!inner) {
      inner = /* @__PURE__ */ new Map();
      this.identity.set(sourceId, inner);
    }
    const innerKey = this.identityKey(relationId, targetId);
    if (inner.has(innerKey)) {
      return false;
    }
    const row = this.sourceIds.length;
    inner.set(innerKey, row);
    this.sourceIds.push(sourceId);
    this.relationIds.push(relationId);
    this.targetIds.push(targetId);
    addPosting(this.rowsBySource, sourceId, row);
    addPosting(this.rowsByTarget, targetId, row);
    addPosting(this.rowsByRelation, relationId, row);
    return true;
  }
  /*
   * Tombstone one triple. Returns true when it was present and alive.
   * Column data and posting lists are intentionally left intact.
   */
  deleteTriple(triple) {
    const sourceId = this.nodes.idOf(triple[0]);
    const relationId = this.relationNames.idOf(triple[1]);
    const targetId = this.nodes.idOf(triple[2]);
    if (sourceId === void 0 || relationId === void 0) {
      return false;
    }
    if (targetId === void 0) {
      return false;
    }
    const inner = this.identity.get(sourceId);
    const innerKey = this.identityKey(relationId, targetId);
    const row = inner?.get(innerKey);
    if (row === void 0) {
      return false;
    }
    inner.delete(innerKey);
    this.deletedRows.add(row);
    return true;
  }
  isAlive(row) {
    return !this.deletedRows.has(row);
  }
  /*
   * Total rows including tombstones.
   */
  get rowCount() {
    return this.sourceIds.length;
  }
  get aliveCount() {
    return this.sourceIds.length - this.deletedRows.size;
  }
  resolveRow(row) {
    return [
      this.nodes.valueOf(this.sourceIds[row]),
      this.relationNames.valueOf(this.relationIds[row]),
      this.nodes.valueOf(this.targetIds[row])
    ];
  }
};

// src/v2/search.ts
function subqueryRows(store, query, isSource) {
  const hasQs = query.qs !== void 0 && Object.keys(query.qs).length > 0;
  const indexable = query.type !== void 0 || query.id !== void 0 || hasQs;
  if (!indexable) {
    return "unconstrained";
  }
  const nodeSets = [];
  if (query.type !== void 0) {
    const typeId = store.nodes.idOf(query.type);
    const nodes = typeId === void 0 ? void 0 : store.nodesByType.get(typeId);
    if (!nodes) {
      return "no-match";
    }
    nodeSets.push(nodes);
  }
  if (query.id !== void 0) {
    const wantedIds = Array.isArray(query.id) ? query.id : [query.id];
    const idUnion = /* @__PURE__ */ new Set();
    for (const wantedId of wantedIds) {
      const idId = store.nodes.idOf(wantedId);
      const nodes = idId === void 0 ? void 0 : store.nodesById.get(idId);
      if (nodes) {
        for (const nodeId of nodes) {
          idUnion.add(nodeId);
        }
      }
    }
    if (idUnion.size === 0) {
      return "no-match";
    }
    nodeSets.push(idUnion);
  }
  if (hasQs) {
    for (const [qsKey, qsValue] of Object.entries(query.qs ?? {})) {
      const compositeId = store.nodes.idOf(`${qsKey}=${qsValue}`);
      const nodes = compositeId === void 0 ? void 0 : store.nodesByQs.get(compositeId);
      if (!nodes) {
        return "no-match";
      }
      nodeSets.push(nodes);
    }
  }
  const matchedNodes = intersectAll(nodeSets);
  const adjacency = isSource ? store.rowsBySource : store.rowsByTarget;
  const rows = /* @__PURE__ */ new Set();
  for (const nodeId of matchedNodes) {
    const nodeRows = adjacency.get(nodeId);
    if (nodeRows) {
      for (const row of nodeRows) {
        rows.add(row);
      }
    }
  }
  return rows;
}
function intersectAll(sets) {
  sets.sort((setA, setB) => setA.size - setB.size);
  const result = /* @__PURE__ */ new Set();
  const [smallest, ...rest] = sets;
  outer: for (const row of smallest) {
    for (const other of rest) {
      if (!other.has(row)) {
        continue outer;
      }
    }
    result.add(row);
  }
  return result;
}
function positionRows(store, queries, isSource) {
  const union = /* @__PURE__ */ new Set();
  for (const query of queries) {
    const rows = subqueryRows(store, query, isSource);
    if (rows === "unconstrained") {
      return "unconstrained";
    }
    if (rows === "no-match") {
      continue;
    }
    for (const row of rows) {
      union.add(row);
    }
  }
  return union;
}
function relationRows(store, relations) {
  const names = Array.isArray(relations) ? relations : [relations];
  if (names.length === 0) {
    return "skip";
  }
  const union = /* @__PURE__ */ new Set();
  for (const name of names) {
    const relationId = store.relationNames.idOf(name);
    const rows = relationId === void 0 ? void 0 : store.rowsByRelation.get(relationId);
    if (rows) {
      for (const row of rows) {
        union.add(row);
      }
    }
  }
  return union;
}
function passesNodePredicates(queries, value) {
  for (const query of queries) {
    if (!query.predicate || query.predicate(value)) {
      return true;
    }
  }
  return false;
}
function baseRowsIterable(store, baseRows) {
  if (baseRows !== null) {
    return baseRows;
  }
  return (function* liveRows() {
    for (let row = 0; row < store.rowCount; row++) {
      if (store.isAlive(row)) {
        yield row;
      }
    }
  })();
}
function executeSearch(store, parsed, baseRows) {
  const constraints = [];
  if (parsed.source) {
    constraints.push(positionRows(store, parsed.source, true));
  }
  if (parsed.relation) {
    constraints.push(relationRows(store, parsed.relation.relation));
  }
  if (parsed.target) {
    constraints.push(positionRows(store, parsed.target, false));
  }
  const indexSets = constraints.filter((rows) => rows instanceof Set);
  const hasUnconstrained = constraints.includes("unconstrained");
  let candidates;
  if (indexSets.length > 0) {
    candidates = intersectAll(indexSets);
  } else if (hasUnconstrained || constraints.length === 0) {
    candidates = baseRowsIterable(store, baseRows);
  } else {
    return /* @__PURE__ */ new Set();
  }
  const matched = [];
  for (const row of candidates) {
    if (indexSets.length > 0) {
      if (baseRows !== null) {
        if (!baseRows.has(row)) continue;
      } else if (!store.isAlive(row)) {
        continue;
      }
    }
    if (parsed.source) {
      const source = store.nodes.valueOf(store.sourceIds[row]);
      if (!passesNodePredicates(parsed.source, source)) continue;
    }
    if (parsed.relation?.predicate) {
      const relation = store.relationNames.valueOf(store.relationIds[row]);
      if (!parsed.relation.predicate(relation)) continue;
    }
    if (parsed.target) {
      const target = store.nodes.valueOf(store.targetIds[row]);
      if (!passesNodePredicates(parsed.target, target)) continue;
    }
    matched.push(row);
  }
  matched.sort((rowA, rowB) => rowA - rowB);
  return new Set(matched);
}

// src/v2/bulk.ts
var QUOTE_CHAR_CODE = 34;
function isDigits(text, from, to) {
  if (to <= from) {
    return false;
  }
  for (let idx = from; idx < to; idx++) {
    const code = text.charCodeAt(idx);
    if (code < 48 || code > 57) {
      return false;
    }
  }
  return true;
}
function parseDigits(line, from, to, kind) {
  if (!isDigits(line, from, to)) {
    throw new SyntaxError(`Invalid format for ${kind} line: ${line}`);
  }
  return parseInt(line.slice(from, to), 10);
}
function loadTribbleLines(store, lines, validations) {
  const dictValues = [];
  const dictNodeIds = [];
  const dictRelationIds = [];
  const hasValidators = Object.keys(validations).length > 0;
  const failures = [];
  for (const line of lines) {
    if (line.length === 0) {
      continue;
    }
    if (line.charCodeAt(line.length - 1) === QUOTE_CHAR_CODE) {
      const spaceIdx = line.indexOf(' "');
      if (spaceIdx === -1) {
        throw new SyntaxError(`Invalid format for declaration line: ${line}`);
      }
      const dictId = parseDigits(line, 0, spaceIdx, "declaration");
      dictValues[dictId] = line.slice(spaceIdx + 2, line.length - 1);
      dictNodeIds[dictId] = void 0;
      dictRelationIds[dictId] = void 0;
      continue;
    }
    const firstSpace = line.indexOf(" ");
    const secondSpace = line.indexOf(" ", firstSpace + 1);
    if (firstSpace === -1 || secondSpace === -1) {
      throw new SyntaxError(`Invalid format for triple line: ${line}`);
    }
    const srcDict = parseDigits(line, 0, firstSpace, "triple");
    const relDict = parseDigits(line, firstSpace + 1, secondSpace, "triple");
    const tgtDict = parseDigits(line, secondSpace + 1, line.length, "triple");
    const srcValue = dictValues[srcDict];
    const relValue = dictValues[relDict];
    const tgtValue = dictValues[tgtDict];
    if (srcValue === void 0 || relValue === void 0 || tgtValue === void 0) {
      throw new SyntaxError(`Invalid triple reference: ${line}`);
    }
    let sourceId = dictNodeIds[srcDict];
    if (sourceId === void 0) {
      sourceId = store.internNode(srcValue);
      dictNodeIds[srcDict] = sourceId;
    }
    let relationId = dictRelationIds[relDict];
    if (relationId === void 0) {
      relationId = store.relationNames.intern(relValue);
      dictRelationIds[relDict] = relationId;
    }
    let targetId = dictNodeIds[tgtDict];
    if (targetId === void 0) {
      targetId = store.internNode(tgtValue);
      dictNodeIds[tgtDict] = targetId;
    }
    if (hasValidators) {
      const validator = validations[relValue];
      if (validator) {
        const meta = store.nodeMeta.get(sourceId);
        const sourceType = store.nodes.valueOf(meta.typeId);
        const res = validator(sourceType, relValue, tgtValue);
        if (typeof res === "string") {
          failures.push(res);
        }
      }
    }
    store.addRowByIds(sourceId, relationId, targetId);
  }
  if (failures.length > 0) {
    throw new Error(`Triple validation failed:
- ${failures.join("\n- ")}`);
  }
}

// src/v2/traverse.ts
function isRowVisible(visibility, row) {
  if (visibility.rows !== null) {
    return visibility.rows.has(row);
  }
  return visibility.store.isAlive(row);
}
function matchesNodeQuery(store, nodeId, query) {
  const meta = store.nodeMeta.get(nodeId);
  if (!meta) {
    return false;
  }
  if (query.type !== void 0) {
    if (store.nodes.idOf(query.type) !== meta.typeId) {
      return false;
    }
  }
  if (query.id !== void 0) {
    const wanted = Array.isArray(query.id) ? query.id : [query.id];
    const matched = wanted.some((candidate) => {
      return store.nodes.idOf(candidate) === meta.idId;
    });
    if (!matched) {
      return false;
    }
  }
  if (query.qs !== void 0) {
    for (const [qsKey, qsValue] of Object.entries(query.qs)) {
      const compositeId = store.nodes.idOf(`${qsKey}=${qsValue}`);
      if (compositeId === void 0 || !meta.qsIds.includes(compositeId)) {
        return false;
      }
    }
  }
  if (query.predicate && !query.predicate(store.nodes.valueOf(nodeId))) {
    return false;
  }
  return true;
}
function resolveSelector(visibility, selector) {
  const { store } = visibility;
  if (typeof selector === "string") {
    return resolveUrns(store, [selector]);
  }
  if (Array.isArray(selector)) {
    return resolveUrns(store, selector);
  }
  if (selector instanceof Set) {
    return resolveUrns(store, selector);
  }
  return resolveQuery(store, selector);
}
function resolveUrns(store, urns) {
  const nodeIds = /* @__PURE__ */ new Set();
  for (const urn of urns) {
    const nodeId = store.nodes.idOf(urn);
    if (nodeId !== void 0 && store.nodeMeta.has(nodeId)) {
      nodeIds.add(nodeId);
    }
  }
  return nodeIds;
}
function resolveQuery(store, query) {
  let candidates = void 0;
  if (query.type !== void 0) {
    const typeId = store.nodes.idOf(query.type);
    candidates = typeId === void 0 ? [] : store.nodesByType.get(typeId) ?? [];
  } else if (query.id !== void 0) {
    const wanted = Array.isArray(query.id) ? query.id : [query.id];
    const union = /* @__PURE__ */ new Set();
    for (const candidateId of wanted) {
      const idId = store.nodes.idOf(candidateId);
      const nodeIds = idId === void 0 ? void 0 : store.nodesById.get(idId);
      if (nodeIds) {
        for (const nodeId of nodeIds) {
          union.add(nodeId);
        }
      }
    }
    candidates = union;
  } else {
    candidates = store.nodeMeta.keys();
  }
  const matched = /* @__PURE__ */ new Set();
  for (const nodeId of candidates) {
    if (matchesNodeQuery(store, nodeId, query)) {
      matched.add(nodeId);
    }
  }
  return matched;
}
function resolveRelationIds(store, relations) {
  if (relations === void 0) {
    return null;
  }
  const names = Array.isArray(relations) ? relations : [relations];
  const relationIds = /* @__PURE__ */ new Set();
  for (const name of names) {
    const relationId = store.relationNames.idOf(name);
    if (relationId !== void 0) {
      relationIds.add(relationId);
    }
  }
  return relationIds;
}
function* hopFromNode(visibility, nodeId, forward, relationIds, where) {
  const { store } = visibility;
  const adjacency = forward ? store.rowsBySource.get(nodeId) : store.rowsByTarget.get(nodeId);
  if (!adjacency) {
    return;
  }
  for (const row of adjacency) {
    if (!isRowVisible(visibility, row)) {
      continue;
    }
    if (relationIds !== null && !relationIds.has(store.relationIds[row])) {
      continue;
    }
    const reached = forward ? store.targetIds[row] : store.sourceIds[row];
    if (where !== void 0 && !matchesNodeQuery(store, reached, where)) {
      continue;
    }
    yield reached;
  }
}
function hopOnce(visibility, frontier, forward, relationIds, where) {
  const reached = /* @__PURE__ */ new Set();
  for (const nodeId of frontier) {
    for (const nextId of hopFromNode(
      visibility,
      nodeId,
      forward,
      relationIds,
      where
    )) {
      reached.add(nextId);
    }
  }
  return reached;
}
function hop(visibility, startNodes, forward, relations, opts = {}) {
  const relationIds = resolveRelationIds(visibility.store, relations);
  if (!opts.transitive) {
    return hopOnce(visibility, startNodes, forward, relationIds, opts.where);
  }
  const reachable = /* @__PURE__ */ new Set();
  let frontier = startNodes;
  while (frontier.size > 0) {
    const next = hopOnce(
      visibility,
      frontier,
      forward,
      relationIds,
      opts.where
    );
    const fresh = /* @__PURE__ */ new Set();
    for (const nodeId of next) {
      if (!reachable.has(nodeId)) {
        reachable.add(nodeId);
        fresh.add(nodeId);
      }
    }
    frontier = fresh;
  }
  return reachable;
}
function hasOutgoingRelation(visibility, nodeId, relation) {
  const { store } = visibility;
  const relationId = store.relationNames.idOf(relation);
  if (relationId === void 0) {
    return false;
  }
  const adjacency = store.rowsBySource.get(nodeId);
  if (!adjacency) {
    return false;
  }
  for (const row of adjacency) {
    if (store.relationIds[row] === relationId && isRowVisible(visibility, row)) {
      return true;
    }
  }
  return false;
}
function buildNodeObject(visibility, nodeId) {
  const { store } = visibility;
  const adjacency = store.rowsBySource.get(nodeId);
  if (!adjacency) {
    return void 0;
  }
  const rows = [...adjacency].filter((row) => isRowVisible(visibility, row)).sort((rowA, rowB) => rowA - rowB);
  if (rows.length === 0) {
    return void 0;
  }
  const obj = { id: store.nodes.valueOf(nodeId) };
  for (const row of rows) {
    const relation = store.relationNames.valueOf(store.relationIds[row]);
    const target = store.nodes.valueOf(store.targetIds[row]);
    const existing = obj[relation];
    if (existing === void 0) {
      obj[relation] = [target];
    } else if (!existing.includes(target)) {
      existing.push(target);
    }
  }
  return obj;
}
var NodeView = class _NodeView {
  visibility;
  nodeIds;
  constructor(visibility, nodeIds) {
    this.visibility = visibility;
    this.nodeIds = nodeIds;
  }
  follow(relations, opts = {}) {
    const reached = hop(this.visibility, this.nodeIds, true, relations, opts);
    return new _NodeView(this.visibility, reached);
  }
  referencedBy(relations, opts = {}) {
    const reached = hop(this.visibility, this.nodeIds, false, relations, opts);
    return new _NodeView(this.visibility, reached);
  }
  filter(query) {
    const { has, lacks, ...nodeQuery } = query;
    const kept = /* @__PURE__ */ new Set();
    for (const nodeId of this.nodeIds) {
      if (!matchesNodeQuery(this.visibility.store, nodeId, nodeQuery)) {
        continue;
      }
      if (has !== void 0 && !hasOutgoingRelation(this.visibility, nodeId, has)) {
        continue;
      }
      if (lacks !== void 0 && hasOutgoingRelation(this.visibility, nodeId, lacks)) {
        continue;
      }
      kept.add(nodeId);
    }
    return new _NodeView(this.visibility, kept);
  }
  union(other) {
    this.assertSameStore(other);
    const combined = new Set(this.nodeIds);
    for (const nodeId of other.nodeIds) {
      combined.add(nodeId);
    }
    return new _NodeView(this.visibility, combined);
  }
  intersect(other) {
    this.assertSameStore(other);
    const kept = /* @__PURE__ */ new Set();
    for (const nodeId of this.nodeIds) {
      if (other.nodeIds.has(nodeId)) {
        kept.add(nodeId);
      }
    }
    return new _NodeView(this.visibility, kept);
  }
  subtract(other) {
    this.assertSameStore(other);
    const kept = /* @__PURE__ */ new Set();
    for (const nodeId of this.nodeIds) {
      if (!other.nodeIds.has(nodeId)) {
        kept.add(nodeId);
      }
    }
    return new _NodeView(this.visibility, kept);
  }
  assertSameStore(other) {
    if (other.visibility.store !== this.visibility.store) {
      throw new Error("Cannot combine NodeViews from different databases.");
    }
  }
  sortedNodeIds() {
    return [...this.nodeIds].sort((idA, idB) => idA - idB);
  }
  urns() {
    const { store } = this.visibility;
    const result = /* @__PURE__ */ new Set();
    for (const nodeId of this.sortedNodeIds()) {
      result.add(store.nodes.valueOf(nodeId));
    }
    return result;
  }
  /*
   * The id components of the nodes; qs-variant URNs collapse onto one id.
   */
  ids() {
    const { store } = this.visibility;
    const result = /* @__PURE__ */ new Set();
    for (const nodeId of this.sortedNodeIds()) {
      const meta = store.nodeMeta.get(nodeId);
      result.add(store.nodes.valueOf(meta.idId));
    }
    return result;
  }
  count() {
    return this.nodeIds.size;
  }
  has(urn) {
    const nodeId = this.visibility.store.nodes.idOf(urn);
    return nodeId !== void 0 && this.nodeIds.has(nodeId);
  }
  /*
   * Materialise nodes with visible outgoing edges as array-valued objects.
   */
  objects() {
    const result = [];
    for (const nodeId of this.sortedNodeIds()) {
      const obj = buildNodeObject(this.visibility, nodeId);
      if (obj) {
        result.push(obj);
      }
    }
    return result;
  }
  /*
   * As objects(), keyed by URN. Nodes with no visible outgoing edges are
   * absent keys, so "not found" is distinguishable from "empty".
   */
  objectsById() {
    const { store } = this.visibility;
    const result = /* @__PURE__ */ new Map();
    for (const nodeId of this.sortedNodeIds()) {
      const obj = buildNodeObject(this.visibility, nodeId);
      if (obj) {
        result.set(store.nodes.valueOf(nodeId), obj);
      }
    }
    return result;
  }
};
var PathView = class _PathView {
  visibility;
  endToStarts;
  constructor(visibility, endToStarts) {
    this.visibility = visibility;
    this.endToStarts = endToStarts;
  }
  static fromNodes(visibility, nodeIds) {
    const endToStarts = /* @__PURE__ */ new Map();
    for (const nodeId of nodeIds) {
      endToStarts.set(nodeId, /* @__PURE__ */ new Set([nodeId]));
    }
    return new _PathView(visibility, endToStarts);
  }
  follow(relations, opts = {}) {
    if (!opts.transitive) {
      return new _PathView(
        this.visibility,
        this.followOnce(this.endToStarts, relations, opts)
      );
    }
    const accumulated = /* @__PURE__ */ new Map();
    let frontier = this.endToStarts;
    while (frontier.size > 0) {
      const next = this.followOnce(frontier, relations, opts);
      const fresh = /* @__PURE__ */ new Map();
      for (const [endId, startIds] of next) {
        let known = accumulated.get(endId);
        if (!known) {
          known = /* @__PURE__ */ new Set();
          accumulated.set(endId, known);
        }
        const freshStarts = /* @__PURE__ */ new Set();
        for (const startId of startIds) {
          if (!known.has(startId)) {
            known.add(startId);
            freshStarts.add(startId);
          }
        }
        if (freshStarts.size > 0) {
          fresh.set(endId, freshStarts);
        }
      }
      frontier = fresh;
    }
    return new _PathView(this.visibility, accumulated);
  }
  followOnce(frontier, relations, opts = {}) {
    const relationIds = resolveRelationIds(this.visibility.store, relations);
    const next = /* @__PURE__ */ new Map();
    for (const [endId, startIds] of frontier) {
      const reached = hopOnce(
        this.visibility,
        /* @__PURE__ */ new Set([endId]),
        true,
        relationIds,
        opts.where
      );
      for (const reachedId of reached) {
        let starts = next.get(reachedId);
        if (!starts) {
          starts = /* @__PURE__ */ new Set();
          next.set(reachedId, starts);
        }
        for (const startId of startIds) {
          starts.add(startId);
        }
      }
    }
    return next;
  }
  pairs() {
    const { store } = this.visibility;
    const result = [];
    const sortedEnds = [...this.endToStarts.keys()].sort(
      (idA, idB) => idA - idB
    );
    for (const endId of sortedEnds) {
      const startIds = [...this.endToStarts.get(endId)].sort(
        (idA, idB) => idA - idB
      );
      for (const startId of startIds) {
        result.push([store.nodes.valueOf(startId), store.nodes.valueOf(endId)]);
      }
    }
    return result;
  }
};

// src/v2/db.ts
var TRIPLE_KEY_SEPARATOR = "\0";
function tripleKey(triple) {
  return triple.join(TRIPLE_KEY_SEPARATOR);
}
function wantsArrays(opts) {
  return typeof opts === "boolean" ? opts : opts.arrays ?? false;
}
function wantsIgnoreQs(opts) {
  return opts.ignoreQs ?? opts.qs ?? false;
}
function accumulateRelation(obj, relation, target, arrays, dedupeScalar = true) {
  const existing = obj[relation];
  if (existing === void 0) {
    obj[relation] = arrays ? [target] : target;
  } else if (Array.isArray(existing)) {
    if (!existing.includes(target)) {
      existing.push(target);
    }
  } else if (!dedupeScalar || existing !== target) {
    obj[relation] = [existing, target];
  }
}
var TribbleDB = class _TribbleDB {
  store;
  // null = live root database; a Set = frozen view over the shared store
  rows;
  validations;
  constructor(triples, validations = {}) {
    this.store = new TripleStore();
    this.rows = null;
    this.validations = validations;
    this.add(triples);
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
  /*
   * Bulk-load tribble-format lines (declarations + integer triples),
   * feeding the format's dictionary directly into the intern tables.
   * Considerably faster than parsing lines to string triples and add()ing.
   */
  static fromTribbleLines(lines, validations = {}) {
    const db = new _TribbleDB([], validations);
    loadTribbleLines(db.store, lines, validations);
    return db;
  }
  static view(store, rows, validations) {
    const db = Object.create(_TribbleDB.prototype);
    db.store = store;
    db.rows = rows;
    db.validations = validations;
    return db;
  }
  visibility() {
    return { store: this.store, rows: this.rows };
  }
  *visibleRows() {
    if (this.rows !== null) {
      yield* this.rows;
      return;
    }
    for (let row = 0; row < this.store.rowCount; row++) {
      if (this.store.isAlive(row)) {
        yield row;
      }
    }
  }
  /*
   * Copy-on-write: a view about to be mutated first becomes a root
   * database over its own store.
   */
  ensureOwned() {
    if (this.rows === null) {
      return;
    }
    const owned = new TripleStore();
    for (const triple of this.triples()) {
      owned.addTriple(triple);
    }
    this.store = owned;
    this.rows = null;
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
    this.ensureOwned();
    let added = 0;
    for (const triple of triples) {
      if (this.store.addTriple(triple)) {
        added++;
      }
    }
    return { added, duplicates: triples.length - added };
  }
  delete(triples) {
    this.ensureOwned();
    for (const triple of triples) {
      this.store.deleteTriple(triple);
    }
    return this;
  }
  triples() {
    const result = [];
    for (const row of this.visibleRows()) {
      result.push(this.store.resolveRow(row));
    }
    return result;
  }
  uniqueTerms(column) {
    const termIds = /* @__PURE__ */ new Set();
    for (const row of this.visibleRows()) {
      termIds.add(column[row]);
    }
    const terms = /* @__PURE__ */ new Set();
    for (const termId of termIds) {
      terms.add(this.store.nodes.valueOf(termId));
    }
    return terms;
  }
  sources() {
    return this.uniqueTerms(this.store.sourceIds);
  }
  relations() {
    const relationIds = /* @__PURE__ */ new Set();
    for (const row of this.visibleRows()) {
      relationIds.add(this.store.relationIds[row]);
    }
    const names = /* @__PURE__ */ new Set();
    for (const relationId of relationIds) {
      names.add(this.store.relationNames.valueOf(relationId));
    }
    return names;
  }
  targets() {
    return this.uniqueTerms(this.store.targetIds);
  }
  /*
   * First triple in insertion order. Unlike v1, this skips deleted rows
   * rather than returning undefined once row zero is deleted.
   */
  firstTriple() {
    for (const row of this.visibleRows()) {
      return this.store.resolveRow(row);
    }
    return void 0;
  }
  firstSource() {
    return this.firstTriple()?.[0];
  }
  firstRelation() {
    return this.firstTriple()?.[1];
  }
  firstTarget() {
    return this.firstTriple()?.[2];
  }
  firstObject(opts = false) {
    const arrays = wantsArrays(opts);
    let firstId = void 0;
    const obj = {};
    for (const row of this.visibleRows()) {
      const sourceId = this.store.sourceIds[row];
      if (firstId === void 0) {
        firstId = sourceId;
        obj.id = this.store.nodes.valueOf(sourceId);
      }
      if (sourceId !== firstId) {
        continue;
      }
      accumulateRelation(
        obj,
        this.store.relationNames.valueOf(this.store.relationIds[row]),
        this.store.nodes.valueOf(this.store.targetIds[row]),
        arrays
      );
    }
    return firstId === void 0 ? void 0 : obj;
  }
  objects(opts = false) {
    const arrays = wantsArrays(opts);
    const objs = /* @__PURE__ */ new Map();
    for (const row of this.visibleRows()) {
      const sourceId = this.store.sourceIds[row];
      let obj = objs.get(sourceId);
      if (!obj) {
        obj = { id: this.store.nodes.valueOf(sourceId) };
        objs.set(sourceId, obj);
      }
      accumulateRelation(
        obj,
        this.store.relationNames.valueOf(this.store.relationIds[row]),
        this.store.nodes.valueOf(this.store.targetIds[row]),
        arrays
      );
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
      const key = tripleKey(triple);
      if (!seen.has(key)) {
        seen.add(key);
        result.push(triple);
      }
    }
    return result;
  }
  /*
   * Mutating merge, as in v1. Prefer mergedWith() for a pure combination.
   */
  merge(other) {
    this.add(other.triples());
    return this;
  }
  mergedWith(other) {
    const combined = new _TribbleDB(this.triples(), this.validations);
    combined.add(other.triples());
    return combined;
  }
  clone() {
    return new _TribbleDB(this.triples(), this.validations);
  }
  rowsForUrn(urn, ignoreQs) {
    let candidate;
    if (!ignoreQs) {
      const nodeId = this.store.nodes.idOf(urn);
      candidate = nodeId === void 0 ? void 0 : this.store.rowsBySource.get(nodeId);
    } else {
      const { type, id } = asUrn(urn);
      const typeId = this.store.nodes.idOf(type);
      const idId = this.store.nodes.idOf(id);
      const typeNodes = typeId === void 0 ? void 0 : this.store.nodesByType.get(typeId);
      const idNodes = idId === void 0 ? void 0 : this.store.nodesById.get(idId);
      if (typeNodes && idNodes) {
        candidate = /* @__PURE__ */ new Set();
        const [small, large] = typeNodes.size <= idNodes.size ? [typeNodes, idNodes] : [idNodes, typeNodes];
        for (const nodeId of small) {
          if (!large.has(nodeId)) {
            continue;
          }
          const nodeRows = this.store.rowsBySource.get(nodeId);
          if (nodeRows) {
            for (const row of nodeRows) {
              candidate.add(row);
            }
          }
        }
      }
    }
    if (!candidate) {
      return [];
    }
    const visible = [];
    for (const row of candidate) {
      if (this.rows !== null ? this.rows.has(row) : this.store.isAlive(row)) {
        visible.push(row);
      }
    }
    return visible.sort((rowA, rowB) => rowA - rowB);
  }
  /*
   * Indexed point read: O(degree of the node), not O(triples).
   */
  readThing(urn, opts = {}) {
    const rows = this.rowsForUrn(urn, wantsIgnoreQs(opts));
    if (rows.length === 0) {
      return void 0;
    }
    const obj = {
      id: this.store.nodes.valueOf(this.store.sourceIds[rows[0]])
    };
    for (const row of rows) {
      accumulateRelation(
        obj,
        this.store.relationNames.valueOf(this.store.relationIds[row]),
        this.store.nodes.valueOf(this.store.targetIds[row]),
        false,
        false
      );
    }
    return obj;
  }
  readThings(urns, opts = {}) {
    const results = [];
    for (const urn of urns) {
      const thing = this.readThing(urn, opts);
      if (thing !== void 0) {
        results.push(thing);
      }
    }
    return results;
  }
  parseThing(parser, urn, opts = {}) {
    const thing = this.readThing(urn, opts);
    return thing ? parser(thing) : void 0;
  }
  parseThings(parser, urns, opts = {}) {
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
   * Search over this database or view. Returns a view sharing the store;
   * cost is proportional to the matches, not the database size.
   */
  search(params) {
    const parsed = parseSearch(params);
    const matched = executeSearch(this.store, parsed, this.rows);
    return _TribbleDB.view(this.store, matched, this.validations);
  }
  /*
   * Search for matching triples and apply a transformation in place.
   */
  searchFlatmap(search, fnc) {
    const parsed = parseSearch(search);
    const matchedRows = executeSearch(this.store, parsed, this.rows);
    const matchingTriples = [];
    for (const row of matchedRows) {
      matchingTriples.push(this.store.resolveRow(row));
    }
    const transformed = matchingTriples.flatMap(fnc);
    const originalKeys = new Set(matchingTriples.map(tripleKey));
    const transformedByKey = /* @__PURE__ */ new Map();
    for (const triple of transformed) {
      transformedByKey.set(tripleKey(triple), triple);
    }
    const toDelete = matchingTriples.filter((triple) => !transformedByKey.has(tripleKey(triple)));
    const toAdd = [...transformedByKey.entries()].filter(([key]) => !originalKeys.has(key)).map(([, triple]) => triple);
    if (toDelete.length > 0) {
      this.delete(toDelete);
    }
    if (toAdd.length > 0) {
      this.add(toAdd);
    }
    return this;
  }
  nodes(selector) {
    const visibility = this.visibility();
    return new NodeView(visibility, resolveSelector(visibility, selector));
  }
  paths(selector) {
    const visibility = this.visibility();
    return PathView.fromNodes(
      visibility,
      resolveSelector(visibility, selector)
    );
  }
  /*
   * Rebuild the store without tombstones. Views created earlier keep
   * their own snapshot semantics only if not shared with this database's
   * new store, so compaction is explicit rather than automatic.
   */
  compact() {
    if (this.rows !== null) {
      this.ensureOwned();
      return this;
    }
    if (this.store.deletedRows.size === 0) {
      return this;
    }
    const compacted = new TripleStore();
    for (const triple of this.triples()) {
      compacted.addTriple(triple);
    }
    this.store = compacted;
    return this;
  }
  get triplesCount() {
    return this.rows !== null ? this.rows.size : this.store.aliveCount;
  }
};
export {
  NodeView,
  PathView,
  TribbleDB,
  TripleStore
};
