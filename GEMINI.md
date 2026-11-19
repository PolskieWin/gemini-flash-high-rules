# Global Engineering Rules & Performance Directives
# Optimized for Gemini 3.8 Flash (High)

## 1. Completeness & Zero Shortcuts
- DO deliver 100% implemented, production-grade code that compiles and runs on the first pass.
- DO write every helper function, edge-case branch, import, and wiring call required by the task.
- DO implement real business logic, real parsing, real serialization, and real state transitions.
- DO finish every multi-file change end-to-end, including call sites, headers, interfaces, and exports.
- DO provide complete file contents when creating new files or replacing whole files.
- NEVER emit `// TODO`, `// FIXME`, `// HACK`, `// XXX`, `...`, or `# rest of code here`.
- NEVER leave stubbed methods, empty function bodies, `pass`, `unimplemented!()`, or `todo!()` placeholders.
- NEVER substitute hardcoded fake data, dummy return values, or mock logic unless explicitly writing a unit test.
- NEVER truncate code blocks, collapse repetitive branches, or elide unchanged sections inside full-file rewrites.
- NEVER defer required work to follow-up steps or tell the user to fill in the remaining logic.
- NEVER stop halfway through a refactor leaving part of the codebase on the old signature.
- NEVER assume an unimplemented helper exists elsewhere unless verified directly in the repository.

## 2. Comment Discipline
- DO write comments strictly to document non-obvious *why* decisions, invariants, or external constraints.
- DO document ABI quirks, race-condition protections, lock ordering, hardware workarounds, and protocol specs.
- DO explain magic numbers, bitmasks, alignment requirements, or non-intuitive performance tradeoffs.
- DO keep docstrings focused on contracts: preconditions, postconditions, ownership, and error conditions.
- DO update existing comments if your edit invalidates the behavior they describe.
- NEVER write inline comments narrating *what* the code literally does (e.g., `// increment i`, `# loop through list`).
- NEVER add decorative banner comments, ASCII dividers, or changelog-style comments in code.
- NEVER leave commented-out dead code, old implementations, or debugging print statements behind.
- NEVER explain standard language syntax or self-evident variable assignments.
- NEVER delete user-written comments unless the code they describe is explicitly removed.

## 3. Context Reading & Zero Silent Deletions
- DO inspect surrounding file context, imports, types, and sibling callers before modifying any symbol.
- DO inspect project config files (build scripts, manifests, linters, lockfiles) before introducing dependencies.
- DO match the repository's existing formatting, naming conventions, architecture, and error idioms.
- DO preserve backward compatibility for public APIs, CLI flags, file formats, and serialized schemas unless asked to break them.
- DO check all references across the workspace before renaming, moving, or changing a function signature.
- NEVER delete, omit, or silently break existing functions, methods, classes, or exported symbols.
- NEVER strip existing error checks, null guards, bounds checks, fallback paths, or edge-case handlers.
- NEVER remove existing logging, telemetry hooks, feature flags, or platform-specific `#ifdef` branches without instruction.
- NEVER rewrite working unrelated code inside a file just to match personal style preferences.
- NEVER guess file paths, symbol names, or struct fields when they can be verified directly.
- NEVER drop existing imports that remain referenced elsewhere in the file.

## 4. Types, Signatures & Data Modeling
- DO enforce strict static typing, explicit function signatures, and narrow return types everywhere supported.
- DO represent domain states with enums, tagged unions, or sealed types instead of loose strings or booleans.
- DO make illegal states unrepresentable at compile time whenever the type system permits.
- DO use immutable data structures, `const`, `final`, or `readonly` bindings by default.
- DO use explicit integer widths and signedness when dealing with binary formats, FFI, or hardware registers.
- DO keep function parameter lists small; group related options into typed structs or config objects.
- NEVER use `any`, raw untyped maps, `void*`, or unchecked casts when a concrete type is knowable.
- NEVER silence compiler warnings or type errors with blanket suppressions (`@ts-ignore`, `#pragma`, `#[allow(all)]`).
- NEVER rely on implicit type coercion, truthiness traps, or undefined behavior.
- NEVER mutate function arguments unexpectedly when callers expect pure transformations.
- NEVER mix nullable and non-nullable conventions inconsistently within the same module.

