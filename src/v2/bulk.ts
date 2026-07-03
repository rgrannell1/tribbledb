/*
 * Bulk loader for the tribble text format. Feeds the format's dictionary
 * ids straight into the store's intern tables, so each distinct string is
 * hashed once at declaration rather than once per triple occurrence.
 *
 * Line handling matches TribbleParser exactly (including not unescaping
 * declaration values), with one leniency: blank lines are skipped.
 */

import type { TargetValidator } from "../types.ts";
import type { TripleStore } from "./store.ts";

const QUOTE_CHAR_CODE = 34;

function isDigits(text: string, from: number, to: number): boolean {
  if (to <= from) {
    return false;
  }
  for (let idx = from; idx < to; idx++) {
    const code = text.charCodeAt(idx);
    if (code < 48 || code > 57) {
      return false;
    }
  }
  return true;
}

function parseDigits(
  line: string,
  from: number,
  to: number,
  kind: string,
): number {
  if (!isDigits(line, from, to)) {
    throw new SyntaxError(`Invalid format for ${kind} line: ${line}`);
  }
  return parseInt(line.slice(from, to), 10);
}

/*
 * Load tribble-format lines into a store. Validation failures are
 * aggregated and thrown after the load, matching validateTriples output.
 */
export function loadTribbleLines(
  store: TripleStore,
  lines: Iterable<string>,
  validations: Record<string, TargetValidator>,
): void {
  // dictionary id -> declared string / interned ids, resolved lazily
  const dictValues: string[] = [];
  const dictNodeIds: (number | undefined)[] = [];
  const dictRelationIds: (number | undefined)[] = [];

  const hasValidators = Object.keys(validations).length > 0;
  const failures: string[] = [];

  for (const line of lines) {
    if (line.length === 0) {
      continue;
    }

    if (line.charCodeAt(line.length - 1) === QUOTE_CHAR_CODE) {
      // declaration: <id> "<value>"
      const spaceIdx = line.indexOf(' "');
      if (spaceIdx === -1) {
        throw new SyntaxError(`Invalid format for declaration line: ${line}`);
      }

      const dictId = parseDigits(line, 0, spaceIdx, "declaration");
      dictValues[dictId] = line.slice(spaceIdx + 2, line.length - 1);
      dictNodeIds[dictId] = undefined;
      dictRelationIds[dictId] = undefined;
      continue;
    }

    // triple: <srcId> <relId> <tgtId>
    const firstSpace = line.indexOf(" ");
    const secondSpace = line.indexOf(" ", firstSpace + 1);
    if (firstSpace === -1 || secondSpace === -1) {
      throw new SyntaxError(`Invalid format for triple line: ${line}`);
    }

    const srcDict = parseDigits(line, 0, firstSpace, "triple");
    const relDict = parseDigits(line, firstSpace + 1, secondSpace, "triple");
    const tgtDict = parseDigits(line, secondSpace + 1, line.length, "triple");

    const srcValue = dictValues[srcDict];
    const relValue = dictValues[relDict];
    const tgtValue = dictValues[tgtDict];
    if (
      srcValue === undefined || relValue === undefined ||
      tgtValue === undefined
    ) {
      throw new SyntaxError(`Invalid triple reference: ${line}`);
    }

    let sourceId = dictNodeIds[srcDict];
    if (sourceId === undefined) {
      sourceId = store.internNode(srcValue);
      dictNodeIds[srcDict] = sourceId;
    }

    let relationId = dictRelationIds[relDict];
    if (relationId === undefined) {
      relationId = store.relationNames.intern(relValue);
      dictRelationIds[relDict] = relationId;
    }

    let targetId = dictNodeIds[tgtDict];
    if (targetId === undefined) {
      targetId = store.internNode(tgtValue);
      dictNodeIds[tgtDict] = targetId;
    }

    if (hasValidators) {
      const validator = validations[relValue];
      if (validator) {
        const meta = store.nodeMeta.get(sourceId)!;
        const sourceType = store.nodes.valueOf(meta.typeId);
        const res = validator(sourceType, relValue, tgtValue);
        if (typeof res === "string") {
          failures.push(res);
        }
      }
    }

    store.addRowByIds(sourceId, relationId, targetId);
  }

  if (failures.length > 0) {
    throw new Error(`Triple validation failed:\n- ${failures.join("\n- ")}`);
  }
}
