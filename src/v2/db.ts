/*
 * v2 TribbleDB: the v1 API surface over a shared columnar store with
 * copy-on-write views.
 *
 * A root database owns its store (rows === null). search() returns a view:
 * the same store plus a frozen row-set, at O(matches) cost. Snapshot
 * isolation matches v1's full-copy behaviour by construction:
 *   - root add() appends rows a frozen row-set cannot contain;
 *   - root delete() tombstones without erasing column data, so existing
 *     views still resolve their rows;
 *   - mutating a view first materialises it into its own store (COW).
 */

import type {
  Parser,
  Search,
  TargetValidator,
  Triple,
  TripleObject,
} from "../types.ts";
import { asUrn } from "../urn.ts";
import { parseSearch } from "../db/inputs.ts";
import { TripleStore } from "./store.ts";
import { executeSearch } from "./search.ts";
import { loadTribbleLines } from "./bulk.ts";
import { NodeView, PathView, resolveSelector } from "./traverse.ts";
import type { Visibility } from "./traverse.ts";
import type { AddReport, NodeSelector, ObjectOpts, ReadOpts } from "./types.ts";

// separator for exact string-level triple keys; cannot appear in terms
const TRIPLE_KEY_SEPARATOR = "\u0000";

function tripleKey(triple: Triple): string {
  return triple.join(TRIPLE_KEY_SEPARATOR);
}

function wantsArrays(opts: boolean | ObjectOpts): boolean {
  return typeof opts === "boolean" ? opts : opts.arrays ?? false;
}

function wantsIgnoreQs(opts: ReadOpts): boolean {
  return opts.ignoreQs ?? opts.qs ?? false;
}

/*
 * Accumulate one (relation, target) pair onto an object, preserving the
 * v1 scalar-or-array shape rules. `dedupeScalar` mirrors a v1 quirk:
 * objects()/firstObject() keep an equal scalar as-is, but readThing()
 * promotes it to a duplicated pair — replicated for parity.
 */
function accumulateRelation(
  obj: TripleObject,
  relation: string,
  target: string,
  arrays: boolean,
  dedupeScalar: boolean = true,
): void {
  const existing = obj[relation];

  if (existing === undefined) {
    obj[relation] = arrays ? [target] : target;
  } else if (Array.isArray(existing)) {
    if (!existing.includes(target)) {
      existing.push(target);
    }
  } else if (!dedupeScalar || existing !== target) {
    obj[relation] = [existing, target];
  }
}

export class TribbleDB {
  private store: TripleStore;
  // null = live root database; a Set = frozen view over the shared store
  private rows: Set<number> | null;
  private validations: Record<string, TargetValidator>;

