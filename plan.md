# TribbleDB redesign plan

> **Status (2026-07-03):** all five phases implemented in `src/v2/` (v1
> untouched). 326 tests green, including differential fuzzing v2-vs-v1,
> snapshot-isolation scenarios pinned to v1 behaviour, a hash-collision
> regression, and TribbleParser-parity tests for the bulk loader. Benchmark
> (`deno run benchmark/v2-compare.ts`, 97k triples): tribble-text load
> 251→100ms, ingest 178→77ms, chained search 334→45ms, readThing×100
> 1,230→0.04ms, things→albums walk 10,849→1.0ms. Ingest refinement over the
> original design: only three row-level posting lists
> (source/target/relation); type/id/qs index at node level, intersected
> before unioning per-node rows. `fromTribbleLines` feeds the format's
> dictionary ids straight into the intern tables.
>
> **Validated against the real photos manifests** (52k and 63k lines):
> triple content, site-shaped searches, and point reads over every source
> are identical to v1; the site's three worst N+1 loops and their traversal
> replacements return identical results (things→albums 246→3.5ms,
> birdwatch check, transitive place ancestors 10.6→0.6ms). Real data
> exposed one bug the synthetic fuzzing missed — a string interned first
> as a URN component and later appearing as a literal node skipped node
> registration — fixed in `internNode` with regression coverage.

Non-breaking internal redesign addressing three problems: super-linear search cost,
slow ingestion, and a query interface that forces callers into N+1 loops. Informed by
reading the sole production consumer, `photos.rgrannell.xyz` (52k triples shipped,
ingestion measured at 250–500ms and ~60% of page load time).

## Root causes

1. **`search()` rebuilds the entire index for its result.**
   `src/tribble-db.ts:421` returns `new TribbleDB(matchingTriples, ...)`; the
   constructor builds a fresh `Index` (`src/indices/index.ts:54`) — re-parsing URNs,
   re-hashing, and repopulating seven posting-list maps for every matched triple.
   A chain of searches pays this at every link, so cost is
   O(links × matches × index-build), not O(matches). This is the non-linearity.

2. **Point reads are linear scans.**
   `readThing()` (`src/tribble-db.ts:213`) materialises *all* triples back to strings
   via `index.triples()` and scans them. `readThings()` calls it per URN — O(n × m).
   The consumer routes *every* single-entity read through an equivalent pattern
   (`photos.../ts/commons/things.ts:12-21`), then loops it over URN lists
   (`things.ts:45-88`, `services/photos.ts:112-160`, `services/albums.ts:141-165`).

3. **Ingestion does per-triple string work.**
   Per triple added (`src/indices/index.ts:144`): a full string re-hash of all three
   terms (`hashTriple`, `src/hash.ts:19`), six `stringIndex.add` calls (four of which
   run *before* the duplicate check and are wasted on dupes), `Object.entries`
   allocations for query strings even when empty, and a per-triple metadata object.
   The consumer also calls `add()` once per triple (`photos.../ts/semantic/data.ts:84-88`),
   so the per-call constant matters.

4. **Predicate-only searches enumerate every row.**
   `getTripleIndicesForNodeQueries` (`src/tribble-db.ts:440`) inserts *all* row
   indices into a fresh `Set` when a query has only a predicate — O(n) set churn
   per search before filtering even starts.

5. **The query surface only answers "which triples match".**
   Multi-hop questions (thing → photos → albums → countries) must be asked as
   sequential searches with string URNs re-entering the engine at each step, and
   per-entity materialisation must be asked one URN at a time. The engine has the
   posting lists to answer these in one pass; the API just doesn't expose them.

### The Chesterton fence: why full clones exist

`search()` returning an independent `TribbleDB` gives **snapshot isolation**: mutating
the parent after a search (`add`/`delete`) cannot change the result, and mutating a
result cannot change the parent. `merge()`/`searchFlatmap()` mutate in place, so
without copies, held search results would silently shift underfoot. Any redesign must
preserve exactly this observable behaviour — it just mustn't pay for it eagerly.

### A correctness bug that falls out

Triple identity is a 32-bit string hash (`src/hash.ts:19`) used for dedup
(`src/indices/index.ts:176`). At 52k triples the birthday bound gives roughly a
1-in-3 chance that two distinct triples collide, in which case the second is
**silently dropped on ingest**. The redesign replaces hashes with exact keys, fixing
this. (Also: `firstTriple()`/`firstSource()` read slot 0 unconditionally, so they
return `undefined` after row 0 is deleted even when triples remain — fix in passing.)

## Design