## 5. Error Handling & Defensive Boundaries
- DO propagate errors explicitly using the language's native mechanism (`Result`, typed exceptions, error returns).
- DO attach actionable context (operation name, failing input identifier, underlying cause) when wrapping errors.
- DO validate all untrusted inputs at module boundaries: nullability, empty collections, ranges, and encoding.
- DO handle partial failures, timeouts, EOF, empty files, and network disconnects gracefully.
- DO fail fast on programmer invariants and impossible states during initialization or critical paths.
- DO check return codes from system calls, file I/O, FFI calls, and external process invocations.
- NEVER swallow errors silently with empty `catch` blocks, ignored `Result` values, or bare `except: pass`.
- NEVER catch broad base exceptions unless re-throwing, logging with full context, or enforcing a top-level boundary.
- NEVER return `null`, `-1`, or empty strings to mask genuine failures when an error type is appropriate.
- NEVER panic, `unwrap()`, or crash on recoverable runtime conditions like missing files or malformed user input.
- NEVER hide root causes by replacing original errors with generic, context-free messages.

## 6. Clean Architecture & Modularity
- DO keep each function focused on one cohesive responsibility with clear inputs and outputs.
- DO use early returns and guard clauses to minimize nesting depth and improve readability.
- DO separate pure computation from I/O, UI rendering, database calls, and network side effects.
- DO name variables, functions, and modules precisely after their domain meaning and units (e.g., `timeoutMs`).
- DO extract repeated non-trivial logic into well-named helpers once a clear pattern emerges.
- DO keep control flow explicit and linear rather than hiding behavior behind clever metaprogramming.
- NEVER over-engineer speculative factories, abstract base layers, or plugin frameworks beyond the requested scope.
- NEVER cram unrelated concerns into monolithic god-functions or multi-hundred-line switch blocks.
- NEVER duplicate complex state logic across multiple files when a single source of truth is feasible.
- NEVER introduce global mutable state or hidden singletons when explicit dependency injection works cleanly.
- NEVER shadow outer variables in nested scopes in ways that obscure which value is referenced.

## 7. Imports, Dependencies & Dead Code
- DO audit every import, `#include`, and `use` statement so only actually referenced symbols remain.
- DO prefer the standard library and existing project dependencies over adding new third-party packages.
- DO pin exact or safely bounded versions when introducing a genuinely necessary dependency.
- DO remove unreachable branches, unused variables, unused parameters, and obsolete helpers created during edits.
- DO verify that every imported symbol matches the exact version of the library installed in the project.
- NEVER invent nonexistent library APIs, hallucinated method names, or deprecated flags from older versions.
- NEVER leave circular imports or fragile initialization-order dependencies between modules.
- NEVER commit stray debug artifacts, temporary files, or unused boilerplate scaffolding.
- NEVER pull in heavy multi-megabyte frameworks for tasks solvable in 20 lines of clean native code.
- NEVER bypass package managers by vendoring raw third-party source files unless explicitly requested.

## 8. Memory, Resources & Performance
- DO manage file handles, sockets, locks, GPU buffers, and connections with deterministic cleanup (RAII, `defer`, `using`, `with`).
- DO close streams and release native allocations on both success and error paths.
- DO avoid unnecessary heap allocations, deep copies, and string concatenations inside hot loops.
- DO choose data structures with appropriate asymptotic complexity for the expected input scale.
- DO stream large files and datasets instead of loading unbounded payloads into memory at once.
- DO guard against integer overflow, underflow, division by zero, and out-of-bounds indexing.
- NEVER leak memory, file descriptors, timers, event listeners, or background worker handles.
- NEVER retain dangling pointers, invalidated iterators, or references to freed buffers.
- NEVER perform blocking disk or network I/O on UI threads, render loops, or async event loops.
- NEVER micro-optimize cold paths at the expense of correctness, memory safety, or clarity.

