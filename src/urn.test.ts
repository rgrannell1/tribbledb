import { assertEquals } from "jsr:@std/assert";
import { asUrn } from "./urn.ts";

Deno.test("asUrn parses amphibian URN without query string", () => {
  const urnStr = "urn:ró:amphibian:proteus-anguinus";
  const parsedObj = asUrn(urnStr);

  assertEquals(parsedObj.type, "amphibian");
  assertEquals(parsedObj.id, "proteus-anguinus");
  assertEquals(parsedObj.qs, { });
});

Deno.test("asUrn parses amphibian URN with query string", () => {
  const urnStr = "urn:ró:amphibian:proteus-anguinus?context=captivity";
  const parsedObj = asUrn(urnStr);

  assertEquals(parsedObj.type, "amphibian");
  assertEquals(parsedObj.id, "proteus-anguinus");
  assertEquals(parsedObj.qs, { context: "captivity" });
});
