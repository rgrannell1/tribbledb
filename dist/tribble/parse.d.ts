import { IndexedSet } from "../sets.ts";
import type { Triple } from "../types.ts";
export declare class TribbleParser {
    stringIndex: IndexedSet;
    constructor();
    parseTriple(line: string): Triple;
    parseDeclaration(line: string): void;
    parse(line: string): Triple | undefined;
}
//# sourceMappingURL=parse.d.ts.map