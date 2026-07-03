/*
 * Columnar triple store for the v2 engine.
 *
 * Triples are stored as three parallel arrays of interned ids. Identity is
 * exact (packed integer keys, no hashing). Deletion tombstones a row without
 * disturbing its column data or posting lists, so views created before a
 * delete keep resolving their rows — this is what preserves the v1 snapshot
 * semantics without full copies. Posting lists may therefore contain
 * tombstoned rows; all readers filter through a visibility check.
 *
 * Only three row-level posting lists are maintained (full source URN, full
 * target URN, relation): the ingest hot path pays three Set inserts per
 * triple. Type/id/qs lookups intersect at NODE level (one entry per
 * distinct URN, populated once at intern time) and then union the per-node
 * row lists, which costs O(result) at query time instead of O(triples) at
 * ingest time.
 */

import type { ParsedUrn, Triple } from "../types.ts";
import { asUrn } from "../urn.ts";
import { Interner } from "./interner.ts";
import {
  MAX_NODE_IDS,
  MAX_RELATION_IDS,
  TARGET_PACK_SPAN,
} from "./constants.ts";

/*
 * Interned URN components for one distinct node string, parsed exactly once.
 */
export type NodeMeta = {
  typeId: number;
  idId: number;
  // interned "key=value" composite ids
  qsIds: number[];
};

type PostingLists = Map<number, Set<number>>;

function addPosting(lists: PostingLists, key: number, row: number): void {
  let rows = lists.get(key);
  if (!rows) {
    rows = new Set();
    lists.set(key, rows);
  }
  rows.add(row);
}

export class TripleStore {
  nodes: Interner;
  relationNames: Interner;

  // parallel columns; row = position
  sourceIds: number[];
  relationIds: number[];
  targetIds: number[];

  // exact identity: sourceId -> (relationId * TARGET_PACK_SPAN + targetId) -> row
  private identity: Map<number, Map<number, number>>;

  // tombstoned rows; column data is retained for live views
  deletedRows: Set<number>;

  // URN components per distinct node, parsed once at intern time
  nodeMeta: Map<number, NodeMeta>;

  // row-level posting lists (the only per-triple index writes)
  rowsBySource: PostingLists;
  rowsByTarget: PostingLists;
  rowsByRelation: PostingLists;

  // node-level posting lists, populated once per distinct URN
  nodesByType: Map<number, Set<number>>;
  nodesById: Map<number, Set<number>>;
  nodesByQs: Map<number, Set<number>>;

  constructor() {
    this.nodes = new Interner(MAX_NODE_IDS);
    this.relationNames = new Interner(MAX_RELATION_IDS);
    this.sourceIds = [];
    this.relationIds = [];
    this.targetIds = [];
    this.identity = new Map();
    this.deletedRows = new Set();
    this.nodeMeta = new Map();
    this.rowsBySource = new Map();
    this.rowsByTarget = new Map();
    this.rowsByRelation = new Map();
    this.nodesByType = new Map();
    this.nodesById = new Map();
    this.nodesByQs = new Map();
  }

  /*
   * Intern a node string; on first sight AS A NODE, parse its URN
   * components and register it in the node-level indices. The interner is
   * shared with URN components (types, id parts, qs pairs), so presence
   * in the interner alone does not imply node metadata exists — a string
   * can be seen as a component before appearing as a node.
   */
  internNode(value: string): number {
    const nodeId = this.nodes.intern(value);
    if (this.nodeMeta.has(nodeId)) {
      return nodeId;
    }
    const parsed: ParsedUrn = asUrn(value);

    const typeId = this.nodes.intern(parsed.type);
    const idId = this.nodes.intern(parsed.id);

    const qsIds: number[] = [];
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

  private identityKey(relationId: number, targetId: number): number {
    return relationId * TARGET_PACK_SPAN + targetId;
  }

  /*
   * Find the row of an exact triple, dead or alive.
   */
  rowOf(sourceId: number, relationId: number, targetId: number):
    | number
    | undefined {
    const inner = this.identity.get(sourceId);
    return inner?.get(this.identityKey(relationId, targetId));
  }

  hasTriple(triple: Triple): boolean {
    const sourceId = this.nodes.idOf(triple[0]);
    const relationId = this.relationNames.idOf(triple[1]);
    const targetId = this.nodes.idOf(triple[2]);

    if (sourceId === undefined || relationId === undefined) {
      return false;
    }
    if (targetId === undefined) {
      return false;
    }

    return this.rowOf(sourceId, relationId, targetId) !== undefined;
  }

  /*
   * Add one triple. Returns true when the triple was new.
   */
  addTriple(triple: Triple): boolean {
    return this.addRowByIds(
      this.internNode(triple[0]),
      this.relationNames.intern(triple[1]),
      this.internNode(triple[2]),
    );
  }

  /*
   * Add one triple by already-interned ids (the bulk-load fast path).
   * Returns true when the triple was new.
   */
  addRowByIds(
    sourceId: number,
    relationId: number,
    targetId: number,
  ): boolean {
    let inner = this.identity.get(sourceId);
    if (!inner) {
      inner = new Map();
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
  deleteTriple(triple: Triple): boolean {
    const sourceId = this.nodes.idOf(triple[0]);
    const relationId = this.relationNames.idOf(triple[1]);
    const targetId = this.nodes.idOf(triple[2]);

    if (sourceId === undefined || relationId === undefined) {
      return false;
    }
    if (targetId === undefined) {
      return false;
    }

    const inner = this.identity.get(sourceId);
    const innerKey = this.identityKey(relationId, targetId);
    const row = inner?.get(innerKey);

    if (row === undefined) {
      return false;
    }

    inner!.delete(innerKey);
    this.deletedRows.add(row);
    return true;
  }

  isAlive(row: number): boolean {
    return !this.deletedRows.has(row);
  }

  /*
   * Total rows including tombstones.
   */
  get rowCount(): number {
    return this.sourceIds.length;
  }

  get aliveCount(): number {
    return this.sourceIds.length - this.deletedRows.size;
  }

  resolveRow(row: number): Triple {
    return [
      this.nodes.valueOf(this.sourceIds[row]),
      this.relationNames.valueOf(this.relationIds[row]),
      this.nodes.valueOf(this.targetIds[row]),
    ];
  }
}
