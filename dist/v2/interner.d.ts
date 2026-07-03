export declare class Interner {
    #private;
    constructor(maxIds: number);
    intern(value: string): number;
    idOf(value: string): number | undefined;
    valueOf(id: number): string;
    get size(): number;
}
//# sourceMappingURL=interner.d.ts.map