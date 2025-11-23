/*
 * ++++ Node search parameters
 */
export type NodeType = string;
export type NodePredicate = (val: NodeType) => boolean;
export type NodeQs = Record<string, string>;
export type NodeObjectQuery = {
  type?: string;
  id?: string | string[];
  predicate?: NodePredicate;
  qs?: NodeQs;
};
export type NodeSearch = NodeObjectQuery | string | string[];

/*
 * ++++ Relationship search parameters
 */
export type RelationType = string;
export type RelationPredicate = (val: RelationType) => boolean;
export type RelationObjectQuery = {
  relation: string | string[];
  predicate?: RelationPredicate;
};
export type RelationSearch = RelationObjectQuery | string | string[];

/*
 * ++ Search DSL (object and array formats)
 */
export type SearchObject = {
  source?: NodeObjectQuery[];
  relation?: RelationObjectQuery;
  target?: NodeObjectQuery[];
};
export type SearchArray = [
  NodeSearch | undefined,
  RelationSearch | undefined,
  NodeSearch | undefined,
];

export type Search = SearchObject | SearchArray;
