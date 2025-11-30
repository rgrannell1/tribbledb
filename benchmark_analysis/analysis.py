
import pandas as pd
import json
from pathlib import Path

def read_benchmarks() -> pd.DataFrame:
  """Read all benchmark information into a single Dataframe"""
  benchmark_dir = Path(__file__).parent.parent / 'benchmark_results'
  benchmark_files = list(benchmark_dir.glob('*.json'))

  all_rows = []

  for file_path in benchmark_files:
    with open(file_path, 'r') as fle:
      data = json.load(fle)

    # Extract metadata
    metadata = {
      'date': data.get('date'),
      'version': data.get('version'),
      'commit_id': data.get('commit_id'),
      'filename': file_path.name
    }

    results = data.get('results', {})
    runtime = results.get('runtime', '')
    cpu = results.get('cpu', '')
    benches = results.get('benches', [])

    # Process each benchmark
    for bench in benches:
      bench_name = bench.get('name', '')

      experiment_data = json.loads(bench_name)

      bench_results = bench.get('results', [])
      if bench_results and 'ok' in bench_results[0]:
        stats = bench_results[0]['ok']

        row = {
          **metadata,
          'runtime': runtime,
          'cpu': cpu,
          'origin': bench.get('origin', ''),
          'group': bench.get('group', ''),
          'experiment': experiment_data.get('experiment'),
          'sampleSize': experiment_data.get('sampleSize'),
          'category': experiment_data.get('category'),
          'n_samples': stats.get('n'),
          'min_ns': stats.get('min'),
          'max_ns': stats.get('max'),
          'avg_ns': stats.get('avg'),
          'p75_ns': stats.get('p75'),
          'p99_ns': stats.get('p99'),
          'p995_ns': stats.get('p995'),
          'p999_ns': stats.get('p999'),
        }

        all_rows.append(row)

  dfr = pd.DataFrame(all_rows)

  if 'date' in dfr.columns:
    dfr['date'] = pd.to_datetime(dfr['date'])

  # Convert numeric columns
  numeric_cols = ['sampleSize', 'n_samples', 'min_ns', 'max_ns', 'avg_ns',
                  'p75_ns', 'p99_ns', 'p995_ns', 'p999_ns']
  for col in numeric_cols:
    if col in dfr.columns:
      dfr[col] = pd.to_numeric(dfr[col], errors='coerce')

  return dfr

# analysis; look at scaling with respect to parameter count
# for each experiment, different graph
# bar graphs for groups
# nice title
# in future, plot of inter-revision differences
