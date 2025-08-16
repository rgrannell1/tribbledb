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
export class TribbleStringifier {
  stringIndex: IndexedSet;

  constructor() {
    this.stringIndex = new IndexedSet();
  }

  stringify(triple: Triple): string {
    const message: string[] = [];
    const [source, relation, target] = triple;

    for (const value of [source, relation, target]) {
      if (!this.stringIndex.has(value)) {
        const newId = this.stringIndex.add(value);
        const stringifiedValue = value === "null" || value === null
          ? JSON.stringify("null")
          : JSON.stringify(value.toString());

        message.push(`${newId} ${stringifiedValue}`);
      }
    }

    message.push(
      `${this.stringIndex.getIndex(source)} ${
        this.stringIndex.getIndex(relation)
      } ${this.stringIndex.getIndex(target)}`,
    );

    return message.join("\n");
  }
}
