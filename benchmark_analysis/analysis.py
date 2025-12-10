
import pandas as pd
import json
from pathlib import Path

def read_benchmarks() -> pd.DataFrame:
  """Read all benchmark information into a single Dataframe"""
  benchmark_dir = Path(__file__).parent.parent / 'benchmark_results'
  benchmark_files = list(benchmark_dir.glob('*.json'))

  all_rows = []

  for file_path in benchmark_files:
    # Skip empty files
    if file_path.stat().st_size == 0:
      continue

    try:
      with open(file_path, 'r') as fle:
        data = json.load(fle)
    except (json.JSONDecodeError, ValueError) as err:
      print(f"Warning: Skipping {file_path.name}: {err}")
      continue

    if not data:
      continue

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

      try:
        experiment_data = json.loads(bench_name)
      except (json.JSONDecodeError, ValueError) as err:
        print(f"Warning: Skipping benchmark with invalid name in {file_path.name}: {err}")
        continue

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
          'implementation': experiment_data.get('implementation', 'unknown'),
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


def plot_old_vs_new_comparison(dfr: pd.DataFrame, metric: str = 'avg_ns', output_path: str = 'old_vs_new_comparison.png'):
  """
  Create a stacked bar graph comparing old vs new TribbleDB implementations.

  Args:
    dfr: DataFrame with benchmark results
    metric: The performance metric to plot (e.g., 'avg_ns', 'p99_ns')
    output_path: Path to save the plot
  """
  import matplotlib.pyplot as plt
  from plotnine import ggplot, aes, geom_col, facet_wrap, labs, theme_minimal, position_dodge, theme, element_text

  # Filter to only recent results with implementation field
  recent_dfr = dfr[dfr['implementation'].isin(['old', 'new'])].copy()

  if recent_dfr.empty:
    print("No data with 'old' or 'new' implementation tags found.")
    return

  # Get most recent date for each implementation/experiment/category/sampleSize combo
  recent_dfr = recent_dfr.sort_values('date', ascending=False)
  recent_dfr = recent_dfr.groupby(['experiment', 'implementation', 'category', 'sampleSize']).first().reset_index()

  # Convert nanoseconds to milliseconds for readability
  recent_dfr['time_ms'] = recent_dfr[metric] / 1_000_000

  # Create a combined label for better visualization
  recent_dfr['test_label'] = recent_dfr['experiment'] + ' - ' + recent_dfr['category']

  # Create the plot using ggplot
  plot = (
    ggplot(recent_dfr, aes(x='factor(sampleSize)', y='time_ms', fill='implementation')) +
    geom_col(position='dodge') +
    facet_wrap('~ test_label', scales='free_y', ncol=2) +
    labs(
      title=f'TribbleDB Performance: Old vs New Implementation',
      x='Sample Size',
      y=f'Time (ms) - {metric}',
      fill='Implementation'
    ) +
    theme_minimal() +
    theme(
      axis_text_x=element_text(rotation=45, hjust=1),
      figure_size=(14, 10)
    )
  )

  plot.save(output_path, dpi=300, verbose=False)
  print(f"Saved comparison plot to {output_path}")

  return plot


def plot_performance_summary(dfr: pd.DataFrame, output_path: str = 'performance_summary.png'):
  """
  Create a summary comparison showing speedup factors between old and new.

  Args:
    dfr: DataFrame with benchmark results
    output_path: Path to save the plot
  """
  import matplotlib.pyplot as plt
  from plotnine import ggplot, aes, geom_col, geom_text, facet_wrap, labs, theme_minimal, theme, element_text, position_dodge

  # Filter to recent results with both implementations
  recent_dfr = dfr[dfr['implementation'].isin(['old', 'new'])].copy()

  if recent_dfr.empty:
    print("No data with 'old' or 'new' implementation tags found.")
    return

  # Get most recent date for each combo
  recent_dfr = recent_dfr.sort_values('date', ascending=False)
  recent_dfr = recent_dfr.groupby(['experiment', 'implementation', 'category', 'sampleSize']).first().reset_index()

  # Pivot to calculate speedup
  pivot_dfr = recent_dfr.pivot_table(
    index=['experiment', 'category', 'sampleSize'],
    columns='implementation',
    values='avg_ns'
  ).reset_index()

  # Calculate speedup (old / new) - values > 1 mean new is faster
  if 'old' in pivot_dfr.columns and 'new' in pivot_dfr.columns:
    pivot_dfr['speedup'] = pivot_dfr['old'] / pivot_dfr['new']
    pivot_dfr['test_label'] = pivot_dfr['experiment'] + ' - ' + pivot_dfr['category']

    # Create plot
    plot = (
      ggplot(pivot_dfr, aes(x='factor(sampleSize)', y='speedup')) +
      geom_col(fill='steelblue') +
      geom_text(aes(label='speedup.round(2)'), va='bottom', size=8) +
      facet_wrap('~ test_label', scales='free_x', ncol=2) +
      labs(
        title='Performance Speedup: New vs Old TribbleDB',
        subtitle='Values > 1.0 indicate new implementation is faster',
        x='Sample Size',
        y='Speedup Factor (Old / New)'
      ) +
      theme_minimal() +
      theme(
        axis_text_x=element_text(rotation=45, hjust=1),
        figure_size=(14, 10)
      )
    )

    plot.save(output_path, dpi=300, verbose=False)
    plot.save(output_path, dpi=300, verbose=False)
    print(f"Saved speedup summary to {output_path}")

    return plot
  else:
    print("Missing 'old' or 'new' implementation data for comparison.")
    return None


if __name__ == '__main__':
  # Read all benchmark data
  print("Reading benchmark data...")
  dfr = read_benchmarks()
  print(f"Loaded {len(dfr)} benchmark results")

  # Generate comparison plots
  output_dir = Path(__file__).parent

  # Plot old vs new comparison
  print("\nGenerating old vs new comparison plot...")
  plot_old_vs_new_comparison(dfr, metric='avg_ns', output_path=str(output_dir / 'old_vs_new_comparison.png'))

  # Plot speedup summary
  print("\nGenerating speedup summary plot...")
  plot_performance_summary(dfr, output_path=str(output_dir / 'performance_speedup.png'))

  print("\nDone! Plots saved to benchmark_analysis directory.")
