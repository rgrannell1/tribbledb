import * as P from "peach";
import {
  type Thunk,
  unwrap,
  type Wrapped,
} from "peach";
import { Number } from "peach";
const U = Number.uniform;

export function URN(
  prefix: Wrapped<string>,
  name: Wrapped<string>,
): Thunk<string> {
  return () => {
    const $name = unwrap(name);
    return `${unwrap(prefix)}:${$name.toLowerCase().replace(" ", "-")}`;
  };
}

export function PersonNameTriple(
  name: Wrapped<string>,
  prefix: Wrapped<string>,
): Thunk<string[]> {
  return () => {
    const $name = unwrap(name);

    const urn = URN(prefix, name)();
    return P.Array.concat(urn, "name", $name)();
  };
}

export function PersonAliveTriple(
  name: Wrapped<string>,
  prefix: Wrapped<string>,
): Thunk<string[]> {
  return () => {
    const urn = URN(prefix, name)();
    return P.Array.concat(urn, "alive", P.Logic.oneOf(U, ["true", "false"]))();
  };
}

export function PersonAgeTriple(
  name: Wrapped<string>,
  prefix: Wrapped<string>,
): Thunk<string[]> {
  return () => {
    const age = P.Number.uniform(0, 100)();

    const urn = URN(prefix, name)();
    return P.Array.concat(urn, "age", age.toString())();
  };
}

export function PersonIdTriple(
  name: Wrapped<string>,
  prefix: Wrapped<string>,
): Thunk<string[]> {
  return () => {
    const id = P.Number.uniform(10000000, 99999999)();

    const urn = URN(prefix, name)();
    return P.Array.concat(urn, "id", id.toString())();
  };
}

export function PersonTriples(
  name: Wrapped<string>,
  prefix: Wrapped<string>,
): Thunk<string[][]> {
  return () => {
    const $name = unwrap(name);
    const $prefix = unwrap(prefix);

    return P.Array.concat(
      PersonNameTriple($name, $prefix)(),
      PersonAgeTriple($name, $prefix)(),
      PersonAliveTriple($name, $prefix)(),
      PersonIdTriple($name, $prefix)(),
    )();
  };
}
