import { assertEquals } from "jsr:@std/assert";
import { asUrn } from "./urn.ts";

Deno.test("asUrn parses amphibian URN without query string", () => {
  const urnStr = "urn:ró:amphibian:proteus-anguinus";
  const parsedObj = asUrn(urnStr);

  assertEquals(parsedObj.type, "amphibian");
  assertEquals(parsedObj.id, "proteus-anguinus");
  assertEquals(parsedObj.qs, {});
});

Deno.test("asUrn parses amphibian URN with query string", () => {
  const urnStr = "urn:ró:amphibian:proteus-anguinus?context=captivity";
  const parsedObj = asUrn(urnStr);

  assertEquals(parsedObj.type, "amphibian");
  assertEquals(parsedObj.id, "proteus-anguinus");
  assertEquals(parsedObj.qs, { context: "captivity" });
});

Deno.test("asUrn parses URN with empty remainder", () => {
  const urnStr = "urn:ró:test:";
  const parsedObj = asUrn(urnStr);

  assertEquals(parsedObj.type, "test");
  assertEquals(parsedObj.id, "");
  assertEquals(parsedObj.qs, {});
});

Deno.test("asUrn parses URN with multiple query parameters", () => {
  const urnStr = "urn:ró:animal:cat?breed=persian&color=white&age=5";
  const parsedObj = asUrn(urnStr);

  assertEquals(parsedObj.type, "animal");
  assertEquals(parsedObj.id, "cat");
  assertEquals(parsedObj.qs, { breed: "persian", color: "white", age: "5" });
});

Deno.test("asUrn handles missing query string delimiter", () => {
  const urnStr = "urn:ró:person:john-doe";
  const parsedObj = asUrn(urnStr);

  assertEquals(parsedObj.type, "person");
  assertEquals(parsedObj.id, "john-doe");
  assertEquals(parsedObj.qs, {});
});
