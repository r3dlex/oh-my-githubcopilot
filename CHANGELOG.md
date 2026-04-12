# Changelog

All notable changes to **oh-my-copilot** are documented here, ordered newest first.
Each section corresponds to commits between conceptual version boundaries (no git tags exist yet — the CI pipeline introduced in v1.2.x will tag future releases automatically).

---

## [Unreleased] — post oh-my-copilot v1.2.0

Commits: `fd366e6`…`e82e807` (HEAD)

### Features
- **Hybrid npm publish** — every push to `main` publishes to GitHub Packages (`@r3dlex/oh-my-copilot`) automatically via `GITHUB_TOKEN`; npmjs.com (`oh-my-copilot`) publishes when `NPM_TOKEN` secret is configured (`ee42604`)
- **Continuous alpha releases** — every push to `main` publishes `X.Y.Z-alpha.<sha>` to the `alpha` dist-tag on both registries; tagged commits (`vX.Y.Z`) publish stable to `latest` (`ec8fffa`)
- **npm release CI pipeline** — GitHub Actions `release.yml` with four jobs: `build` (version resolution + artifact), `test` (CHANGELOG gate for stable only), `publish` (dual-registry), `github-release` (stable only, attaches `.tgz`) (`5a3ae67`)

### Fixes
- **Workflow parse error** — replaced `secrets.NPM_TOKEN != ''` in `if:` conditions with a dedicated check step outputting `available=true/false`; GitHub blocks direct secret comparison in expressions (`e82e807`)
- **Version-agnostic plugin assertions** — `plugin-install.test.mts` version checks now read from `packageJson().version` instead of hardcoded `"1.0.0"`; `marketplace.json` metadata.version synced to `1.2.0` (`7f99f14`)
- **Stale agent/skill counts** — JSON descriptors and e2e tests corrected to 23 agents / 25 skills (`74c5122`)

### Documentation
- **Agent and skill docs normalized** — all 23 agent descriptors and 25 skill `SKILL.md` files updated to consistent format with accurate counts (`fd366e6`)

---

## [v1.2.0] — GraphProvider abstraction, graphwiki adapter, spending skill

