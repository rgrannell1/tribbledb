import { Triples } from "../index.ts";
import { Dsl, Triple } from "../types.ts";
import { asUrn } from "../urn.ts";
import { Sets } from "./sets.ts";


/*
 * Construct an index to accelerate triple searches. Normally
 * search would be done through a linear table scan, but it can
 * be sped up by mapping each queryable term (e.g `source.id`) to
 * a set of indices of triples which match this term.
 */
export class Index {
  triples: Triple[];

  sourceType: Map<string, Set<number>>
  sourceId: Map<string, Set<number>>
  // note: QS uses a composite key: <key>=<value>
  sourceQs: Map<string, Set<number>>

  relations: Map<string, Set<number>>

  targetType: Map<string, Set<number>>
  targetId: Map<string, Set<number>>
  targetQs: Map<string, Set<number>>

  constructor(triples: Triple[]) {
    this.triples = triples;
    this.sourceType = new Map();
    this.sourceId = new Map();
    this.sourceQs = new Map();
    this.relations = new Map();
    this.targetType = new Map();
    this.targetId = new Map();
    this.targetQs = new Map();
    this.indexTriples();
  }

  /*
   * Associate each triple onto an appropriate map `Term := <id>: <value>`
   */
  indexTriples() {
    for (let idx = 0; idx < this.triples.length; idx++) {
      const triple = this.triples[idx];

      const parsedSource = asUrn(Triples.source(triple));
      const relation = Triples.relation(triple);
      const parsedTarget = asUrn(Triples.target(triple));

      // source.type
      if (!this.sourceType.has(parsedSource.type)) {
        this.sourceType.set(parsedSource.type, new Set());
      }
      this.sourceType.get(parsedSource.type)!.add(idx);

      // source.id
      if (!this.sourceId.has(parsedSource.id)) {
        this.sourceId.set(parsedSource.id, new Set());
      }
      this.sourceId.get(parsedSource.id)!.add(idx);

      // source.qs
      for (const [key, val] of Object.entries(parsedSource.qs)) {
        if (!this.sourceQs.has(`${key}=${val}`)) {
          this.sourceQs.set(`${key}=${val}`, new Set());
        }

        this.sourceQs.get(`${key}=${val}`)!.add(idx);
      }

      // relation
      if (!this.relations.has(relation)) {
        this.relations.set(relation, new Set());
      }
      this.relations.get(relation)!.add(idx);

      // target.type
      if (!this.targetType.has(parsedTarget.type)) {
        this.targetType.set(parsedTarget.type, new Set());
      }
      this.targetType.get(parsedTarget.type)!.add(idx);
      // target.id
      if (!this.targetId.has(parsedTarget.id)) {
        this.targetId.set(parsedTarget.id, new Set());
      }
      this.targetId.get(parsedTarget.id)!.add(idx);
      // target.qs
      for (const [key, val] of Object.entries(parsedTarget.qs)) {
        if (!this.targetQs.has(`${key}=${val}`)) {
          this.targetQs.set(`${key}=${val}`, new Set());
        }

        this.targetQs.get(`${key}=${val}`)!.add(idx);
      }
    }
  }
}
