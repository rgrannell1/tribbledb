import * as P from "https://deno.land/x/peach_ts@0.4.2/src/mod.ts";
import type { Thunk } from "https://deno.land/x/peach_ts@0.4.2/src/mod.ts";
import { Number } from "https://deno.land/x/peach_ts@0.4.2/src/mod.ts";
const U = Number.uniform;

export function Forename(): Thunk<string> {
  return P.Logic.oneOf(U, [
    () => "Adrian",
    () => "Brielle",
    () => "Cedric",
    () => "Daphne",
    () => "Emmett",
    () => "Fiona",
    () => "Gareth",
    () => "Helena",
    () => "Ismael",
    () => "Jolene",
  ]);
}

export function Surname(): Thunk<string> {
  return P.Logic.oneOf(U, [
    () => "Anderson",
    () => "Brown",
    () => "Clark",
    () => "Davis",
    () => "Evans",
    () => "Garcia",
    () => "Harris",
    () => "Johnson",
    () => "Lopez",
    () => "Martinez",
  ]);
}

export function Name(): Thunk<string> {
  return P.String.concat(Forename(), " ", Surname());
}