## 9. Concurrency, Async & State Safety
- DO protect shared mutable state with explicit synchronization primitives or message passing.
- DO enforce consistent lock acquisition ordering to prevent deadlocks across multiple mutexes.
- DO propagate cancellation tokens, timeouts, and shutdown signals cleanly through async tasks.
- DO make state transitions atomic or idempotent where retries and concurrent triggers can occur.
- DO avoid holding locks across awaiting calls, blocking I/O, or external callbacks.
- NEVER introduce fire-and-forget background tasks without lifecycle tracking and error handling.
- NEVER rely on arbitrary `sleep()` delays to mask race conditions or synchronize threads.
- NEVER mutate UI state from background threads without dispatching to the main/UI thread.
- NEVER assume non-atomic read-modify-write operations are thread-safe.
- NEVER leak unjoined threads, orphaned async tasks, or uncancelled timers on teardown.

## 10. Security, Validation & I/O Hygiene
- DO use parameterized queries, prepared statements, and safe argument arrays for SQL and shell commands.
- DO sanitize and canonicalize user-supplied file paths to prevent directory traversal attacks (resolve canonical symlinks before bounds checking).
- DO use constant-time comparisons for secrets, tokens, hashes, and cryptographic signatures.
- DO enforce explicit size limits on uploads, buffers, JSON payloads, and decompressed archives.
- DO use platform-independent path APIs and explicit UTF-8 encoding for text I/O.
- NEVER interpolate untrusted input directly into shell strings, SQL queries, HTML, or regex patterns.
- NEVER hardcode API keys, passwords, private tokens, or environment-specific absolute paths in source code.
- NEVER log raw credentials, session tokens, or sensitive personal payloads.
- NEVER disable TLS certificate verification or fall back to insecure cryptographic primitives.
- NEVER expose raw stack traces or internal filesystem paths in external-facing error responses.

## 11. Build Systems, Tooling & Portability
- DO keep build files (`CMakeLists.txt`, `Cargo.toml`, `build.gradle`, `package.json`) synchronized with added or removed source files.
- DO respect target OS, CPU architecture, ABI, and SDK version constraints declared in the workspace.
- DO write deterministic build and script logic that works cleanly in headless CI environments.
- DO quote shell variables properly and enable strict mode (`set -euo pipefail`) in Bash scripts.
- DO check endianness, line endings, and case-sensitive filesystem behavior for cross-platform code.
- NEVER assume machine-specific tool paths, local home directories, or pre-installed global binaries.
- NEVER break existing compiler warning flags, linter rules, or CI test targets.
- NEVER alter unrelated lockfile entries or downgrade toolchain versions without explicit approval.

## 12. Refactoring, Edits & Multi-File Integrity
- DO scope edits strictly to the requested change and its direct ripple effects.
- DO update every caller, test, interface definition, and export affected by a signature or behavior change.
- DO preserve exact indentation style (tabs vs. spaces) and newline conventions of each edited file.
- DO verify symbol visibility (`public`, `private`, `pub`, `export`, `static`) across module boundaries.
- DO break risky multi-file refactors into clean, verifiable steps when editing live workspaces.
- NEVER apply blind search-and-replace edits that corrupt similarly named symbols or string literals.
- NEVER leave stale imports, orphaned files, or broken relative paths after moving modules.
- NEVER mix unrelated formatting churn into functional diffs.
- NEVER leave half-migrated duplicate implementations coexisting without an explicit deprecation reason.

## 13. Testing & Edge-Case Rigor
- DO cover boundary inputs when writing tests: zero, negative values, empty strings, max sizes, and malformed payloads.
- DO write deterministic tests isolated from wall-clock timing, random seeds, and live external networks.
- DO test both happy paths and failure/error-propagation paths explicitly.
- DO clean up temporary directories, sockets, and fixtures created during test execution.
- NEVER weaken assertions, skip failing tests, or delete tests just to make a test suite pass.
- NEVER write tautological tests that only assert mocked return values instead of real behavior.
- NEVER leave flaky retry loops hiding underlying nondeterminism.

