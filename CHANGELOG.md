# oh-my-copilot v1.0.0: Initial Release

## Release Notes

Initial release of **oh-my-copilot (OMP)** — a multi-agent orchestration layer for GitHub Copilot CLI with 18 specialized agents, 30+ skills, and deep system integration.

### Highlights

- **24 OMP agents** via Claude Code subagents for specialized delegation (orchestrator, explorer, planner, executor, verifier, writer, reviewer, designer, researcher, tester, debugger, architect, devops, security-reviewer, simplifier, test-engineer, critic, tracer, scientist, code-reviewer, document-specialist, qa-tester, git-master, analyst)
- **6 hooks** powering the orchestration pipeline (keyword-detector, delegation-enforcer, model-router, token-tracker, hud-emitter, stop-continuation)
- **PSM (Plugin State Manager)** with SQLite persistence for cross-session state
- **MCP server** exposing 10 tools for extended capabilities
- **HUD display system** for real-time session context and progress tracking
- **SWE-bench benchmark harness** for reproducible performance evaluation
- **Double-tiered MCP config** supporting both user-level (~/.omp/) and workspace-level (.omp/) configurations
- **Setup wizard** via /setup and /mcp-setup skills for frictionless onboarding
- **Keyword aliases** in keyword-detector for flexible command recognition
- **30+ skills** including: setup, mcp-setup, autopilot, ralph, ultrawork, team, ecomode, swarm, pipeline, plan

### Bug Fixes

_(No bug fixes in initial release)_

### Documentation

- Initial AGENTS.md with agent registry and delegation rules
- CLAUDE.md with project instructions and quick reference
- Spec documents for agents, skills, hooks, HUD, PSM, and MCP

### Stats

- **1 PR merged** | **18 new features** | **0 bug fixes** | **0 security/hardening improvements** | **0 other changes**
