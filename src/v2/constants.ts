/*
 * Bounds and packing constants for the v2 engine.
 */

// Node interner ids must fit in 28 bits so (relation, target) packs exactly
// into a float64 integer (relation * 2^28 + target < 2^53).
export const MAX_NODE_IDS = 2 ** 28;

// Relation interner ids must fit in 25 bits for the same packing bound.
export const MAX_RELATION_IDS = 2 ** 25;

// Multiplier packing a (relation, target) pair into one exact integer key.
export const TARGET_PACK_SPAN = 2 ** 28;
