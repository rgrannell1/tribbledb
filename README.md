# TribbleDB

[![CI](https://github.com/rgrannell1/tribbledb/workflows/Test/badge.svg)](https://github.com/rgrannell1/tribbledb/actions)
[![codecov](https://codecov.io/gh/rgrannell1/tribbledb/branch/main/graph/badge.svg)](https://codecov.io/gh/rgrannell1/tribbledb)

A triple store database for Deno/TypeScript with indexed lookups and chainable search operations.

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
    age: "30"
  }
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
    id: "alice"
  }
});
```

```typescript
// Chain multiple searches
const adultNames = tdb
  .search({ source: { type: "person" }, relation: 'age' })
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
  target: { predicate: (value) => value.includes("@") }
});
```

## API Reference

### Constructor Methods

- `new TribbleDB(triples: Triple[])` - Create from triples array
- `TribbleDB.from(objects: TripleObject[])` - Create from objects

### Search Methods

- `search(params)` - Search and return new TribbleDB instance

### Data Methods

- `add(triples: Triple[])` - Add new triples
- `triples()` - Get all triples
- `objects()` - Convert to object format
- `sources()`, `relations()`, `targets()` - Get unique values
- `first()` - Get first triple
- `map(fn)` - Transform each triple
- `flatMap(fn)` - Transform and flatten

## License

MIT License

Copyright (c) 2025 Róisín Grannell

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