Five changes, each independently shippable, all additive or internal. Public API,
search semantics (including qs matching), `TripleObject` shapes, and snapshot
isolation are preserved bit-for-bit; the existing fuzz suite runs old-vs-new
differentially to prove it.

### 1. Fully interned triples with exact identity (ingest speed + collision fix)

- Intern relations alongside sources/targets; a stored triple becomes
  `[sourceIdx, relationIdx, targetIdx]` — three integers.
- Replace hash-based identity with an exact two-level key:
  `outer = sourceIdx * 2^21 + relationIdx` (exact in float64), then
  `Map<outer, Set<targetIdx>>`. No string hashing, no collisions.
- Reorder `add()`: check duplicate first (via interned key once source/target are
  looked up), *then* do posting-list work. Interning a string that already exists
  is a single Map hit; everything downstream is numeric.
- Fast path for URNs without `?`: skip query-string parsing and the
  `Object.entries` loop entirely (the overwhelmingly common case in the photo data).
- Drop the per-triple `tripleMetadata` object: deletion can re-derive posting-list
  keys from the retained `stringUrn` parse cache.

### 2. Copy-on-write views (the non-linearity fix)

`TribbleDB` becomes a pair: a (possibly shared) `Index` plus an optional row-set.

- A root database owns its index; `rows = all`.
- `search()` returns a **view**: same shared index, `rows = Set<number>` of matches.
  Cost is O(matches) — no index rebuild. Chained searches intersect against the
  view's row-set (the machinery in the currently-dead `src/db/search.ts`
  — `findMatchingRows(params, index, cursorIndices)` — is exactly this and gets
  revived as the single search implementation; `tribble-db.ts`'s duplicated
  `search`/`searchTriples` bodies collapse into it).
- **Snapshot isolation is kept by construction:**
  - Parent `add()` appends new rows; existing views' row-sets don't contain them.
  - Parent `delete()` tombstones: the row leaves the posting lists and a `deleted`
    bitset (so live queries skip it), but the slot's data is retained, so
    already-created views still resolve their rows. This matches today's
    snapshot behaviour exactly. (Today `delete` erases the slot —
    `src/indices/index.ts:115`.)
  - Mutating a *view* (`add`/`delete`/`merge`/`searchFlatmap`) triggers
    copy-on-write: the view materialises its own index from its rows first —
    today's cost, but paid only on mutation. The consumer never mutates search
    results, so in practice this path never runs.
