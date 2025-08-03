
import * as P from "https://deno.land/x/peach_ts/src/mod.ts";
import { TribbleDB } from "./index.ts";
import { assertEquals } from "https://deno.land/std@0.203.0/testing/asserts.ts";

const { uniform: U } = P.Number;

function Relation () {
  return P.Logic.oneOf(U, ['is', 'has', 'name']);
}

function Key() {
  return P.Logic.oneOf(U, ['context']);
}

function Value() {
  return P.Logic.oneOf(U, ['holiday', 'work']);
}

function digitString() {
  return P.String.from(P.String.digit(U), 10);
}

function QueryString() {
  return P.String.concat('?', Key(), '=', Value());
}

function Geoname() {
  return P.String.concat('urn:ró:geoname:', digitString());
}

function Unesco() {
  return P.String.concat('urn:ró:unesco:', digitString());
}

Deno.test("Has* methods work as expected", () => {
  const tb = new TribbleDB([
    [Geoname()(), 'is', Unesco()()]
  ]);

  assertEquals(tb.hasRelation((rel: string) => rel === 'is'), true);
  assertEquals(tb.hasRelation((rel: string) => rel === 'has'), false);

  assertEquals(tb.hasSource((source: string) => source.startsWith('urn:ró:geoname')), true);
  assertEquals(tb.hasSource((source: string) => source.startsWith('urn:ró:unesco')), false);

  assertEquals(tb.hasTarget((target: string) => target.startsWith('urn:ró:unesco')), true);
  assertEquals(tb.hasTarget((target: string) => target.startsWith('urn:ró:geoname')), false);
});
