# oh-my-copilot v1.2.0

## Changes

- **GraphProvider abstraction** — New `src/graph/` module with `GraphBuildable` and `GraphWikiClient` interfaces. Provider resolved from config (`graph.provider`) with local > global > default (`graphwiki`) resolution.
- **GraphifyAdapter** — Extracted graphify CLI logic from `src/skills/graphify.mts` into `src/graph/graphify-adapter.mts`. Graphify skill now delegates to the adapter (public API unchanged).
- **GraphwikiAdapter** — New `src/graph/graphwiki-adapter.mts` wrapping the `graphwiki` npm CLI (`npm install -g graphwiki`). Implements both `GraphBuildable` and `GraphWikiClient`.
- **graphwiki skill** — New `/omp:graphwiki` skill for direct access to graphwiki CLI features: `query`, `path`, `lint`, `refine`, `build`, `status`, `clean`.
- **graph-provider skill** — New `/omp:graph-provider` skill for managing the active graph provider: `get`, `set`, `list`, `build`, `status`, `clean`, `query`.
- **spending skill** — New `/omp:spending` skill exposing `status` and `reset` actions for premium request usage tracking.
- **keyword-detector wiring** — Added 8 new keyword entries: `graphify:`, `graphwiki:`, `graph:`, `spending:`, `/graphify`, `/graphwiki`, `/graph-provider`, `/spending`.
- **plugin.json fixes** — Removed non-existent `./agents` path from agents array; added `graphify`, `graphwiki`, `graph-provider`, `spending` to skills list (25 skills total).
- **CHANGELOG accuracy** — v1.0.0 counts corrected to 23 agents and 22 skills.

---

# oh-my-copilot v1.1.0

## Changes

- **HUD format change: tools:N → tools:N/M** — All count fields (tools, skills, agents) now display as used/total (e.g., `tools:12/13`, `skills:5/21`, `agents:3/23`). Users with tmux `status-right` parsing or scripts that read bare integers after `tools:`, `skills:`, or `agents:` must update their parsing to handle the `N/M` format.
- Added `toolsTotal` (default 13), `skillsTotal` (default 21), and `agentsTotal` (default 23) fields to `HudState` and `HudMetrics`.

---

# oh-my-copilot v1.0.0: Initial Release

## Release Notes

Initial release of **oh-my-copilot (OMP)** — a multi-agent orchestration layer for GitHub Copilot CLI with 18 specialized agents, 30+ skills, and deep system integration.

### Highlights

- **23 OMP agents** via Claude Code subagents for specialized delegation (orchestrator, explorer, planner, executor, verifier, writer, reviewer, designer, researcher, tester, debugger, architect, security-reviewer, simplifier, test-engineer, critic, tracer, scientist, code-reviewer, document-specialist, qa-tester, git-master, analyst)
- **6 hooks** powering the orchestration pipeline (keyword-detector, delegation-enforcer, model-router, token-tracker, hud-emitter, stop-continuation)
- **PSM (Plugin State Manager)** with SQLite persistence for cross-session state
- **MCP server** exposing 10 tools for extended capabilities
- **HUD display system** for real-time session context and progress tracking
- **SWE-bench benchmark harness** for reproducible performance evaluation
- **Double-tiered MCP config** supporting both user-level (~/.omp/) and workspace-level (.omp/) configurations
- **Setup wizard** via /setup and /mcp-setup skills for frictionless onboarding
- **Keyword aliases** in keyword-detector for flexible command recognition
- **22 skills** including: setup, mcp-setup, autopilot, ralph, ultrawork, team, ecomode, swarm, pipeline, plan

### Bug Fixes

_(No bug fixes in initial release)_

### Documentation

- Initial AGENTS.md with agent registry and delegation rules
- CLAUDE.md with project instructions and quick reference
- Spec documents for agents, skills, hooks, HUD, PSM, and MCP

### Stats

- **1 PR merged** | **18 new features** | **0 bug fixes** | **0 security/hardening improvements** | **0 other changes**
