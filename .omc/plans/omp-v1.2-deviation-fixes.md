# OMP v1.2 Deviation Fixes — RALPLAN-DR Plan (Revision 2)

**Date:** 2026-04-12
**Mode:** RALPLAN-DR (short)
**Complexity:** MEDIUM
**Scope:** 14 deviations across ~23 files (17 new, 6 modified)
**Iteration:** 2 (addresses Architect + Critic feedback from iteration 1)

---

## RALPLAN-DR Summary

### Principles (5)

1. **Adapter pattern over monoliths** — Graph logic lives behind a `GraphBuildable` interface; skills delegate to adapters, never embed CLI calls directly.
2. **Two-tiered config is canonical** — All new features read from `loadConfig()` (local > global > default). No hardcoded defaults outside the config layer.
3. **Tests mirror source** — Every new `src/` file gets a corresponding `tests/` file using the project's vitest + `vi.mock` pattern. 80%+ coverage maintained.
4. **Minimal blast radius** — Each commit is self-contained and passes CI independently. No commit depends on a later commit to compile.
5. **Spec is the contract** — CHANGELOG, plugin.json, and spec docs reflect reality. If the code changes, the docs change in the same commit.

### Decision Drivers (top 3)

1. **GraphProvider abstraction is the critical path** — 5 of 14 deviations depend on `src/graph/` existing. It must land first.
2. **Existing `loadConfig` already supports two-tiered merge** — No new config infrastructure needed; just wire consumers to call it with the right type parameter.
3. **Test coverage gate at 80%** — Every new file must have tests or CI will block the PR.

### Why the abstraction is justified

Two providers (graphify, graphwiki) have fundamentally different integration surfaces and output directories. The abstraction documents the shared contract, makes the graphify skill's delegation explicit, and enables provider switching via config without changing skill code. YAGNI concern acknowledged: if graphwiki were just graphify with different flags, duplication would be the right call. But they are entirely different tools (Python CLI vs. TypeScript npm package) with different output shapes. The adapter pattern is the correct response to genuine polymorphism — two CLI tools that do the same logical job differently.

### Viable Options

#### Option A: Flat interfaces + `spawnSync` throughout [CHOSEN]

Two independent interfaces: `GraphBuildable` (shared: build/status/clean/exists) and `GraphWikiClient` (wiki-specific: query/path/lint/refine). `id: string`. All methods **synchronous** matching the existing `spawnSync` pattern in `graphify.mts`. `activate()` in skills remains async (it can call sync methods without issue).

**Pros:**
- Consistent with existing codebase pattern (graphify.mts uses spawnSync exclusively)
- No Liskov violation — GraphWikiClient is separate, not an extension
- Simple tests (no stream management)
- `id: string` allows future extension without changing the interface

**Cons:**
- Blocks event loop during long builds (minutes for large codebases)
- No cancellation support

#### Option B: Async `spawn` throughout (like wiki.mts)

Use `spawn` with Promise wrapping for all adapter methods.

**Pros:**
- Non-blocking; honest async semantics
- Supports timeouts and cancellation

**Cons:**
- Inconsistent with existing graphify pattern (would require changing graphify.mts too)
- More complex test setup (stream mocking)
- Unnecessary for typical graph build sizes in a CLI context

**Why Option B rejected:** The existing graphify.mts uses spawnSync consistently. Converting to async `spawn` would require changing the existing skill + its tests + adding stream management, significantly expanding scope. The CLI context (called from a Copilot hook, not a server) makes event loop blocking acceptable. If long-running builds become a problem, that's a v1.3 concern.

---

## Implementation Plan

### Step 1: Graph provider foundation

**Commit:** `feat: add GraphBuildable/GraphWikiClient interfaces and provider registry`

**Create:**
- `src/graph/types.mts` — two independent interfaces:
  ```typescript
  export interface GraphBuildable {
    readonly id: string;           // NOT a union literal — extensible
    readonly name: string;
    readonly outputDir: string;    // "graphify-out" or "graphwiki-out"
    build(workspacePath: string, incremental?: boolean): BuildResult;
    exists(workspacePath: string): boolean;
    getReportPath(workspacePath: string): string;
    getGraphPath(workspacePath: string): string;
    clean(workspacePath: string): void;
    status(workspacePath: string): StatusResult;
  }

  export interface GraphWikiClient {
    query(workspacePath: string, question: string): string;
    path(workspacePath: string, from: string, to: string): string;
    lint(workspacePath: string): LintResult;
    refine(workspacePath: string, review?: boolean): string;
  }

  export interface BuildResult { success: boolean; outputPath: string; error?: string; }
  export interface StatusResult { exists: boolean; outputPath: string; reportPath: string; }
  export interface LintResult  { issues: string[]; clean: boolean; }
  ```
  All methods **synchronous** — no Promise wrappers.
