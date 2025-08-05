
import { IndexedSet } from "./indices/double-map.ts";
import { ParsedUrn, Triple } from "./mod.ts";
import { TEST_TRIPLES } from "./test-triples.ts";
import { parseUrn } from "./urn.ts";

export function updateUrnIndex(
  byUrnIndex: Map<number, Map<string, number[]>>,
  leftIdx: number,
  rel: string,
  rightIdx: number,
) {
  if (!byUrnIndex.has(leftIdx)) {
    byUrnIndex.set(leftIdx, new Map());
  }

  const relMap = byUrnIndex.get(leftIdx)!;

  if (!relMap.has(rel)) {
    relMap.set(rel, []);
  }

  relMap.get(rel)!.push(rightIdx);
}

export function updateTypeIndex(
  byTypeIndex: Map<string, Map<number, Map<string, number[]>>>,
  leftUrn: ParsedUrn,
  leftIdx: number,
  rel: string,
  rightIdx: number,
) {
  const type = leftUrn.type;
  if (!byTypeIndex.has(type)) {
    byTypeIndex.set(type, new Map());
  }

  const typeMap = byTypeIndex.get(type)!;
  if (!typeMap.has(leftIdx)) {
    typeMap.set(leftIdx, new Map());
  }

  const relMap = typeMap.get(leftIdx)!;
  if (!relMap.has(rel)) {
    relMap.set(rel, []);
  }

  relMap.get(rel)!.push(rightIdx);
}


/*
 * Compute indices to speed up lookup performance.
 *
 */
export function index(triples: Triple[]) {
  // map urns to a string -> number lookup

  const contentMap = new IndexedSet();

  // map URNs to their outbound relationships
  const sourceToTargetUrnIndex: Map<number, Map<string, number[]>> = new Map();
  // map URNs to their inbound relationships
  const targetToSourceUrnIndex: Map<number, Map<string, number[]>> = new Map();

  const sourceTypeToTargetUrnIndex: Map<string, Map<number, Map<string, number[]>>> = new Map();
  const targetTypeToSourceUrnIndex: Map<string, Map<number, Map<string, number[]>>> = new Map();

  for (const [source, rel, target] of triples) {
    // convert source / target to shorter reusable IDs
    const sourceIdx = contentMap.add(source);
    const targetIdx = contentMap.add(target);

    // update each URN relationship index
    updateUrnIndex(sourceToTargetUrnIndex, sourceIdx, rel, targetIdx);
    updateUrnIndex(targetToSourceUrnIndex, targetIdx, rel, sourceIdx);

    // build a LHS source -> target index, with acceleration when a `type` + `id` is known in advance
    try {
      const parsedSource = parseUrn(source)

      updateTypeIndex(sourceTypeToTargetUrnIndex, parsedSource, sourceIdx, rel, targetIdx);
    } catch (error) {}

    // build a RHS target -> source index, with acceleration when a `type` + `id` is known in advance
    try {
      const parsedTarget = parseUrn(target)

      updateTypeIndex(targetTypeToSourceUrnIndex, parsedTarget, targetIdx, rel, sourceIdx);
    } catch (error) {}
  }

  return {
    sourceToTargetUrnIndex,
    targetToSourceUrnIndex,
    sourceTypeToTargetUrnIndex,
    targetTypeToSourceUrnIndex,
    contentMap
  }
}

const x = index(TEST_TRIPLES)
console.log(x.contentMap.map())