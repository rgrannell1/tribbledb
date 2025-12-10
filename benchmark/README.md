# TribbleDB Benchmarking

TribbleDB benchmarks using fuzzer-generated triple data-structures. They are
parameterised in a way that allows the cardinality of IDs, types,
query-parameters, relations to be altered either deterministically or using
another fuzzer function.

Generally, we test target functionality over various sizes and "uniqueness"
inputs. Current benchmarks include:

- Deletion performance
- Indexing performance
- SearchFlatMap performance

Future benchmarks might include:

- Search time
- FirstObject / Objects time
- Hash time
- ReadParsedThings time