- `src/graph/registry.mts` — `getProvider(id?: string): GraphBuildable`, `setProvider(id: string): void`, `listProviders(): string[]`. Default provider read from `loadConfig<{ graph: { provider: string } }>("graph")?.graph?.provider ?? "graphwiki"`. `setProvider` calls `writeConfig("graph", "local", { graph: { provider: id } })`.
- `tests/graph/types.test.mts` — structural tests verifying type shapes compile and satisfy contracts
- `tests/graph/registry.test.mts` — mock `loadConfig`/`writeConfig`, test get/set/list + config fallback

**Acceptance criteria (mechanically testable):**
- `npm run typecheck` passes with 0 errors
- `npm test` passes with 0 new failures
- `getProvider()` returns `"graphwiki"` when no config exists
- `setProvider("graphify")` calls `writeConfig` with correct args (verified via vi.mock)

---

### Step 2: Extract graphify adapter + create graphwiki adapter

**Commit:** `feat: extract graphify adapter, add graphwiki adapter`

**Create:**
- `src/graph/graphify-adapter.mts` — implements `GraphBuildable`. Extract from `src/skills/graphify.mts`:
  - Move `findGraphify()` (currently at line ~39) → adapter
  - Move `build()` (line ~51) → adapter
  - Move `status()` → adapter
  - Move `clean()` → adapter
  - Class constructor: no args (CLI discovery happens per-call, same as existing)
  - `id = "graphify"`, `outputDir = "graphify-out"`
- `src/graph/graphwiki-adapter.mts` — implements `GraphBuildable & GraphWikiClient`. Wraps `graphwiki` CLI (npm package `graphwiki`, binary `graphwiki`). Commands:
  - `build(ws, incremental?)`: `spawnSync("graphwiki", ["build", ws, ...(incremental ? ["--update"] : [])], { encoding: "utf8" })`
  - `status(ws)`: checks `existsSync(join(ws, "graphwiki-out", "graph.json"))`
  - `clean(ws)`: `rmSync(join(ws, "graphwiki-out"), { recursive: true, force: true })`
  - `query(ws, q)`: `spawnSync("graphwiki", ["query", q], { cwd: ws, encoding: "utf8" })`
  - `path(ws, from, to)`: `spawnSync("graphwiki", ["path", from, to], { cwd: ws, encoding: "utf8" })`
  - `lint(ws)`: `spawnSync("graphwiki", ["lint"], { cwd: ws, encoding: "utf8" })`
  - `refine(ws, review?)`: `spawnSync("graphwiki", ["refine", ...(review ? ["--review"] : [])], { cwd: ws, encoding: "utf8" })`
  - Guard: at construction time, verify CLI exists via `spawnSync("which", ["graphwiki"])`. Throw descriptive error if not found: `"graphwiki CLI not found. Install with: npm install -g graphwiki"`
  - `id = "graphwiki"`, `outputDir = "graphwiki-out"`
- `tests/graph/graphify-adapter.test.mts` — `vi.mock("child_process")`, `vi.mock("fs")`. Test: build-success, build-failure (non-zero exit), status-exists, status-missing, clean.
- `tests/graph/graphwiki-adapter.test.mts` — same mocking pattern. Test all 8 methods including CLI-not-found error.

**Modify:**
- `src/skills/graphify.mts` — remove `findGraphify()`, `build()`, `status()`, `clean()`. Replace with `import { GraphifyAdapter } from "../graph/graphify-adapter.mts"`. The `activate()` function creates an adapter instance and delegates: `new GraphifyAdapter().build(...)`, etc. Keep `SkillInput`/`SkillOutput` types and `activate()`/`deactivate()` in place. Public API unchanged.
- `src/graph/registry.mts` — register both adapters: `"graphify" → new GraphifyAdapter()`, `"graphwiki" → new GraphwikiAdapter()`.
- `tests/skills/graphify.test.mts` — update mocks if import paths change (mock `../../src/graph/graphify-adapter.mts` instead of child_process directly)

