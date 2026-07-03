import * as P from "peach";
import type { Thunk } from "peach";
import { Number } from "peach";
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