Commits: `a234799`, `feb5e65` (PR #10)

### Features
- **GraphProvider abstraction** — new `src/graph/` module with `GraphBuildable` and `GraphWikiClient` interfaces; provider resolved from `.omp/config.json` `graph.provider` with local > global > default (`graphwiki`) resolution
- **GraphifyAdapter** — extracted graphify CLI wrapper from `src/skills/graphify.mts` into `src/graph/graphify-adapter.mts`; graphify skill now delegates to the adapter (public API unchanged)
- **GraphwikiAdapter** — new `src/graph/graphwiki-adapter.mts` wrapping the `graphwiki` npm CLI (`npm install -g graphwiki`); implements both `GraphBuildable` and `GraphWikiClient`
- **graphwiki skill** — new `/omp:graphwiki` skill for direct access to graphwiki CLI: `query`, `path`, `lint`, `refine`, `build`, `status`, `clean`
- **graph-provider skill** — new `/omp:graph-provider` skill for managing the active provider: `get`, `set`, `list`, `build`, `status`, `clean`, `query`
- **spending skill** — new `/omp:spending` skill exposing `status` and `reset` for premium request usage tracking
- **keyword-detector wiring** — 8 new keyword entries: `graphify:`, `graphwiki:`, `graph:`, `spending:`, `/graphify`, `/graphwiki`, `/graph-provider`, `/spending`

### Fixes
- **plugin.json** — removed non-existent `./agents` path from agents array; added `graphify`, `graphwiki`, `graph-provider`, `spending` to skills list (25 skills total)
- **gitignore** — untracked `coverage/.tmp`, `.omc/` state files, `devops.md` (`a234799`)

---

## [v1.1.0] — CI hardening, HUD format change

Commits: `ce6f3bd`…`051ac20` (PR #9)

### Features
- **HUD format: `tools:N` → `tools:N/M`** — all count fields (tools, skills, agents) now display as used/total (e.g., `tools:12/13`, `skills:5/25`, `agents:3/23`); added `toolsTotal`, `skillsTotal`, `agentsTotal` fields to `HudState` and `HudMetrics`
- **CLI elicitation support** — expanded OMP setup wizard to handle interactive CLI prompts during MCP config generation

### Fixes
- **CI: zero-install artifact pattern** — build artifact uploaded once in `build` job and downloaded in `test`/`publish` jobs; eliminates redundant `npm install` across CI jobs (`d46f647`)
- **CI: vitest hanging** — added `< /dev/null` stdin redirect and `timeout 120` to prevent vitest blocking indefinitely in non-TTY environments (`fa9fdfb`)
- **CI: vitest `--forceExit`** — added flag to ensure process exits after tests complete in CI (`c88c2c7`)
- **CI: coverage job timeout** — separated coverage into its own job with a 10-minute timeout; tests run without coverage in parallel (`9608b07`)
- **CI: coverage provider** — removed incompatible `@vitest/coverage-istanbul`; using `@vitest/coverage-v8` exclusively (`ce6f3bd`)
- **Redundant `root/agents` directory** — removed stale agents directory at repo root; all 23 agents live in `src/agents/` (`8c521c0`)

---

## [v1.0.0] — Initial release

Commits: `804fc37`…`0f96d48` (initial implementation + `6ee243f` rename)

Initial release of **oh-my-copilot (OMP)** — a multi-agent orchestration plugin for GitHub Copilot CLI.

### Features
- **23 specialized agents** via Claude Code subagents: orchestrator, explorer, planner, executor, verifier, writer, reviewer, designer, researcher, tester, debugger, architect, security-reviewer, simplifier, test-engineer, critic, tracer, scientist, code-reviewer, document-specialist, qa-tester, git-master, analyst
- **22 skills** including: `setup`, `mcp-setup`, `autopilot`, `ralph`, `ultrawork`, `team`, `ecomode`, `swarm`, `pipeline`, `plan`, `omp-plan`, `hud`, `note`, `trace`, `learner`, `swe-bench`, `wiki`, `psm`, `release`, `graphify`, `spending`, `spawn`
- **6 hooks**: `keyword-detector`, `delegation-enforcer`, `model-router`, `token-tracker`, `hud-emitter`, `stop-continuation`
- **HUD display system** — real-time session context, token tracking, and agent/skill usage counters in tmux status bar
- **PSM (Plugin State Manager)** — SQLite-backed cross-session state persistence with fleet-level visibility
- **MCP server** — 10 tools for extended capabilities (`omp_get_agents`, `omp_delegate_task`, `omp_activate_skill`, `omp_get_hud_state`, `omp_get_session_state`, `omp_save_session`, `omp_list_sessions`, `omp_invoke_hook`, `omp_subscribe_hud_events`, `omp_fleet_status`)
- **SWE-bench harness** — reproducible benchmark runner for performance evaluation
- **Double-tiered MCP config** — user-level (`~/.omp/`) and workspace-level (`.omp/`) config with merge resolution
- **Setup wizard** — `/setup` and `/mcp-setup` skills for frictionless onboarding
- **ADR governance** — `archgate` CLI integration for architecture decision records (`d38b46d`, `9cc3d09`)
- **OMP rename** — project renamed from `oh-my-claudecode (OMC)` to `oh-my-copilot (OMP)` targeting GitHub Copilot CLI (`6ee243f`)

### Documentation
- `AGENTS.md` — agent registry and delegation rules
- `CLAUDE.md` — project instructions and quick reference
- `SECURITY.md` — vulnerability reporting policy
- `FUNDING.yml` — GitHub Sponsors link
- Spec documents: `spec/AGENTS_SPEC.md`, `spec/SKILLS.md`, `spec/HOOKS.md`, `spec/HUD.md`, `spec/PSM.md`, `spec/MCP.md`
- 11 localized READMEs, SVG logo, buddy screenshots
