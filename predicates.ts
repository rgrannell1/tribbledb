
import { Predicate } from "./types.ts";

export function Truth(_: string) {
  return true;
}

export function Falsity(_: string) {
  return false;
}

export function All(...preds: Predicate[]) {
  return (value: string) => preds.every(pred => pred(value));
}

export function Any(...preds: Predicate[]) {
  return (value: string) => preds.some(pred => pred(value));
}

export function Not(predicate: Predicate) {
  return (value: string) => !predicate(value);
}

/*
 * URN specifics
 */
export function IsUrn(namespace: string = 'ró') {
  return (value: string) => {
    return value.startsWith(`urn:${namespace}:`);
  };
}
