import type { TribbleDBPerformanceMetrics } from "./metrics.ts";
export declare class IndexedSet {
    #private;
    constructor();
    map(): Map<string, number>;
    reverseMap(): Map<number, string>;
    add(value: string): number;
    /**
     * Set the index for a value in the set
     */
    setIndex(value: string, index: number): void;
    /**
     * Get the index for a value in the set
     */
    getIndex(value: string): number | undefined;
    /**
     * Set the values for an index in the set
     */
    getValue(idx: number): string | undefined;
    /**
     * Does this structure have a value?
     */
    has(value: string): boolean;
    clone(): IndexedSet;
}
export declare class Sets {
    static intersection<T>(metrics: TribbleDBPerformanceMetrics, sets: Set<T>[]): Set<T>;
    static append<T>(set0: Set<T>, set1: Set<T>): Set<T>;
}
//# sourceMappingURL=sets.d.ts.map