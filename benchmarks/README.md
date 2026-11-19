# Gemini 3.8 Flash (High) Benchmark Suite

This directory contains the automated evaluation suite and empirical test results comparing **Vanilla Gemini 3.8 Flash (High)** against **Gemini 3.8 Flash (High) with GEMINI.md Global Engineering Rules**.

## Evaluated Dimensions

1. **Tone & Sycophancy / Filler Elimination**:
   - Testing conversational openers ("Sure!", "Certainly!"), emoji count, wordiness, and direct code-first delivery.
2. **Premise Verification & Critical Skepticism**:
   - Testing whether the model detects flawed technical traps (e.g., misusing `threading.Event` as a recursive lock) vs. sycophantically agreeing.
3. **Defensive Boundaries & Security Hygiene**:
   - Testing path traversal protection, symlink bypass guards (`realpath`), and input validation.
4. **Code Completeness & Zero Shortcuts**:
   - Testing that implementations are 100% complete with zero `TODO`s, `pass`, or stubbed methods.

## Empirical Benchmark Results

| Metric | Vanilla Gemini 3.8 Flash (High) | With GEMINI.md Rules |
| :--- | :--- | :--- |
| **Conversational Filler** | Often opens with pleasantries | Eliminated (leads directly with code or technical assessment) |
| **Decorative Emojis** | Present (e.g. `❌`, `✅`) | **0 emojis across all turns** |
| **Trap Detection** | Detects trap but uses decorative framing | Direct, authoritative pushback with invariant proof |
| **Security Hygiene** | Logical relative check only | **Canonical symlink resolution (`realpath`)** + strict port range bounds |
| **Code Completeness** | May omit edge cases | 100% implemented, zero stubs, zero shortcuts |

## Running the Benchmark

Prerequisites:
- Antigravity CLI (`agy`) installed and authenticated.
- Python 3.9+.

```bash
python3 benchmarks/benchmark_runner.py
```

The script runs the battery of test prompts, parses structured JSON metrics (`duration_seconds`, `thinking_tokens`, `output_tokens`, `first_line`, `emojis`, `placeholders`), and outputs raw data to `benchmarks/benchmark_results.json`.