  constructor(
    triples: Triple[],
    validations: Record<string, TargetValidator> = {},
  ) {
    this.store = new TripleStore();
    this.rows = null;
    this.validations = validations;
    this.add(triples);
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

  /*
   * Bulk-load tribble-format lines (declarations + integer triples),
   * feeding the format's dictionary directly into the intern tables.
   * Considerably faster than parsing lines to string triples and add()ing.
   */
  static fromTribbleLines(
    lines: Iterable<string>,
    validations: Record<string, TargetValidator> = {},
  ): TribbleDB {
    const db = new TribbleDB([], validations);
    loadTribbleLines(db.store, lines, validations);
    return db;
  }

  private static view(
    store: TripleStore,
    rows: Set<number>,
    validations: Record<string, TargetValidator>,
  ): TribbleDB {
    // bypass the constructor: views share the store, so allocating a
    // fresh TripleStore per search result would be pure waste
    const db = Object.create(TribbleDB.prototype) as TribbleDB;
    db.store = store;
    db.rows = rows;
    db.validations = validations;
    return db;
  }

  private visibility(): Visibility {
    return { store: this.store, rows: this.rows };
  }

  private *visibleRows(): Generator<number> {
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
  private ensureOwned(): void {
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

  add(triples: Triple[]): AddReport {
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

  delete(triples: Triple[]): TribbleDB {
    this.ensureOwned();

    for (const triple of triples) {
      this.store.deleteTriple(triple);
    }
    return this;
  }

  triples(): Triple[] {
    const result: Triple[] = [];
    for (const row of this.visibleRows()) {
      result.push(this.store.resolveRow(row));
    }
    return result;
  }

  private uniqueTerms(column: number[]): Set<string> {
    const termIds = new Set<number>();
    for (const row of this.visibleRows()) {
      termIds.add(column[row]);
    }

    const terms = new Set<string>();
    for (const termId of termIds) {
      terms.add(this.store.nodes.valueOf(termId));
    }
    return terms;
  }

  sources(): Set<string> {
    return this.uniqueTerms(this.store.sourceIds);
  }

  relations(): Set<string> {
    const relationIds = new Set<number>();
    for (const row of this.visibleRows()) {
      relationIds.add(this.store.relationIds[row]);
    }

    const names = new Set<string>();
    for (const relationId of relationIds) {
      names.add(this.store.relationNames.valueOf(relationId));
    }
    return names;
  }

  targets(): Set<string> {
    return this.uniqueTerms(this.store.targetIds);
  }

  /*
   * First triple in insertion order. Unlike v1, this skips deleted rows
   * rather than returning undefined once row zero is deleted.
   */
  firstTriple(): Triple | undefined {
    for (const row of this.visibleRows()) {
      return this.store.resolveRow(row);
    }
    return undefined;
  }

  firstSource(): string | undefined {
    return this.firstTriple()?.[0];
  }

  firstRelation(): string | undefined {
    return this.firstTriple()?.[1];
  }

  firstTarget(): string | undefined {
    return this.firstTriple()?.[2];
  }

  firstObject(opts: boolean | ObjectOpts = false): TripleObject | undefined {
    const arrays = wantsArrays(opts);
    let firstId: number | undefined = undefined;
    const obj: TripleObject = {};

    for (const row of this.visibleRows()) {
      const sourceId = this.store.sourceIds[row];

      if (firstId === undefined) {
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
        arrays,
      );
    }

    return firstId === undefined ? undefined : obj;
  }

  objects(opts: boolean | ObjectOpts = false): TripleObject[] {
    const arrays = wantsArrays(opts);
    const objs = new Map<number, TripleObject>();

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
        arrays,
      );
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
  merge(other: TribbleDB): TribbleDB {
    this.add(other.triples());
    return this;
  }

  mergedWith(other: TribbleDB): TribbleDB {
    const combined = new TribbleDB(this.triples(), this.validations);
    combined.add(other.triples());
    return combined;
  }

  clone(): TribbleDB {
    return new TribbleDB(this.triples(), this.validations);
  }

  private rowsForUrn(urn: string, ignoreQs: boolean): number[] {
    let candidate: Set<number> | undefined;

    if (!ignoreQs) {
      const nodeId = this.store.nodes.idOf(urn);
      candidate = nodeId === undefined
        ? undefined
        : this.store.rowsBySource.get(nodeId);
    } else {
      const { type, id } = asUrn(urn);
      const typeId = this.store.nodes.idOf(type);
      const idId = this.store.nodes.idOf(id);

      const typeNodes = typeId === undefined
        ? undefined
        : this.store.nodesByType.get(typeId);
      const idNodes = idId === undefined
        ? undefined
        : this.store.nodesById.get(idId);

      if (typeNodes && idNodes) {
        candidate = new Set<number>();
        const [small, large] = typeNodes.size <= idNodes.size
          ? [typeNodes, idNodes]
          : [idNodes, typeNodes];

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

    const visible: number[] = [];
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
  readThing(urn: string, opts: ReadOpts = {}): TripleObject | undefined {
    const rows = this.rowsForUrn(urn, wantsIgnoreQs(opts));
    if (rows.length === 0) {
      return undefined;
    }

    const obj: TripleObject = {
      id: this.store.nodes.valueOf(this.store.sourceIds[rows[0]]),
    };

    for (const row of rows) {
      accumulateRelation(
        obj,
        this.store.relationNames.valueOf(this.store.relationIds[row]),
        this.store.nodes.valueOf(this.store.targetIds[row]),
        false,
        false,
      );
    }

    return obj;
  }

  readThings(
    urns: Set<string> | string[],
    opts: ReadOpts = {},
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

  parseThing<Parsed>(
    parser: Parser<Parsed>,
    urn: string,
    opts: ReadOpts = {},
  ): Parsed | undefined {
    const thing = this.readThing(urn, opts);
    return thing ? parser(thing) : undefined;
  }

  parseThings<Parsed>(
    parser: Parser<Parsed>,
    urns: Set<string> | string[],
    opts: ReadOpts = {},
  ): Parsed[] {
    const results: Parsed[] = [];

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
  search(params: Search): TribbleDB {
    const parsed = parseSearch(params);
    const matched = executeSearch(this.store, parsed, this.rows);
    return TribbleDB.view(this.store, matched, this.validations);
  }

  /*
   * Search for matching triples and apply a transformation in place.
   */
  searchFlatmap(search: Search, fnc: (triple: Triple) => Triple[]): TribbleDB {
    const parsed = parseSearch(search);
    const matchedRows = executeSearch(this.store, parsed, this.rows);

    const matchingTriples: Triple[] = [];
    for (const row of matchedRows) {
      matchingTriples.push(this.store.resolveRow(row));
    }

    const transformed = matchingTriples.flatMap(fnc);

    const originalKeys = new Set(matchingTriples.map(tripleKey));
    const transformedByKey = new Map<string, Triple>();
    for (const triple of transformed) {
      transformedByKey.set(tripleKey(triple), triple);
    }

    const toDelete = matchingTriples
      .filter((triple) => !transformedByKey.has(tripleKey(triple)));
    const toAdd = [...transformedByKey.entries()]
      .filter(([key]) => !originalKeys.has(key))
      .map(([, triple]) => triple);

    if (toDelete.length > 0) {
      this.delete(toDelete);
    }
    if (toAdd.length > 0) {
      this.add(toAdd);
    }

    return this;
  }

  nodes(selector: NodeSelector): NodeView {
    const visibility = this.visibility();
    return new NodeView(visibility, resolveSelector(visibility, selector));
  }

  paths(selector: NodeSelector): PathView {
    const visibility = this.visibility();
    return PathView.fromNodes(
      visibility,
      resolveSelector(visibility, selector),
    );
  }

  /*
   * Rebuild the store without tombstones. Views created earlier keep
   * their own snapshot semantics only if not shared with this database's
   * new store, so compaction is explicit rather than automatic.
   */
  compact(): TribbleDB {
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

  get triplesCount(): number {
    return this.rows !== null ? this.rows.size : this.store.aliveCount;
  }
}
