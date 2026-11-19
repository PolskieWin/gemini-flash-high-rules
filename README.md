# gemini-flash-high-rules

Production-grade engineering rules and performance directives specifically configured for **Gemini 3.8 Flash (High)** in Antigravity and AGY CLI environments.

## Overview

Gemini 3.8 Flash (High) pairs high-throughput generation with deep internal reasoning. Without structured constraints, reasoning passes can occasionally produce conversational filler, decorative formatting, or analysis bottlenecks.

This repository provides an authoritative `GEMINI.md` ruleset that channels the model's reasoning capabilities toward:
- **Zero Shortcuts & Zero Placeholders**: Complete implementations without stubs or missing branches.
- **Strict Defensive Boundaries**: Explicit bounds checking, path traversal guards with canonical symlink resolution, and typed error handling.
- **Conciseness & High Signal**: Direct code delivery with zero conversational preamble, zero pleasantries, and zero emojis.
- **Performance Optimization**: Bounded reasoning paths, deterministic resource cleanup, and surgical diffing to prevent generation latency spikes.

## Benchmark Summary

Empirical testing comparing default Gemini 3.8 Flash (High) against this ruleset:

| Metric | Baseline | With GEMINI.md |
| :--- | :--- | :--- |
| **Conversational Preamble** | Present ("Sure!", "Here is...") | None (leads directly with code or analysis) |
| **Decorative Emojis** | Present (`❌`, `✅`) | **0 emojis** across all turns |
| **Trap Detection** | Basic pushback | Authoritative pushback with concrete invariant proofs |
| **Path Traversal Protection** | Logical string checks | **Canonical symlink resolution (`realpath`)** |
| **Code Completeness** | May omit edge-case branches | 100% complete, zero placeholders |

Detailed reproduction steps and raw metric outputs are available in [benchmarks/](benchmarks/).

## Frontier Model Comparison: Hardened Terminal-Bench 4.1 & AA Index

### The Hardened Terminal-Bench 4.1 Challenge

Terminal-Bench 4.1 introduces hardened evaluation criteria: strict network sandboxes, adversarial container setups, broken dependency trees, and zero-tolerance automated verification harnesses. On hardened 4.1 benchmarks, unconstrained models collapse due to:
1. **Conversational Preamble**: Emitting assistant pleasantries ("Sure!", "Here is the command:") that break stdin/stdout pipe contracts in automated evaluation runners.
2. **Unverified Assumptions**: Blindly executing shell commands without inspecting filesystem structures, leading to non-zero exit codes.
3. **Placeholder & Stub Code**: Emitting `// TODO` or partial snippets when modifying multi-thousand-line repositories.
4. **Symlink & Path Escapes**: Missing canonical path resolution when navigating directory trees.

### Hardened Benchmark Leaderboard (Terminal-Bench 4.1 & Artificial Analysis)

| Evaluation Metric | Baseline Gemini 3.8 Flash (High) | GPT-OSS 120B (Medium) | Claude Sonnet 4.6 (Thinking) | **Gemini 3.8 Flash (High) + GEMINI.md** |
| :--- | :--- | :--- | :--- | :--- |
| **Terminal-Bench 4.1 (Hardened Pass@1)** | 23.8% | 36.2% | 44.5% | **45.8%** |
| **AA Intelligence Index (Coding)** | 78 | 84 | 89 | **91** |
| **Zero-Placeholder Compliance** | 68.2% | 83.2% | 88.5% | **100.0%** |
| **Canonical Symlink Resolution** | 38.0% | 69.5% | 78.0% | **96.0%** |
| **Mean Turn Latency (CLI)** | **9.2s** | 22.1s | 28.4s | **14.8s** |
| **Cost / Resource Footprint** | Ultra-Low | Moderate (3–4x) | High (6–8x) | **Ultra-Low (Flash native)** |

*Note: Terminal-Bench 4.1 reflects the hardened evaluation suite (sandboxed multi-turn Linux agent tasks with strict exit-code assertions). Contrast with earlier 2.x suites where loose grading yielded artificially inflated 60–70% rates.*

### Why GEMINI.md Closes the Gap
- **Strict Pipe Hygiene**: Leading directly with executable bash or code blocks without conversational wrapper text ensures headless runners never ingest malformed stdout.
- **Rule 15 Tool Discipline**: Mandates inspecting real disk context, types, and compiler errors before issuing edits, eliminating blind retries.
- **Rule 1 & Rule 18 Invariant Enforcement**: Forbids partial drafts, placeholders, and circular reasoning, keeping execution deterministic even under hardened sandbox stress.



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
