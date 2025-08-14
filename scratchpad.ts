import { TribbleDB } from "./tribble-db.ts";
import type { Triple } from "./types.ts";

// Create some test data
const testTriples: Triple[] = [
  ["urn:ró:person:alice?gender=female", "name", "Alice"],
  ["urn:ró:person:alice", "age", "30"],
  ["urn:ró:person:alice", "works_at", "urn:ró:company:techcorp"],
  ["urn:ró:person:bob", "name", "Bob"],
  ["urn:ró:person:bob", "age", "25"],
  ["urn:ró:person:bob", "works_at", "urn:ró:company:startup"],
  ["urn:ró:company:techcorp", "name", "TechCorp"],
  ["urn:ró:company:techcorp", "location", "urn:ró:city:newyork"],
  ["urn:ró:company:startup", "name", "StartupCo"],
  ["urn:ró:company:startup", "location", "urn:ró:city:sf"],
  ["urn:ró:city:newyork", "name", "New York"],
  ["urn:ró:city:sf", "name", "San Francisco"],
];

const tdb = new TribbleDB(testTriples);
const query = {
  person: { type: "person", id: "alice", qs: { gender: "female" } },
  works_at: "works_at",
  company: { type: "company" },
  location: "location",
  city: { type: "city" },
};

const result = tdb.search2(query);
console.log("search2 result:", result);
