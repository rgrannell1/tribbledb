import { Dsl, Triple, TripleObject } from "./types.ts";
import { Index } from "./indices/index.ts";
import { Sets } from "./indices/sets.ts";

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
  index: Index;
  triplesCount: number;

  constructor(triples: Triple[]) {
    this.index = new Index(triples);
    this.triplesCount = triples.length;
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
    // Use the index's efficient add method instead of rebuilding
    this.index.add(triples);
    this.triplesCount += triples.length;
  }

  map(fn: (triple: Triple) => Triple): TribbleDB {
    return new TribbleDB(this.index.triples.map(fn));
  }

  flatMap(fn: (triple: Triple) => Triple[]): TribbleDB {
    const flatMappedTriples = this.index.triples.flatMap(fn) as Triple[];
    return new TribbleDB(flatMappedTriples);
  }

  first(): Triple | undefined {
    return this.index.triples.length > 0 ? this.index.triples[0] : undefined;
  }

  triples(): Triple[] {
    return this.index.triples;
  }

  sources(): Set<string> {
    return new Set(this.index.triples.map((triple) => Triples.source(triple)));
  }

  relations(): Set<string> {
    return new Set(
      this.index.triples.map((triple) => Triples.relation(triple)),
    );
  }

  targets(): Set<string> {
    return new Set(this.index.triples.map((triple) => Triples.target(triple)));
  }

  objects(): TripleObject[] {
    const objs: Record<string, TripleObject> = {};

    for (const [source, relation, target] of this.index.triples) {
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

  *search(
    params: { source?: Dsl; relation?: string; target?: Dsl },
  ): Generator<Triple> {
    // by default, all triples are in the intersection set. Then, we
    // only keep the triple rows that meet the other criteria too
    const indexes: Set<number>[] = [
      new Set<number>(
        Array.from({ length: this.triplesCount }, (_, index) => index),
      ),
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
          return;
        }
      }

      if (source.id) {
        const sourceIdSet = this.index.sourceId.get(source.id);
        if (sourceIdSet) {
          indexes.push(sourceIdSet);
        } else {
          return;
        }
      }

      if (source.qs) {
        for (const [key, val] of Object.entries(source.qs)) {
          const sourceQsSet = this.index.sourceQs.get(`${key}=${val}`);
          if (sourceQsSet) {
            indexes.push(sourceQsSet);
          } else {
            return;
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
          return;
        }
      }

      if (target.id) {
        const targetIdSet = this.index.targetId.get(target.id);
        if (targetIdSet) {
          indexes.push(targetIdSet);
        } else {
          return;
        }
      }

      if (target.qs) {
        for (const [key, val] of Object.entries(target.qs)) {
          const targetQsSet = this.index.targetQs.get(`${key}=${val}`);
          if (targetQsSet) {
            indexes.push(targetQsSet);
          } else {
            return;
          }
        }
      }
    }

    if (relation) {
      const relationSet = this.index.relations.get(relation);
      if (relationSet) {
        indexes.push(relationSet);
      } else {
        return;
      }
    }

    const intersection = Sets.intersection(indexes);

    // Yield triples one by one, applying predicate filters as we go
    for (const index of intersection) {
      const triple = this.index.triples[index];

      // Apply predicate filters if present
      if (source?.predicate || target?.predicate) {
        const sourceMatches = source?.predicate
          ? source.predicate(Triples.source(triple))
          : true;
        const targetMatches = target?.predicate
          ? target.predicate(Triples.target(triple))
          : true;

        if (sourceMatches && targetMatches) {
          yield triple;
        }
      } else {
        yield triple;
      }
    }
  }

  searchArray(
    params: { source?: Dsl; relation?: string; target?: Dsl },
  ): Triple[] {
    return Array.from(this.search(params));
  }
}
