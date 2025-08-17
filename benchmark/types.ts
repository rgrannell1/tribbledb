
export type ExperimentResult = {
  label: string;
  samples: number;
  p05: number;
  p50: number;
  p95: number;
  mean: number;
  stdev: number;
}

export interface IExperiment {
  setup(): this;
  run(samples: number): ExperimentResult;
}