**Acceptance criteria:**
- `src/skills/graphify.mts` no longer imports `child_process` or contains `findGraphify()`
- `graphwiki-adapter` throws `"graphwiki CLI not found"` when CLI missing
- All 14 existing graphify skill tests still pass
- New adapter tests cover success + failure paths for each method
- `npm run typecheck` passes

---

### Step 3: New skills — graphwiki + graph-provider + spending

**Commit:** `feat: add graphwiki, graph-provider, and spending skills`

**Create:**
- `src/skills/graphwiki.mts` — follows `activate(input: SkillInput)` pattern from existing skills. Gets `GraphwikiAdapter` from registry. Actions: `query <question>`, `path <from> <to>`, `lint`, `refine [--review]`, `build`, `status`, `clean`. Parses action from `input.args[0]`. If graphwiki CLI not installed, surfaces the install message.
- `skills/graphwiki/SKILL.md` — frontmatter: `id: graphwiki`, `name: GraphWiki`, `tier: standard`, `description: Direct access to graphwiki CLI for graph querying, path finding, linting, and refinement.`, `keywords: ["graphwiki:", "/graphwiki"]`
- `src/skills/graph-provider.mts` — thin routing layer. Gets active provider from registry. Actions: `set <id>` (calls `setProvider`), `get` (shows current provider), `build [--incremental]`, `clean`, `status`, `query <question>` (graphwiki only). Guards `query` with instanceof-check that active provider implements `GraphWikiClient`.
- `skills/graph-provider/SKILL.md` — frontmatter: `id: graph-provider`, `name: Graph Provider`, `keywords: ["graph:", "/graph-provider"]`
- `src/skills/spending.mts` — thin wrapper around `src/spending/tracker.mts`. Reads `SpendingConfig` from `loadConfig<SpendingConfig>("spending")` merged with hardcoded defaults. Actions:
  - `status`: calls `loadSpending(sessionId)`, formats and returns session + monthly request counts
  - `reset`: removes `~/.omp/state/spending-monthly.json` via `fs.rmSync(path, { force: true })`
  - Uses `activate()`/`deactivate()` pattern matching `src/skills/wiki.mts` (spawn subcommand pattern is NOT used here — spending.mts calls the tracker module directly, not the CLI)
- `skills/spending/SKILL.md` — frontmatter: `id: spending`, `name: Spending`, `keywords: ["spending:", "/spending"]`
- `tests/skills/graphwiki.test.mts` — mock registry + adapter, test each action
- `tests/skills/graph-provider.test.mts` — mock registry, test set/get/build/clean/status/query
- `tests/skills/spending.test.mts` — mock `loadSpending`, `loadConfig`, `fs.rmSync`; test status and reset

**Acceptance criteria:**
- `activate({ args: ["query", "what is X?"] })` on graphwiki skill delegates to `graphwikiAdapter.query()`
- `activate({ args: ["set", "graphify"] })` on graph-provider calls `setProvider("graphify")`
- `activate({ args: ["status"] })` on spending returns formatted counts
- `activate({ args: ["reset"] })` removes the spending state file
- SpendingConfig reads `warningThresholdPct` from two-tiered config, not hardcoded

---

### Step 4: Wiring — keyword-detector, plugin.json, agents fix

**Commit:** `fix: wire new skills into keyword-detector and plugin.json`

**Modify `src/hooks/keyword-detector.mts`** — add to `KEYWORD_MAP`:
```typescript
"graphify:":       "graphify",
"graphwiki:":      "graphwiki",
"graph:":          "graph-provider",
"spending:":       "spending",
"/graphify":       "graphify",
"/graphwiki":      "graphwiki",
"/graph-provider": "graph-provider",
"/spending":       "spending",
```

**Modify `.github/plugin/plugin.json`** (single source of truth):
- Remove `"./agents"` from `agents` array (keep only `"./src/agents"`)
- Add to `skills` array: `"./skills/graphify"`, `"./skills/graphwiki"`, `"./skills/graph-provider"`, `"./skills/spending"`
- Then run: `npm run sync-claude-plugin` (copies to `.claude-plugin/plugin.json` automatically)
- Note: Do NOT manually edit `.claude-plugin/plugin.json` — it is generated.

**Modify `tests/hooks/keyword-detector.test.mts`** — add tests verifying all 8 new keyword-to-skill mappings.

