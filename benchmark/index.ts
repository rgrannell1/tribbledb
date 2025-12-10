/* */

export type BenchmarkConfiguration<T> = {
  // What are we testing? e.g `insert triples`
  experiment: string;
  // How many triples are we using?
  sampleSize: number;
  // Which subgroup is being tested? E.g `NodeID, high uniqueness`
  category: string;
  parameters: T;
};
