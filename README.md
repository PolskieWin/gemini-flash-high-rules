# gemini-flash-high-rules

Production-grade engineering rules and performance directives specifically configured for **Gemini 3.8 Flash (High)** in Antigravity and AGY CLI environments.

## Overview

Gemini 3.8 Flash (High) pairs high-throughput generation with deep internal reasoning. Without structured constraints, reasoning passes can occasionally produce conversational filler, decorative formatting, or analysis bottlenecks.

This repository provides an authoritative `GEMINI.md` ruleset that channels the model's reasoning capabilities toward:
- **Zero Shortcuts & Zero Placeholders**: Complete implementations without stubs or missing branches.
- **Strict Defensive Boundaries**: Explicit bounds checking, path traversal guards with canonical symlink resolution, and typed error handling.
- **Conciseness & High Signal**: Direct code delivery with zero conversational preamble, zero pleasantries, and zero emojis.
- **Performance Optimization**: Bounded reasoning paths, deterministic resource cleanup, and surgical diffing to prevent generation latency spikes.

## Empirical Benchmark Evaluation

Measured locally using [benchmarks/benchmark_runner.py](benchmarks/benchmark_runner.py) comparing default `Baseline Gemini 3.8 Flash (High)` against `Gemini 3.8 Flash (High) + GEMINI.md`. All values are empirically measured from actual runs executed via the Antigravity CLI (`agy`):

| Evaluation Dimension | Metric / Test Case | Baseline Gemini 3.8 Flash (High) | Gemini 3.8 Flash (High) + GEMINI.md |
| :--- | :--- | :--- | :--- |
| **Preamble & Tone** | Conversational Opener Rate | 0.0% | 0.0% (starts directly with ````python````) |
| | Emojis in Output | 0 | 0 |
| | Task 1 Turn Latency | 13.96s | 28.66s |
| | Task 1 Output / Thinking Tokens | 1,371 / 908 | 3,536 / 2,982 |
| **Critical Skepticism** | Detected Flawed Lock Premise | Yes | Yes |
| | Prescribed `threading.RLock` | Yes | Yes |
| | Task 2 Turn Latency | 13.79s | 12.17s |
| | Task 2 Output / Thinking Tokens | 1,351 / 884 | 1,055 / 658 |
| **Defensive Security** | Path Traversal Guard (`path.resolve`) | 100% | 100% |
| | Canonical Symlink Guard (`realpath`) | 100% | 100% |
| | Payload Size Limit Enforced | 1 MiB buffer check | 10 MiB buffer check |
| | Task 3 Turn Latency | 21.98s | 72.32s |
| | Task 3 Output / Thinking Tokens | 2,531 / 1,580 | 7,365 / 4,164 |
| **Code Completeness** | Placeholder Count (`TODO`, `...`, `pass`) | 0 | 0 |
| | Zero-Placeholder Compliance | 100% | 100% |

### Observations from Measured Data
- **Critical Skepticism Efficiency**: In Task 2 (identifying the concurrency trap where `threading.Event` was suggested as a reentrant lock), `GEMINI.md` produced a faster response (12.17s vs. 13.79s) with fewer tokens (1,055 vs. 1,351) by eliminating introductory conversational prose and delivering the technical refutation immediately.
- **Defensive Rigor & Thinking Depth**: In Task 3 (secure JSON config parsing), `GEMINI.md` engaged deeper thinking (4,164 tokens vs. 1,580 tokens) to implement full TypeScript interfaces, comprehensive JSDoc contracts, and strict boundary validation.

### Reproducibility

To execute the empirical benchmark suite and verify the metrics locally:

```bash
# Ensure Antigravity CLI (agy) and Python 3 are installed
python3 -u benchmarks/benchmark_runner.py
```

The script runs the test battery non-interactively via `agy -p`, measures exact duration and token usage, tests for placeholders and security guards, and saves raw outputs to `benchmarks/benchmark_results.json`.

## Quickstart & Installation

### Option 1: Global Installation (Machine-Wide)

To apply these rules across all CLI sessions on your machine:

```bash
mkdir -p ~/.gemini
cp GEMINI.md ~/.gemini/GEMINI.md
```

Or run the included install script:

```bash
./install.sh global
```

### Option 2: Project-Specific (Workspace)

To apply the rules only to a specific repository or project:

```bash
# In your target project root:
mkdir -p .agents/rules
cp path/to/GEMINI.md .agents/rules/GEMINI.md
```

Or:

```bash
./install.sh workspace
```

## Rule Sections

1. **Completeness & Zero Shortcuts**: Full business logic, zero `TODO`s, zero dummy mocks.
2. **Comment Discipline**: Only document non-obvious *why* constraints; no narration.
3. **Context Reading & Zero Silent Deletions**: Preserve backward compatibility and intact exports.
4. **Types, Signatures & Data Modeling**: Enforce strict static typing, sealed unions, and narrow returns.
5. **Error Handling & Defensive Boundaries**: Typed exceptions, explicit bounds checks, zero swallowed errors.
6. **Clean Architecture & Modularity**: Linear flow, guard clauses, single responsibilities.
7. **Imports, Dependencies & Dead Code**: Zero unused symbols, standard library preference.
8. **Memory, Resources & Performance**: Deterministic RAII cleanup, zero leaks, bounded indexing.
9. **Concurrency, Async & State Safety**: Strict lock acquisition ordering, atomic transitions.
10. **Security, Validation & I/O Hygiene**: Constant-time checks, parameterized queries, canonical symlink validation.
11. **Build Systems, Tooling & Portability**: Strict headless CI execution, deterministic build scripts.
12. **Refactoring, Edits & Multi-File Integrity**: Atomic, verifiable signature updates.
13. **Testing & Edge-Case Rigor**: Boundary conditions, deterministic isolation.
14. **Pre-Output Reasoning Audit**: Mental compilation pass verifying reachability, bounds, and imports.
15. **Agentic Tool & Workspace Discipline**: Surgical diff patches, root-cause diagnosis.
16. **Ambiguity, Blockers & Honesty**: Transparent error reporting, zero fabricated APIs.
17. **Response Style & Output Discipline**: Lead immediately with code or patches, no filler.
18. **Gemini 3.8 Flash (High) Performance Boosts**: Channel reasoning tokens strictly to invariant proofs and prevent speculative spinning.

## Reference Example

See [examples/lru-cache/](examples/lru-cache/) for an end-to-end TypeScript LRU cache with TTL expiration and unit tests generated under these rules.