**Acceptance criteria (mechanically testable):**
- `processHook({ hook_type: "UserPromptSubmitted", prompt: "graph: status" })` returns skill activation for `"graph-provider"`
- `processHook({ hook_type: "UserPromptSubmitted", prompt: "graphwiki: query what is X?" })` returns skill activation for `"graphwiki"`
- `processHook({ hook_type: "UserPromptSubmitted", prompt: "spending: status" })` returns skill activation for `"spending"`
- `.github/plugin/plugin.json` has no `"./agents"` entry
- `.claude-plugin/plugin.json` matches `.github/plugin/plugin.json` (sync-claude-plugin ran)
- `npm test` passes with all keyword-detector tests green

---

### Step 5: Documentation fixes + version bump

**Commit:** `docs: fix CHANGELOG counts, confirm req: format, bump to v1.2.0`

**Modify `CHANGELOG.md`:**
- In v1.0.0 section: change `"24 OMP agents"` → `"23 OMP agents"`; change `"30+ skills"` → `"22 skills"`; remove `devops` from the agent list if present
- Add v1.1.0 section (was CHANGELOG-only, package.json was never bumped) — document the v1.1 features
- Add v1.2.0 section documenting: GraphProvider abstraction (src/graph/), graphwiki adapter, graphwiki skill, graph-provider skill, spending skill, keyword-detector wiring, plugin.json fixes

**Modify `spec/HUD.md`:**
- Confirm `req:N/M` is the canonical spending format (not `$:`)
- Remove or replace any `$:` references with `req:N/M` format documentation

**Modify `package.json`:**
- Bump `"version"` from `"1.0.0"` to `"1.2.0"`
- Note: v1.1.0 was implemented but never published; we jump to 1.2.0

**Acceptance criteria:**
- `cat package.json | jq .version` returns `"1.2.0"`
- CHANGELOG v1.0.0 says "23 OMP agents" and "22 skills"
- CHANGELOG has v1.1.0 and v1.2.0 sections
- No `$:` in spec/HUD.md

---

## Dependency Graph

```
Step 1 (types + registry)
    |
    v
Step 2 (adapters + graphify refactor)   ← also: spending skill can start in parallel
    |
    v
Step 3 (new skills)
    |
    v
Step 4 (wiring — keyword + plugin.json)
    |
    v
Step 5 (docs — needs accurate skill counts from Steps 3-4)
```

## Test Strategy

- **Unit tests:** Every new `.mts` file gets a `.test.mts` in the corresponding `tests/` subdirectory
- **Mock pattern:** `vi.mock("fs")` + `vi.mock("child_process")` at module level, consistent with `tests/skills/graphify.test.mts`
- **No `process.chdir()`:** Tests pass workspace paths explicitly (vitest uses `vmThreads singleThread`)
- **Coverage gate:** Run `npx vitest run --coverage --reporter=dot` after each step; must stay ≥80% for statements/branches/functions/lines
- **Regression guard:** `tests/skills/graphify.test.mts` must pass after Step 2 (14 existing tests)

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| graphwiki CLI not installed in CI | HIGH | Medium | Tests mock `which graphwiki` — no real CLI needed in tests |
| Existing graphify tests break after refactor | MEDIUM | Medium | Update mock paths in graphify tests as part of Step 2 |
| plugin.json sync-claude-plugin not run | LOW | Low | Step 4 commit message explicitly says to run it; CI will catch drift |
| spawnSync event loop blocking in production | LOW | Low | Acceptable in CLI context; v1.3 can add async if needed |

## Files Summary

