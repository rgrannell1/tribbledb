"""
Version Comparison Analysis for TribbleDB Benchmarks

This module provides tools to visualize performance changes across different
git commits/versions, allowing you to track performance improvements or
regressions over time.
"""

import pandas as pd
import json
from pathlib import Path
from typing import Optional, List


def read_benchmarks() -> pd.DataFrame:
    """Read all benchmark information into a single DataFrame"""
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


def plot_performance_over_time(
    dfr: pd.DataFrame,
    experiment: Optional[str] = None,
    metric: str = 'avg_ns',
    sample_sizes: Optional[List[int]] = None,
    output_path: str = 'performance_over_time.png'
):
    """
    Create line plots showing performance changes across commits/versions.

    Args:
        dfr: DataFrame with benchmark results
        experiment: Specific experiment to plot (None = all experiments)
        metric: The performance metric to plot (e.g., 'avg_ns', 'p99_ns')
        sample_sizes: List of sample sizes to include (None = all)
        output_path: Path to save the plot
    """
    from plotnine import (
        ggplot, aes, geom_line, geom_point, facet_grid, labs,
        theme_minimal, theme, element_text
    )

    # Filter data
    plot_data = dfr.copy()
    if experiment:
        plot_data = plot_data[plot_data['experiment'] == experiment]

    # Filter to specific sample sizes if requested
    if sample_sizes:
        plot_data = plot_data[plot_data['sampleSize'].isin(sample_sizes)]

    # Otherwise, select representative sample sizes to avoid overcrowding
    elif plot_data['sampleSize'].nunique() > 4:
        # Pick 3-4 representative sample sizes
        unique_sizes = sorted(plot_data['sampleSize'].unique())
        selected_sizes = [unique_sizes[0], unique_sizes[len(unique_sizes)//2], unique_sizes[-1]]
        plot_data = plot_data[plot_data['sampleSize'].isin(selected_sizes)]
        print(f"Auto-selected sample sizes: {selected_sizes}")

    if plot_data.empty:
        print("No data to plot.")
        return

    # Convert nanoseconds to milliseconds
    plot_data['time_ms'] = plot_data[metric] / 1_000_000

    # Shorten commit IDs for legend
    plot_data['commit_short'] = plot_data['commit_id'].str[:7]

    # Simplify category names if they're too long
    plot_data['category_short'] = plot_data['category'].str.replace(', high uniqueness', '').str.replace(', high duplicates', '')

    # Sort by date
    plot_data = plot_data.sort_values('date')

    # Create the plot with facet_grid for better organization
    plot = (
        ggplot(plot_data, aes(x='date', y='time_ms', color='commit_short', group='commit_short')) +
        geom_line(size=1) +
        geom_point(size=2.5) +
        facet_grid('experiment + category_short ~ sampleSize', labeller='label_both', scales='free_y') +
        labs(
            title=f'Performance Over Time',
            subtitle=f'Metric: {metric}',
            x='Date',
            y='Time (ms)',
            color='Commit'
        ) +
        theme_minimal() +
        theme(
            axis_text_x=element_text(rotation=45, hjust=1, size=7),
            strip_text=element_text(size=8),
            legend_position='bottom',
            legend_direction='horizontal',
            figure_size=(12, 16)
        )
    )

    plot.save(output_path, dpi=300, verbose=False)
    print(f"Saved performance over time plot to {output_path}")

    return plot


def plot_commit_comparison(
    dfr: pd.DataFrame,
    baseline_commit: str,
    comparison_commits: Optional[List[str]] = None,
    metric: str = 'avg_ns',
    sample_sizes: Optional[List[int]] = None,
    output_path: str = 'commit_comparison.png'
):
    """
    Compare performance of specific commits against a baseline.

    Args:
        dfr: DataFrame with benchmark results
        baseline_commit: Commit ID to use as baseline (100%)
        comparison_commits: List of commit IDs to compare (None = all other commits)
        metric: The performance metric to compare
        sample_sizes: List of sample sizes to include (None = auto-select)
        output_path: Path to save the plot
    """
    from plotnine import (
        ggplot, aes, geom_col, geom_hline, facet_grid, labs,
        theme_minimal, theme, element_text
    )

    # Get baseline data
    baseline_data = dfr[dfr['commit_id'].str.startswith(baseline_commit[:7])].copy()

    if baseline_data.empty:
        print(f"No data found for baseline commit {baseline_commit}")
        return

    # Get comparison data
    if comparison_commits:
        comparison_data = dfr[dfr['commit_id'].str.startswith(tuple(cmt[:7] for cmt in comparison_commits))].copy()
    else:
        comparison_data = dfr[~dfr['commit_id'].str.startswith(baseline_commit[:7])].copy()

    if comparison_data.empty:
        print("No comparison data found")
        return

    # Filter sample sizes
    if sample_sizes:
        baseline_data = baseline_data[baseline_data['sampleSize'].isin(sample_sizes)]
        comparison_data = comparison_data[comparison_data['sampleSize'].isin(sample_sizes)]
    elif dfr['sampleSize'].nunique() > 4:
        unique_sizes = sorted(dfr['sampleSize'].unique())
        selected_sizes = [unique_sizes[0], unique_sizes[len(unique_sizes)//2], unique_sizes[-1]]
        baseline_data = baseline_data[baseline_data['sampleSize'].isin(selected_sizes)]
        comparison_data = comparison_data[comparison_data['sampleSize'].isin(selected_sizes)]
        print(f"Auto-selected sample sizes: {selected_sizes}")

    # Merge baseline with comparison
    baseline_grouped = baseline_data.groupby(
        ['experiment', 'category', 'sampleSize']
    )[metric].mean().reset_index()
    baseline_grouped.columns = ['experiment', 'category', 'sampleSize', 'baseline_time']

    comparison_grouped = comparison_data.groupby(
        ['experiment', 'category', 'sampleSize', 'commit_id']
    )[metric].mean().reset_index()

    merged = comparison_grouped.merge(
        baseline_grouped,
        on=['experiment', 'category', 'sampleSize'],
        how='inner'
    )

    # Calculate percentage change (negative = faster)
    merged['pct_change'] = ((merged[metric] - merged['baseline_time']) / merged['baseline_time']) * 100

    # Shorten commit IDs and categories
    merged['commit_short'] = merged['commit_id'].str[:7]
    merged['category_short'] = merged['category'].str.replace(', high uniqueness', '').str.replace(', high duplicates', '')

    # Create plot with facet_grid
    plot = (
        ggplot(merged, aes(x='commit_short', y='pct_change', fill='commit_short')) +
        geom_col() +
        geom_hline(yintercept=0, linetype='dashed', color='red', alpha=0.7, size=0.5) +
        facet_grid('experiment + category_short ~ sampleSize', labeller='label_both', scales='free') +
        labs(
            title=f'Performance vs Baseline ({baseline_commit[:7]})',
            subtitle='Negative % = faster, Positive % = slower',
            x='Commit',
            y='% Change',
            fill='Commit'
        ) +
        theme_minimal() +
        theme(
            axis_text_x=element_text(rotation=45, hjust=1, size=7),
            axis_text_y=element_text(size=7),
            strip_text=element_text(size=8),
            legend_position='bottom',
            legend_direction='horizontal',
            figure_size=(10, 14)
        )
    )

    plot.save(output_path, dpi=300, verbose=False)
    print(f"Saved commit comparison plot to {output_path}")

    return plot


def plot_performance_distribution(
    dfr: pd.DataFrame,
    experiment: Optional[str] = None,
    sample_size: Optional[int] = None,
    output_path: str = 'performance_distribution.png'
):
    """
    Create violin/box plots showing performance distribution across commits.

    Args:
        dfr: DataFrame with benchmark results
        experiment: Specific experiment to plot (None = all experiments)
        sample_size: Specific sample size to plot (None = largest)
        output_path: Path to save the plot
    """
    from plotnine import (
        ggplot, aes, geom_boxplot, facet_grid, labs,
        theme_minimal, theme, element_text
    )

    # Filter data
    plot_data = dfr.copy()
    if experiment:
        plot_data = plot_data[plot_data['experiment'] == experiment]

    # Select a single sample size to avoid overcrowding
    if sample_size:
        plot_data = plot_data[plot_data['sampleSize'] == sample_size]
    else:
        # Use the largest sample size
        max_size = plot_data['sampleSize'].max()
        plot_data = plot_data[plot_data['sampleSize'] == max_size]
        print(f"Using sample size: {max_size}")

    if plot_data.empty:
        print("No data to plot.")
        return

    # Convert to milliseconds
    plot_data['time_ms'] = plot_data['avg_ns'] / 1_000_000

    # Shorten identifiers
    plot_data['commit_short'] = plot_data['commit_id'].str[:7]
    plot_data['category_short'] = plot_data['category'].str.replace(', high uniqueness', '').str.replace(', high duplicates', '')

    # Create plot with facet_grid
    plot = (
        ggplot(plot_data, aes(x='commit_short', y='time_ms', fill='commit_short')) +
        geom_boxplot(alpha=0.7) +
        facet_grid('experiment ~ category_short', scales='free_y', labeller='label_both') +
        labs(
            title='Performance Distribution by Commit',
            subtitle=f"Sample size: {plot_data['sampleSize'].iloc[0]}",
            x='Commit',
            y='Time (ms)'
        ) +
        theme_minimal() +
        theme(
            axis_text_x=element_text(rotation=45, hjust=1, size=7),
            strip_text=element_text(size=8),
            legend_position='none',
            figure_size=(10, 12)
        )
    )

    plot.save(output_path, dpi=300, verbose=False)
    print(f"Saved performance distribution plot to {output_path}")

    return plot


def plot_simple_comparison(
    dfr: pd.DataFrame,
    experiment: str,
    category: str,
    metric: str = 'avg_ns',
    output_path: str = 'simple_comparison.png'
):
    """
    Create a simple, focused comparison plot for a specific experiment and category.

    Args:
        dfr: DataFrame with benchmark results
        experiment: Experiment name (e.g., 'Insert Triples')
        category: Category name (e.g., 'NodeID')
        metric: Performance metric to plot
        output_path: Path to save the plot
    """
    from plotnine import (
        ggplot, aes, geom_line, geom_point, labs,
        theme_minimal, theme, scale_color_brewer
    )

    # Filter to specific experiment and category
    plot_data = dfr[
        (dfr['experiment'] == experiment) &
        (dfr['category'].str.contains(category))
    ].copy()

    if plot_data.empty:
        print(f"No data found for experiment='{experiment}', category containing '{category}'")
        return

    # Convert to milliseconds
    plot_data['time_ms'] = plot_data[metric] / 1_000_000
    plot_data['commit_short'] = plot_data['commit_id'].str[:7]

    # Sort by date and sample size
    plot_data = plot_data.sort_values(['date', 'sampleSize'])

    # Create plot
    plot = (
        ggplot(plot_data, aes(x='sampleSize', y='time_ms', color='commit_short', group='commit_short')) +
        geom_line(size=1.2) +
        geom_point(size=3) +
        labs(
            title=f'{experiment} - {category}',
            subtitle=f'Metric: {metric}',
            x='Sample Size',
            y='Time (ms)',
            color='Commit'
        ) +
        scale_color_brewer(type='qual', palette='Set1') +
        theme_minimal() +
        theme(
            legend_position='right',
            figure_size=(10, 6)
        )
    )

    plot.save(output_path, dpi=300, verbose=False)
    print(f"Saved simple comparison plot to {output_path}")

    return plot


def generate_performance_summary(dfr: pd.DataFrame) -> pd.DataFrame:
    """
    Generate a summary table of performance across commits.

    Args:
        dfr: DataFrame with benchmark results

    Returns:
        Summary DataFrame with statistics per commit
    """
    summary = dfr.groupby(['commit_id', 'date', 'version']).agg({
        'avg_ns': ['mean', 'median', 'std'],
        'experiment': 'count'
    }).reset_index()

    summary.columns = ['commit_id', 'date', 'version', 'mean_time_ns',
                      'median_time_ns', 'std_time_ns', 'num_benchmarks']

    # Convert to milliseconds
    summary['mean_time_ms'] = summary['mean_time_ns'] / 1_000_000
    summary['median_time_ms'] = summary['median_time_ns'] / 1_000_000
    summary['std_time_ms'] = summary['std_time_ns'] / 1_000_000

    # Sort by date
    summary = summary.sort_values('date')

    return summary


if __name__ == '__main__':
    # Read all benchmark data
    print("Reading benchmark data...")
    dfr = read_benchmarks()
    print(f"Loaded {len(dfr)} benchmark results")
    print(f"Commits found: {dfr['commit_id'].nunique()}")
    print(f"Date range: {dfr['date'].min()} to {dfr['date'].max()}")

    output_dir = Path(__file__).parent

    # Generate summary
    print("\nGenerating performance summary...")
    summary = generate_performance_summary(dfr)
    print(summary)

    # Save summary to CSV
    summary.to_csv(output_dir / 'performance_summary.csv', index=False)
    print(f"\nSaved summary to {output_dir / 'performance_summary.csv'}")

    # Generate plots if we have commit data
    if dfr['commit_id'].notna().any():
        print("\nGenerating performance over time plot...")
        plot_performance_over_time(dfr, output_path=str(output_dir / 'performance_over_time.png'))

        print("\nGenerating performance distribution plot...")
        plot_performance_distribution(dfr, output_path=str(output_dir / 'performance_distribution.png'))

        # If we have multiple commits, do comparison
        unique_commits = dfr['commit_id'].dropna().unique()
        if len(unique_commits) >= 2:
            baseline = unique_commits[0]
            print(f"\nGenerating commit comparison (baseline: {baseline[:7]})...")
            plot_commit_comparison(
                dfr,
                baseline_commit=baseline,
                output_path=str(output_dir / 'commit_comparison.png')
            )

    print("\nDone! Analysis complete.")
