
import { Triple } from "./types.ts";

/*
 * Compute a hash of a string
 *
 */
export function hash(str: string): number {
    let hash = 0;
    for(let i = 0, len = str.length; i < len; i++){
        const chr = str.charCodeAt(i);
        hash = (hash << 5) - hash + chr;
        hash |= 0;
    }
    return hash;
}

/*
 * Compute a hash for a triple
 */
export function hashTriple(triple: Triple): number {
  const [src, rel, tgt] = triple;
  let hashValue = 0;
  for (let i = 0; i < src.length; i++) {
    hashValue = (hashValue << 5) - hashValue + src.charCodeAt(i);
    hashValue |= 0;
  }
  for (let i = 0; i < rel.length; i++) {
    hashValue = (hashValue << 5) - hashValue + rel.charCodeAt(i);
    hashValue |= 0;
  }
  for (let i = 0; i < tgt.length; i++) {
    hashValue = (hashValue << 5) - hashValue + tgt.charCodeAt(i);
    hashValue |= 0;
  }
  return hashValue;
}