| Action | Path |
|--------|------|
| CREATE | `src/graph/types.mts` |
| CREATE | `src/graph/registry.mts` |
| CREATE | `src/graph/graphify-adapter.mts` |
| CREATE | `src/graph/graphwiki-adapter.mts` |
| CREATE | `src/skills/graphwiki.mts` |
| CREATE | `src/skills/graph-provider.mts` |
| CREATE | `src/skills/spending.mts` |
| CREATE | `skills/graphwiki/SKILL.md` |
| CREATE | `skills/graph-provider/SKILL.md` |
| CREATE | `skills/spending/SKILL.md` |
| CREATE | `tests/graph/types.test.mts` |
| CREATE | `tests/graph/registry.test.mts` |
| CREATE | `tests/graph/graphify-adapter.test.mts` |
| CREATE | `tests/graph/graphwiki-adapter.test.mts` |
| CREATE | `tests/skills/graphwiki.test.mts` |
| CREATE | `tests/skills/graph-provider.test.mts` |
| CREATE | `tests/skills/spending.test.mts` |
| MODIFY | `src/skills/graphify.mts` (extract logic to adapter) |
| MODIFY | `src/hooks/keyword-detector.mts` (8 new keyword entries) |
| MODIFY | `.github/plugin/plugin.json` (agents fix + 4 new skills) |
| RUN    | `npm run sync-claude-plugin` (copies to .claude-plugin/) |
| MODIFY | `CHANGELOG.md` (fix counts + add v1.1.0 + v1.2.0) |
| MODIFY | `spec/HUD.md` (confirm req: format) |
| MODIFY | `package.json` (version: "1.2.0") |

## ADR: GraphBuildable abstraction with spawnSync

- **Decision:** Two independent synchronous interfaces (`GraphBuildable`, `GraphWikiClient`) with `id: string`. All methods synchronous matching existing codebase. Adapters wrap CLI via `spawnSync`.
- **Drivers:** (1) Spec requires provider abstraction; (2) existing graphify uses spawnSync — consistency > mixing patterns; (3) CLI context makes event loop blocking acceptable; (4) `id: string` enables future extension without interface changes.
- **Alternatives considered:** (A) Two-level inheritance (`GraphWikiProvider extends GraphProvider`) — rejected: Liskov violation, false polymorphism. (B) Async `spawn` — rejected: inconsistent with existing pattern, adds scope. (C) No abstraction (per-provider inline skills) — rejected: duplicates build/status/clean logic, makes provider switching impossible.
- **Consequences:** Existing graphify skill refactored (internal, public API unchanged). New `src/graph/` module boundary added.
- **Follow-ups:** v1.3: consider async spawn for long-running build operations. Consider adding `graphProvider` field to HUD display.

## Implementation Amendments (from Critic APPROVE — apply during implementation, no plan revision needed)

1. **Shared config.json clarification**: All `loadConfig(name)` calls read from a single shared `.omp/config.json`. The `_name` param is unused (`_`-prefixed). Add a code comment in `registry.mts` documenting this. Domain separation is by key nesting: `{ graph: { provider: "graphwiki" }, spending: { ... } }`.

2. **BuildResult type divergence**: `GraphifyAdapter.build()` must return data satisfying BOTH the `GraphBuildable` interface AND the graphify skill's `activate()` output formatting (which uses `nodeCount`, `edgeCount`, `communityCount`). **Recommended**: extend the adapter's return type with those extra fields (interface is satisfied; skill gets rich data).

3. **sessionId source for spending skill**: `SkillInput` does not have `sessionId`. Read from environment variable (check how HUD/tracker sources it) or use `process.env.COPILOT_SESSION_ID` / generate UUID as fallback. Do NOT add `sessionId` to `SkillInput` unless the pattern exists in other skills.

4. **Replace `instanceof` with duck-type guard**: In `graph-provider.mts`, use `"query" in provider` (or a named type guard `isGraphWikiClient(p): p is GraphWikiClient`) instead of `instanceof GraphWikiClient` — interfaces don't exist at runtime.

5. **Spending skill: explicit dual sourcing**: In code and comments, make clear that `SpendingConfig` (thresholds/plan tier) comes from `loadConfig<SpendingConfig>("spending")` and `SpendingState` (request counts) comes from `loadSpending()` in `src/spending/tracker.mts`. Two separate concerns, not conflated.

## Guardrails

### Must Have
- GraphBuildable interface: synchronous methods only
- graphwiki-adapter: guards missing CLI at construction with descriptive error
- All keyword entries specified exactly in Step 4
- plugin.json edited via `.github/` source + `npm run sync-claude-plugin`
- All existing tests pass after each step
- Duck-type guard (not instanceof) for GraphWikiClient in graph-provider skill
- Spending skill delegates state tracking to existing `src/spending/tracker.mts`

### Must NOT Have
- No Promise wrappers around spawnSync calls
- No inheritance between GraphBuildable and GraphWikiClient
- No union literal for `id` (use `string`)
- No new runtime dependencies in package.json
- No `process.chdir()` in tests
- No manual editing of `.claude-plugin/plugin.json`
- No `instanceof` checks against TypeScript interfaces
