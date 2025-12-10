# Benchmark Analysis

This directory contains tools for analyzing TribbleDB benchmark results.

## Setup

Install required Python packages:

```bash
pip install -r requirements.txt
```

## Version Comparison Analysis (NEW)

Track performance changes across different git commits using the new version comparison tools:

### Python Module

Run the standalone analysis:

```bash
python benchmark_analysis/version_comparison.py
```

This generates:
- **`performance_over_time.png`** - Line plots showing performance trends across commits
- **`commit_comparison.png`** - Bar charts comparing commits against a baseline
- **`performance_distribution.png`** - Violin/box plots showing performance distributions
- **`performance_summary.csv`** - Summary statistics for all commits

### Jupyter Notebook

For interactive analysis, use the Jupyter notebook:

```bash
cd benchmark_analysis
jupyter notebook version_comparison.ipynb
```

The notebook provides:
- Performance over time visualization
- Commit-to-commit comparisons
- Custom baseline comparisons
- Experiment-specific deep dives
- Statistical summaries

## Legacy Analysis (Old vs New)

The original analysis script compares old vs new implementations:

```bash
python benchmark_analysis/analysis.py
```

This generates:
1. **`old_vs_new_comparison.png`** - Side-by-side comparison
2. **`performance_speedup.png`** - Speedup factors

## Running Benchmarks

Run benchmarks with:

```bash
./bs/bench.sh
```

Benchmark results are saved to `benchmark_results/` with commit IDs for version tracking.

## Benchmark Files

- `accessors.bench.ts` - Tests accessor methods (firstObject, objects)
- `deleting.bench.ts` - Tests deletion performance
- `indexing.bench.ts` - Tests insertion/indexing performance
- `searchflatmap.bench.ts` - Tests searchFlatmap performance

All benchmark files now test both implementations for direct comparison.
