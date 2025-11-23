/*
0 "Allianz Insurance"
1 "id"
src 0 rel 1 tgt 0
2 "is"
3 "Insurance Company"
src 0 rel 2 tgt 3
*/

import { IndexedSet } from "../sets.ts";
import type { Triple } from "../types.ts";

/*
 * Streaming stringify into tribble format
 */
export class TribbleParser {
  stringIndex: IndexedSet;

  constructor() {
    this.stringIndex = new IndexedSet();
  }

  /*
   * Parse a triple-line of tribble format text, and return a triple
   */
  parseTriple(line: string): Triple {
    const match = line.match(/^(\d+) (\d+) (\d+)$/);
    if (!match) {
      throw new SyntaxError(`Invalid format for triple line: ${line}`);
    }

    const src = this.stringIndex.getValue(parseInt(match[1], 10));
    const rel = this.stringIndex.getValue(parseInt(match[2], 10));
    const tgt = this.stringIndex.getValue(parseInt(match[3], 10));

    if (src === undefined || rel === undefined || tgt === undefined) {
      throw new SyntaxError(`Invalid triple reference: ${line}`);
    }

    return [src, rel, tgt];
  }

  /*
   * Parse a declaration line of tribble format text, and
   * update the index.
   */
  parseDeclaration(line: string): void {
    const match = line.match(/^(\d+) "(.*)"$/);
    if (!match) {
      throw new SyntaxError(`Invalid format for declaration line: ${line}`);
    }

    const id = match[1];
    const value = match[2];

    this.stringIndex.setIndex(value, parseInt(id, 10));
  }

  /*
   * Parse a line of tribble format text, and return a triple when possible. Otherwise
   * update the index.
   */
  parse(line: string): Triple | undefined {
    const isTriple = /^(\d+)\s(\d+)\s(\d+)$/;

    if (isTriple.test(line)) {
      return this.parseTriple(line);
    } else {
      this.parseDeclaration(line);
      return;
    }
  }
}