- Tombstones accumulate only under deletion, which the consumer doesn't use;
  an explicit `compact()` is provided rather than automatic compaction (automatic
  compaction can't know whether views are still alive).
- Predicate-only queries filter the view's row-set lazily instead of enumerating
  all rows into a fresh set (fixes root cause 4).

### 3. Indexed point reads

`readThing(urn)` becomes: parse URN once, intersect the `sourceType`/`sourceId`
posting lists, build the object from those rows — O(degree of the node), not O(n).
`readThings(urns)`/`parseThings` batch this. Signatures unchanged
(`tdb.readThing` is referenced as an instance method by the consumer,
`photos.../ts/state.ts:73`).

### 4. Traversal API (kills N+1 at the interface level)

Additive, node-oriented layer over the same shared index. The unit of work is a
**NodeView**: an immutable set of interned node ids plus a reference to the index.
Every operation is one pass over the relevant posting lists in integer space;
strings appear only at terminals. No operation builds an index or a `TribbleDB`.

```ts
type NodeSelector =
  | NodeObjectQuery            // { type?, id?, qs?, predicate? } — as in search()
  | string | string[]          // URN(s)
  | Set<string>
  | NodeView;

db.nodes(selector): NodeView
```

The vocabulary is deliberately small: two hop verbs, one filter, set operations,
terminals.

**Hops** (NodeView → NodeView):

- `.follow(relation | relations)` — walk edges source→target: intersect the
  relation posting lists with rows whose source is in the set; result is the
  target nodes. No argument follows any relation.
  `{ transitive: true }` repeats the hop to a fixed point (BFS over posting
  lists) — for the `in`/`contains` location hierarchies.
  `{ where: query }` constrains the nodes arrived at.
- `.referencedBy(relation | relations)` — the same walk, target→source:
  `things.referencedBy("subject")` is the set of nodes whose `subject` edge
  points at one of `things`.

**Refinement** (NodeView → NodeView):

- `.filter(query)` — narrow by type/id/qs/predicate, plus edge-existence:
  `{ has: relation }` keeps nodes with at least one outgoing edge of that
  relation, `{ lacks: relation }` the complement. No materialisation.
- `.union(other)`, `.intersect(other)`, `.subtract(other)`.

**Terminals**:

- `.urns(): Set<string>`, `.ids(): Set<string>` (id components — collapses
  qs-variant URNs like `bird:x?context=wild` / `bird:x` onto one id),
  `.count(): number`, `.has(urn): boolean`.
- `.objects(): TripleObject[]`, `.objectsById(): Map<string, TripleObject>` —
  materialised once, array-valued shapes. `objectsById` also exists on search
  results, giving batched grouped reads without extra one-off methods
  (`db.nodes(urns).objectsById()` is the batched `readThings`;
  `db.search(...).objectsById()` is search-grouped-by-source).

**Provenance variant** — derivation code needs to know *where a walk started*
(it fabricates new triples from (start, end) pairs), which a plain node-set
loses. `db.paths(selector)` returns a **PathView**: a set of (start, end) pairs
whose `.follow()` advances the end node; terminal `.pairs(): [string, string][]`.

**Supporting index**: hops need node→rows adjacency (full source/target URN →
row set). Today the index only keys the *components* (type, id, qs). Phase 1
adds two posting maps — `bySource` and `byTarget`, keyed on the interned full
URN — which also make `readThing` O(degree).

#### What this replaces in the photos site

`readAlbumsByThingIds` (`albums.ts:133-167`) is today two sequential N+1 loops —
per-thing `search().sources()` collecting photo ids, then per-photo
`search().targets()` collecting album ids. It becomes:

```ts
const albumIds = tdb.nodes(thingsUrns)
  .referencedBy()              // things ← photos
  .filter({ type: "photo" })
  .follow(KnownRelations.ALBUM_ID)
  .ids();
return readAlbums(tdb, [...albumIds].map(albumUrn));
```

`addFeatureLocationsForType` (`derive.ts`, the flagged "this is a bottleneck"
~70-100ms) is today a per-location-triple nested search. With provenance:

```ts
const pairs = tdb.paths({ type: sourceType })
  .follow(KnownRelations.LOCATION, { where: { type: KnownTypes.PLACE } })
  .follow(KnownRelations.FEATURES)
  .pairs();
tdb.add(pairs.map(([media, feature]) =>
  [media, KnownRelations.LOCATION, feature]));
```

The rest of the worst offenders:

| Consumer pattern | Today | With traversal API |
|---|---|---|
| `readThings` / `readParsedThings` (`things.ts:45-88`) | one `search().firstObject()` per URN | `[...tdb.nodes(urns).objectsById().values()]` |
| `readThingsByPhotoIds` (`photos.ts:112`) | per-photo search + `firstObject(true)` | `nodes(photoIds).follow(LOCATION).urns()` and `.follow(SUBJECT).urns()` |
| `readPhotosByThingIds` (`photos.ts:146`) | per-thing search | `nodes(things).referencedBy([SUBJECT, LOCATION]).filter({type: "photo"}).urns()` |
| `readBirdStats` birdwatch loop (`readers.ts:81-90`) | per-bird `search().triples().length > 0` | `wildBirds.filter({ has: BIRDWATCH_URL }).count()` |
| `readWildBirdChecklist` (`readers.ts:192-213`) | per-bird `firstObject()` + `isIrish` search | one `birds.objectsById()` + one `birds.filter({ has: BIRDWATCH_URL })`, then Map/Set lookups in the loop |
| `addTransitiveLocationsForType` (`derive.ts:420`) | per-triple nested `in` search | `paths(...).follow(LOCATION).follow(IN, { transitive: true }).pairs()` |
| per-card cover lookups (`listing.ts:29`, `app.ts:463`) | one cover search per card/place | one `search(...).objectsById()` over the cover relation |

The shape of the win: each replacement is O(edges touched) in one or two passes,
instead of O(nodes × search cost) — and it deletes the site's accumulated
workarounds (loops-with-Sets, `firstObject(true)` misuse, ad-hoc caches).
`search()` itself is untouched; the consumer migrates opportunistically.

### 5. Bulk-load path (optional, last)

The consumer streams a dictionary-encoded tribble file, decodes each line to a
string triple, and tribbledb immediately re-interns those strings. Add
`TribbleDB.fromTribbleLines(iterable)` that feeds the parser's dictionary straight
into the intern table, skipping the string round-trip. Purely additive; the
existing `TribbleParser` line API stays.

### 6. API ergonomics (additive fixes, deprecations only)

UX problems observed in the consumer's usage; all fixes are additive, with old
forms kept working and marked deprecated in doc comments.

- **`firstObject(listOnly)` / `objects(listOnly)`** — bare boolean whose meaning
  the sole consumer misreads (`photos.../ts/services/photos.ts:118` passes `true`
  apparently expecting "include id", not "wrap values in arrays"). Add an
  options-object overload: `firstObject({ arrays: true })`. Boolean form stays.
- **Scalar-or-array value shapes** — `TripleObject` values are `string | string[]`
  by cardinality, forcing the consumer's `one()`/`arrayify()` wrappers everywhere.
  The `{ arrays: true }` option gives a stable shape; the traversal API's
  `objects()` uses stable shapes from the start.
- **Mixed mutability** — `merge`/`delete`/`searchFlatmap` mutate in place but
  return a `TribbleDB`, so chains read as pure. Add pure `mergedWith(other)`;
  document the mutators as such. No behaviour change to existing methods.
- **Silent outcomes** — `add()` returns void whether triples were inserted,
  duplicates, or (today) hash-collision casualties. Have `add()` return
  `{ added, duplicates }` (void → value is non-breaking). "Not found" becomes
  distinguishable from "empty": `nodes(urns).objectsById()` returns a Map, so
  missing URNs are simply absent keys rather than silently skipped list entries.
- **`ReadOpts { qs: boolean }`** — cryptic: `qs: true` means "match ignoring the
  querystring". Accept `{ ignoreQs: boolean }` as the documented spelling;
  keep `qs` as a deprecated alias.
- **Underspecified qs query semantics** — the consumer hedges in comments
  ("?context=wild (or no context)", `photos.../ts/services/readers.ts:57-61`)
  because what a query with qs matches is written down nowhere. Pin the current
  engine behaviour with table-based spec tests first, then document exactly that
  in the type doc comments. Semantics do not change; they become stated.
- **Ambiguous string shorthands** — a bare string source is URN-or-id with a
  magic `"unknown"` type fallback, and the positional array query form is
  unreadable. Document both; steer examples to the object form. No removal.

## Compatibility contract

Preserved exactly (verified by differential fuzzing of old vs new on random data
and queries, plus new regression tests):

- `search()` query grammar (object and array forms, string/array shorthands,
  predicates) and result membership, including qs semantics.
- Snapshot isolation between a database and its search results, in both directions.
- `TripleObject` scalar-or-array value shapes from `objects()`/`firstObject()`/
  `readThing()`.
- Constructor, `add`, `delete`, `merge`, `map`, `flatMap`, `triples`, `sources`,
  `relations`, `targets`, `first*`, `readThing(s)`, `parseThing(s)`,
  `TribbleParser`, `TribbleStringifier`, `asUrn`.
- Not guaranteed today and not preserved: triple ordering within results beyond
  insertion order, and `metrics` internals.

New surface (additive only): `nodes()`/`NodeView` (`follow`, `referencedBy`,
`filter`, set ops, terminals including `objectsById`), `paths()`/`PathView`,
`objectsById` on search results, `compact`, `fromTribbleLines`,
`mergedWith`, options-object overloads for `firstObject`/`objects`/read opts,
and an `{ added, duplicates }` return from `add()`.

## Phasing

1. **Interned identity + ingest fast path** — internal only; fixes the collision
   bug; benchmark ingest before/after (`rs bench`, results in `benchmark_results/`).
2. **COW views** — revive `src/db/search.ts` as the engine, delete the duplicated
   search bodies in `tribble-db.ts`; add snapshot-isolation regression tests
   (parent add/delete after search; view mutation) *before* switching.
3. **Indexed point reads** — with a regression test pinning `readThing` output
   against the linear-scan implementation.
4. **Traversal API** — additive; table-based tests mirroring the four consumer
   patterns above.
5. **Bulk load** — measured against the real 52k-line manifest from the photos site.
6. **Ergonomics** — can land any time after phase 2; qs spec tests land first,
   since they also guard the phase 2 engine swap.

Each phase lands green on the existing test + fuzz suites before the next starts.

## Expected outcomes

- Chained search: O(matches) per link — linear in result size, index built once.
- `readThings(52k-photo page)`: from O(n) scans per URN to O(rows returned).
- Ingest of the 52k manifest: target well under 100ms (from 250–500ms), from
  removing string hashing, wasted interning, qs allocation, and per-triple metadata.
- No consumer changes required for the wins in phases 1–3; phase 4 lets the photos
  site delete its N+1 loops and ad-hoc caches (`NAME_TO_URN_CACHE`, per-batch
  rendering workarounds) at its own pace.
