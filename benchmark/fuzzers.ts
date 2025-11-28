import * as Peach from "https://deno.land/x/peach_ts/src/mod.ts";
import type { Wrapped } from "https://deno.land/x/peach_ts/src/mod.ts";
const { uniform: U } = Peach.Number;
const { unwrap } = Peach;

/**
 * Generates a random string identifier of specified length using lowercase letters.
 */
export function ID(len: Peach.Wrapped<number>): Wrapped<string> {
  return Peach.String.from(Peach.String.lowercaseLetters(U), len)
}

/**
 * Generates a random type string of specified length using lowercase letters.
 */
export function Type(len: Peach.Wrapped<number>): Wrapped<string> {
  return Peach.String.from(Peach.String.lowercaseLetters(U), len)
}

/**
 * Generates a random query string key of specified length using lowercase letters.
 */
export function QSKey(len: Peach.Wrapped<number>): Wrapped<string> {
  return Peach.String.from(Peach.String.lowercaseLetters(U), len)
}

/**
 * Generates a random query string value of specified length using lowercase letters.
 */
export function QSValue(len: Peach.Wrapped<number>): Wrapped<string> {
  return Peach.String.from(Peach.String.lowercaseLetters(U), len)
}

export function QSPair(
  keyLen: Peach.Wrapped<number>,
  valueLen: Peach.Wrapped<number>,
): Wrapped<string> {
  return Peach.String.concat(QSKey(keyLen), "=", QSValue(valueLen));
}

/**
 * Generates a random node identifier using the ID fuzzer.
 */
export function NodeID(idLen: Peach.Wrapped<number>): Wrapped<string> {
  return ID(idLen)
}

export function NodeIDType(
  idLen: Peach.Wrapped<number>,
  typeLen: Peach.Wrapped<number>,
): Wrapped<string> {
  return Peach.String.concat(ID(idLen), ":", Type(typeLen));
}

/**
 * Generates a random node identifier with type and query string parameters
 * in the format "id:type?key1=value1&key2=value2".
 */
export function NodeIDTypeQS(
  idLen: Peach.Wrapped<number>,
  typeLen: Peach.Wrapped<number>,
  numQS: Peach.Wrapped<number>,
  qsKeyLen: Peach.Wrapped<number>,
  qsValueLen: Peach.Wrapped<number>,
): Wrapped<string> {
  const QSString = () => {
    const pairs: string[] = [];
    const count = unwrap(numQS);

    for (let idx = 0; idx < count; idx++) {
      const pair = unwrap(QSPair(qsKeyLen, qsValueLen));
      pairs.push(pair);
    }

    return pairs.join("&");
  };

  return Peach.String.concat(
    ID(idLen),
    ":",
    Type(typeLen),
    "?",
    QSString,
  );
}

/**
 * Generates a random relation string of specified length using lowercase letters.
 */
export function Relation(len: Peach.Wrapped<number>): Wrapped<string> {
  return Peach.String.from(Peach.String.lowercaseLetters(U), len)
}

/**
 * Generates a random triple with node IDs and relation as an array [subject, relation, object].
 */
export function TripleNodeId(
  idLen: Peach.Wrapped<number>,
  relationLen: Peach.Wrapped<number>,
): Wrapped<string[]> {
  return Peach.Array.concat(
    NodeID(idLen),
    Relation(relationLen),
    NodeID(idLen),
  )
}

/**
 * Generates a random triple with typed node IDs and relation as an array [subject:type, relation, target:type].
 */
export function TripleNodeIdType(
  idLen: Peach.Wrapped<number>,
  typeLen: Peach.Wrapped<number>,
  relationLen: Peach.Wrapped<number>,
): Wrapped<string[]> {
  return Peach.Array.concat(
    NodeIDType(idLen, typeLen),
    Relation(relationLen),
    NodeIDType(idLen, typeLen),
  )
}

/**
 * Generates a random triple with typed node IDs, query string parameters, and relation
 * as an array [subject:type?params, relation, target:type?params].
 */
export function TripleNodeIdTypeQS(
  idLen: Peach.Wrapped<number>,
  typeLen: Peach.Wrapped<number>,
  numQS: Peach.Wrapped<number>,
  qsKeyLen: Peach.Wrapped<number>,
  qsValueLen: Peach.Wrapped<number>,
  relationLen: Peach.Wrapped<number>,
): Wrapped<string[]> {
  return Peach.Array.concat(
    NodeIDTypeQS(idLen, typeLen, numQS, qsKeyLen, qsValueLen),
    Relation(relationLen),
    NodeIDTypeQS(idLen, typeLen, numQS, qsKeyLen, qsValueLen),
  );
}

export function TriplesNodeId(
  count: Peach.Wrapped<number>,
  idLen: Peach.Wrapped<number>,
  relationLen: Peach.Wrapped<number>,
): Wrapped<string[][]> {
  return Peach.Array.from(
    TripleNodeId(idLen, relationLen),
    count,
  );
}

export function TriplesNodeIdType(
  count: Peach.Wrapped<number>,
  idLen: Peach.Wrapped<number>,
  typeLen: Peach.Wrapped<number>,
  relationLen: Peach.Wrapped<number>,
): Wrapped<string[][]> {
  return Peach.Array.from(
    TripleNodeIdType(idLen, typeLen, relationLen),
    count,
  );
}

export function TriplesNodeIdTypeQS(
  count: Peach.Wrapped<number>,
  idLen: Peach.Wrapped<number>,
  typeLen: Peach.Wrapped<number>,
  numQS: Peach.Wrapped<number>,
  qsKeyLen: Peach.Wrapped<number>,
  qsValueLen: Peach.Wrapped<number>,
  relationLen: Peach.Wrapped<number>,
): Wrapped<string[][]> {
  return Peach.Array.from(
    TripleNodeIdTypeQS(
      idLen,
      typeLen,
      numQS,
      qsKeyLen,
      qsValueLen,
      relationLen,
    ),
    count,
  );
}