## 14. Pre-Output Reasoning Audit
- DO use the high-reasoning pass before emitting any code to mentally compile and trace every modified path.
- DO audit all imports, namespaces, symbol spellings, and function signatures against real file context.
- DO verify type compatibility, nullability, ownership lifetimes, and error return types on every line.
- DO trace off-by-one loop bounds, empty-input behavior, concurrency hazards, and resource cleanup paths.
- DO scan the final draft for prohibited placeholders (`TODO`, `FIXME`, `...`, stubs, mocks) before outputting.
- DO verify zero existing functions, error checks, or user comments were accidentally dropped.
- DO check that no obvious narrating-what-it-does comments slipped into the output.
- DO verify every newly called helper or type is actually defined and reachable.
- DO run available build, typecheck, lint, or test commands when tools permit and fix failures before concluding.
- NEVER claim code was built, tested, or verified unless the command was actually executed and succeeded.
- NEVER output a partial first draft expecting the user to catch missing imports or syntax errors.

## 15. Agentic Tool & Workspace Discipline
- DO read target files before applying edits rather than relying on stale memory from earlier turns.
- DO use targeted file search and symbol lookup tools instead of blindly scanning entire directories.
- DO prefer minimal, atomic file patches over rewriting entire large files when only specific blocks change.
- DO inspect full compiler and test error traces before attempting a second fix.
- DO diagnose root causes instead of repeatedly retrying identical failing commands.
- DO stop and report cleanly if an environment constraint or missing tool blocks execution.
- NEVER run destructive shell commands (`rm -rf`, `git reset --hard`, force-push) without explicit user confirmation.
- NEVER modify `.git` internals, untracked user assets, or unrelated config files outside the task scope.
- NEVER ignore non-zero exit codes from build, lint, or test commands.

## 16. Ambiguity, Blockers & Honesty
- DO state missing files, unreadable paths, or failing tool outputs plainly and accurately.
- DO ask one concise clarifying question only when requirements contain a genuine, unresolvable contradiction.
- DO choose the safest, most idiomatic default when minor implementation details are unspecified, and note it briefly.
- DO flag breaking changes, security risks, or behavioral edge cases in one crisp bullet when relevant.
- NEVER fabricate API behavior, benchmark numbers, compiler outputs, or file contents.
- NEVER pretend a broken workaround solved the root cause.

## 17. Response Style & Output Discipline
- DO keep chat responses ultra-concise, reporting only concrete edits, verification results, or blockers.
- DO reference exact file paths, symbol names, and line numbers when explaining changes.
- DO lead immediately with the code, patch, or technical answer.
- DO present root causes and fixes directly without hedging or filler.
- DO format multi-item status reports as compact bullet points with zero prose padding.
- NEVER include greetings, conversational intros, apologies, or motivational fluff.
- NEVER add transitional filler ("Here is the updated code:", "Let's dive in:", "Great question!").
- NEVER append redundant closing summaries, recaps of obvious edits, or generic sign-offs.
- NEVER repeat full unchanged files in chat when a targeted edit or tool patch already applied the change.

## 18. Gemini 3.8 Flash (High) Performance Boosts
- DO channel Flash High's native reasoning tokens strictly toward contract verification, race condition analysis, and type safety checks.
- DO prune circular or speculative "what-if" deliberation during reasoning; transition to code delivery immediately once preconditions and edge cases are verified.
- DO deliver surgical, atomic diffs rather than re-emitting whole files during edits to eliminate latency bottlenecks and token waste.
- DO enforce zero emojis and zero conversational preamble across all turns, maximizing token throughput and output bandwidth.
- DO prioritize fail-fast guards, boundary assertions, and deterministic stream cleanup (`defer`, `using`, `with`) to maintain sustained agent performance over multi-turn workflows.
