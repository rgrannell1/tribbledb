# TribbleDB

[![CI](https://github.com/rgrannell1/tribbledb/workflows/Test/badge.svg)](https://github.com/rgrannell1/tribbledb/actions)
[![codecov](https://codecov.io/gh/rgrannell1/tribbledb/branch/main/graph/badge.svg)](https://codecov.io/gh/rgrannell1/tribbledb)

A high-performance triple store database for Deno/TypeScript with indexed lookups and chainable search operations.

## Installation

### Deno

```typescript
import { TribbleDB } from "jsr:@rgrannell1/tribbledb";
```

### npm

```bash
npm install @rgrannell1/tribbledb
```

```typescript
import { TribbleDB } from "@rgrannell1/tribbledb";
```

## Creating a TribbleDB

```typescript
const triples: Triple[] = [
  ["urn:ró:person:alice", "name", "Alice Johnson"],
  ["urn:ró:person:alice", "age", "30"],
  ["urn:ró:person:bob", "name", "Bob Smith"],
  ["urn:ró:company:acme", "name", "Acme Corp"],
];

const tdb = new TribbleDB(triples);
const objects = [
  {
    id: "urn:ró:person:alice",
    name: "Alice Johnson",
    age: "30",
  },
];

const tdb2 = TribbleDB.from(objects);
```

## Basic Searches

```typescript
// Search by source type
const people = tdb.search({ source: { type: "person" } });

// Search by relation
const names = tdb.search({ relation: "name" });

// Search by specific URN components
const alice = tdb.search({
  source: {
    type: "person",
    id: "alice",
  },
});
```

```typescript
// Chain multiple searches
const adultNames = tdb
  .search({ source: { type: "person" }, relation: "age" })
  .search({ target: { predicate: (age) => parseInt(age) >= 18 } })
  .search({ relation: "name" });

// Transform results
const personObjects = tdb
  .search({ source: { type: "person" } })
  .objects();

// Multiple constraints
const specificData = tdb.search({
  source: { type: "person" },
  relation: "email",
  target: { predicate: (value) => value.includes("@") },
});
```

## Advanced Usage

### URN Structure

TribbleDB supports URN-based identifiers with the structure: `urn:ró:type:id?key=value`

```typescript
const tdb = new TribbleDB([
  ["urn:ró:person:alice?dept=eng", "name", "Alice Johnson"],
  ["urn:ró:person:bob?dept=sales", "name", "Bob Smith"],
]);

// Search by URN type
const people = tdb.search({ source: { type: "person" } });

// Search by URN id
const alice = tdb.search({ source: { id: "alice" } });

// Search by query string
const engineers = tdb.search({ source: { qs: { dept: "eng" } } });
```

### Validation

Add validation rules to ensure data integrity:

```typescript
const validations = {
  age: (sourceType, relation, value) => {
    const parsedAge = parseInt(value);
    if (isNaN(parsedAge) || parsedAge < 0 || parsedAge > 150) {
      return `Invalid age: ${value}`;
    }
    return undefined;
  }
};

const tdb = new TribbleDB([], validations);
tdb.add([["person:alice", "age", "30"]]); // OK
// tdb.add([["person:bob", "age", "999"]]); // Throws validation error
```

### Reading and Parsing Data

```typescript
// Read a single entity as an object
const aliceObj = tdb.readThing("urn:ró:person:alice");

// Read multiple entities
const peopleObjs = tdb.readThings(["person:alice", "person:bob"]);

// Parse with a custom parser
type Person = {
  name: string;
  age: number;
};

const personParser = (obj: TripleObject): Person | undefined => {
  if (!obj.name || !obj.age) return undefined;
  return {
    name: obj.name as string,
    age: parseInt(obj.age as string)
  };
};

const alice = tdb.parseThing(personParser, "person:alice");
const people = tdb.parseThings(personParser, ["person:alice", "person:bob"]);
```

### Database Operations

```typescript
// Merge databases
const tdb1 = new TribbleDB(triples1);
const tdb2 = new TribbleDB(triples2);
tdb1.merge(tdb2);

// Clone a database
const copy = tdb.clone();

// Delete triples
tdb.delete([["person:alice", "age", "30"]]);

// Map transformations
const normalized = tdb.map(([src, rel, tgt]) =>
  [src.toLowerCase(), rel, tgt.toLowerCase()]
);

// FlatMap for expansions
const expanded = tdb.flatMap(([src, rel, tgt]) => [
  [src, rel, tgt],
  [tgt, `reverse_${rel}`, src]
]);
```

### Complex Search Patterns

```typescript
// Multiple constraints with predicates
const results = tdb.search({
  source: {
    type: "person",
    predicate: (src) => src.includes("alice")
  },
  relation: {
    relation: ["name", "age", "email"],
    predicate: (rel) => rel !== "internal_id"
  },
  target: {
    predicate: (val) => val.length > 0
  }
});

// Array-based search syntax
const results2 = tdb.search([
  { type: "person" },  // source constraint
  "works_at",          // relation constraint
  { type: "company" }  // target constraint
]);

// String shortcuts
const names = tdb.search({ relation: "name" });
const aliceData = tdb.search({ source: "person:alice" });
```

### Accessing Results

```typescript
// Get unique sources, relations, or targets
const allPeople = tdb.sources();
const allRelations = tdb.relations();
const allValues = tdb.targets();

// Get first results
const firstTriple = tdb.firstTriple();
const firstSource = tdb.firstSource();
const firstObject = tdb.firstObject();

// Convert to objects (with list handling)
const objects = tdb.objects(); // Single values where possible
const objectsWithLists = tdb.objects(true); // Always use arrays for relations
```

## API Reference

### Constructor Methods

#### `new TribbleDB(triples, validations?)`
Create a database from a triples array with optional validation rules.

- `triples`: Array of `[source, relation, target]` tuples
- `validations`: Optional record of validation functions per relation

#### `TribbleDB.of(triples)`
Static factory method, equivalent to `new TribbleDB(triples)`.

#### `TribbleDB.from(objects)`
Create from an array of objects with `id` properties.

```typescript
const tdb = TribbleDB.from([
  { id: "person:alice", name: "Alice", age: "30" }
]);
```

### Search Methods

#### `search(params)`
Search and return a new TribbleDB instance with matching triples. Supports:

- Object syntax: `{ source?, relation?, target? }`
- Array syntax: `[source?, relation?, target?]`
- Each parameter can be a string, array of strings, or query object

### Data Methods

#### `add(triples)`
Add new triples to the database (automatically deduplicated).

#### `delete(triples)`
Remove triples from the database.

#### `triples()`
Get all triples as an array.

#### `objects(listOnly?)`
Convert triples to object format.

- `listOnly`: If true, always use arrays for relation values

#### `sources()`, `relations()`, `targets()`
Get unique values as Sets.

#### `firstTriple()`, `firstSource()`, `firstRelation()`, `firstTarget()`, `firstObject()`
Get the first matching result.

#### `map(fn)`, `flatMap(fn)`
Transform triples and return a new TribbleDB.

#### `merge(other)`, `clone()`
Combine or duplicate databases.

#### `readThing(urn, opts?)`, `readThings(urns, opts?)`
Read entities as objects by URN.

- `opts.qs`: If true, match URNs ignoring query strings

#### `parseThing(parser, urn, opts?)`, `parseThings(parser, urns, opts?)`
Read and parse entities with a custom parser function.

## Performance

TribbleDB uses multi-dimensional indices for efficient lookups:

- Source type, id, and query string indices
- Relation indices
- Target type, id, and query string indices
- Triple hash-based deduplication

Benchmark results are available in the `benchmark_results/` directory.
## License

MIT License

Copyright (c) 2025 Róisín Grannell

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
