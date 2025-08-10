import type { Triple } from "./types.ts";

/*
 * Static methods for interacting with triples.
 */
export class Triples {
  static source(triple: Triple): string {
    return triple[0];
  }

  static relation(triple: Triple): string {
    return triple[1];
  }

  static target(triple: Triple): string {
    return triple[2];
  }
}