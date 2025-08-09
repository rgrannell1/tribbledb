import { Pattern, Triple, TripleObject } from "./types.ts";
import { truth } from "./predicates.ts";
import { Index } from "./indices/index.ts";

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

export class TribbleDB {
  #triples: Triple[] = [];

  constructor(triples: Triple[] = []) {
    this.#triples = triples;
  }

  static of(triples: Triple[]): TribbleDB {
    return new TribbleDB(triples);
  }

  static from(objects: TripleObject[]): TribbleDB {
    const triples: Triple[] = [];

    for (const obj of objects) {
      const { id, ...relations } = obj;

      for (const [relation, target] of Object.entries(relations)) {
        if (Array.isArray(target)) {
          for (const sub of target) {
            triples.push([id as string, relation, sub]);
          }
        } else {
          triples.push([id as string, relation, target]);
        }
      }
    }

    return new TribbleDB(triples);
  }

  add(triples: Triple[]): void {
    this.#triples.push(...triples);
  }

  map(
    fn: (triple: Triple) => Triple,
  ): TribbleDB {
    return new TribbleDB(this.#triples.map(fn));
  }

  flatMap(
    fn: (triple: Triple) => Triple[],
  ): TribbleDB {
    return new TribbleDB(this.#triples.flatMap(fn) as Triple[]);
  }

  /*
   * Test if a pattern matches a source/relation/target value.
   */
  #matches(pattern: Pattern, value: string): boolean {
    if (typeof pattern === "string") {
      return pattern === value;
    } else if (typeof pattern === "function") {
      return pattern(value);
    }
    return false;
  }

  /**
   * Finds triples in the database that match the given patterns.
   *
   * @param source   - The pattern for the source of the triple.
   * @param relation - The pattern for the relation of the triple.
   * @param target   - The pattern for the target of the triple.
   *
   * @returns A new TribbleDB instance containing matching triples.
   */
  filter(
    source: Pattern = truth,
    relation: Pattern = truth,
    target: Pattern = truth,
  ) {
    return new TribbleDB(this.#triples.filter((triple) => {
      return this.#matches(source, Triples.source(triple)) &&
        this.#matches(relation, Triples.relation(triple)) &&
        this.#matches(target, Triples.target(triple));
    }));
  }

  find(
    source: Pattern = truth,
    relation: Pattern = truth,
    target: Pattern = truth,
  ): TribbleDB {
    const result = this.#triples.find((triple) => {
      return this.#matches(source, Triples.source(triple)) &&
        this.#matches(relation, Triples.relation(triple)) &&
        this.#matches(target, Triples.target(triple));
    });

    if (result) {
      return new TribbleDB([result]);
    }

    return new TribbleDB([]);
  }

  exists(
    source: Pattern = truth,
    relation: Pattern = truth,
    target: Pattern = truth,
  ): boolean {
    return this.#triples.some((triple) => {
      return this.#matches(source, Triples.source(triple)) &&
        this.#matches(relation, Triples.relation(triple)) &&
        this.#matches(target, Triples.target(triple));
    });
  }

  hasSource(source: Pattern): boolean {
    return this.#triples.some((triple) =>
      this.#matches(source, Triples.source(triple))
    );
  }

  hasRelation(relation: Pattern): boolean {
    return this.#triples.some((triple) =>
      this.#matches(relation, Triples.relation(triple))
    );
  }

  hasTarget(target: Pattern): boolean {
    return this.#triples.some((triple) =>
      this.#matches(target, Triples.target(triple))
    );
  }

  first(): Triple | undefined {
    return this.#triples.length > 0 ? this.#triples[0] : undefined;
  }

  triples(): Triple[] {
    return this.#triples;
  }
  sources(): Set<string> {
    return new Set(this.#triples.map((triple) => Triples.source(triple)));
  }

  relations(): Set<string> {
    return new Set(this.#triples.map((triple) => Triples.relation(triple)));
  }

  targets(): Set<string> {
    return new Set(this.#triples.map((triple) => Triples.target(triple)));
  }

  objects(): TripleObject[] {
    const objs: Record<string, TripleObject> = {};

    for (const [source, relation, target] of this.#triples) {
      if (!objs[source]) {
        objs[source] = {};
      }
      if (!objs[source][relation]) {
        objs[source][relation] = target;
      } else if (Array.isArray(objs[source][relation])) {
        (objs[source][relation] as string[]).push(target);
      } else {
        objs[source][relation] = [objs[source][relation] as string, target];
      }
    }

    const output: TripleObject[] = [];

    for (const [id, obj] of Object.entries(objs)) {
      obj.id = id;
      output.push(obj);
    }

    return output;
  }
}


export class NewIndexBasedTribbleDB {
  index: Index;
  triplesCount: number;

  constructor(triples: Triple[]) {
    this.index = new Index(triples);
    this.triplesCount = triples.length;
  }

  search(params: { source?: Dsl; relation?: string; target?: Dsl }): Triple[] {
    // by default, all triples are in the intersection set. Then, we
    // only keep the triple rows that meet the other criteria too
    const indexes: Set<number>[] = [
      new Set<number>(Array.from({ length: this.triplesCount }, (_, index) => index))
    ];

    const source = params.source;
    const relation = params.relation;
    const target = params.target;

    if (source) {
      if (source.type) {
        const sourceTypeSet = this.index.sourceType.get(source.type);
        if (sourceTypeSet) {
          indexes.push(sourceTypeSet);
        } else {
          return [];
        }
      }

      if (source.id) {
        const sourceIdSet = this.index.sourceId.get(source.id);
        if (sourceIdSet) {
          indexes.push(sourceIdSet);
        } else {
          return [];
        }
      }

      if (source.qs) {
        for (const [key, val] of Object.entries(source.qs)) {
          const sourceQsSet = this.index.sourceQs.get(`${key}=${val}`);
          if (sourceQsSet) {
            indexes.push(sourceQsSet);
          } else {
            return [];
          }
        }
      }
    }

    if (target) {
      if (target.type) {
        const targetTypeSet = this.index.targetType.get(target.type);
        if (targetTypeSet) {
          indexes.push(targetTypeSet);
        } else {
          return [];
        }
      }

      if (target.id) {
        const targetIdSet = this.index.targetId.get(target.id);
        if (targetIdSet) {
          indexes.push(targetIdSet);
        } else {
          return [];
        }
      }

      if (target.qs) {
        for (const [key, val] of Object.entries(target.qs)) {
          const targetQsSet = this.index.targetQs.get(`${key}=${val}`);
          if (targetQsSet) {
            indexes.push(targetQsSet);
          } else {
            return [];
          }
        }
      }
    }

    if (relation) {
      const relationSet = this.index.relations.get(relation);
      if (relationSet) {
        indexes.push(relationSet);
      } else {
        return [];
      }
    }

    const intersection = Set.intersection(indexes);
    let matchingTriples = Array.from(intersection).map(index => this.index.triples[index]);

    // Apply predicate filters if present
    if (source?.predicate || target?.predicate) {
      matchingTriples = matchingTriples.filter(triple => {
        const sourceMatches = source?.predicate ? source.predicate(Triples.source(triple)) : true;
        const targetMatches = target?.predicate ? target.predicate(Triples.target(triple)) : true;

        return sourceMatches && targetMatches;
      });
    }

    return matchingTriples;
  }
}
