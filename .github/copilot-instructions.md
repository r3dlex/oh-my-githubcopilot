# OMP — Copilot Instructions

You are running with **OMP (oh-my-githubcopilot)**, a GitHub Copilot workflow layer built around **23 agents**, **25 skills**, shell hooks, a HUD, and an MCP server.

## What OMP is for

Use OMP to route work to the best-fit specialist instead of solving every task in one generic lane.

Core rule set:
- Understand the request before acting.
- Delegate specialized work to the right agent or skill.
- Prefer small, verifiable changes.
- Verify before claiming completion.
- Keep outputs concrete, evidence-backed, and scoped.

## Agent Catalog

| Agent | Primary use |
| --- | --- |
| `orchestrator` | Top-level coordination and delegation |
| `explorer` | Fast codebase surveys and file discovery |
| `planner` | Execution plans, sequencing, and risk framing |
| `executor` | Implementation, refactors, and file edits |
| `verifier` | Build/test/diagnostic evidence collection |
| `writer` | Documentation and changelog updates |
| `reviewer` | General quality and completeness review |
| `architect` | System design and read-only design verification |
| `debugger` | Root-cause analysis and failure isolation |
| `researcher` | External docs and reference lookups |
| `designer` | UI/UX and design-system translation |
| `security-reviewer` | Security findings and trust-boundary review |
| `analyst` | Requirements clarification and acceptance criteria |
| `critic` | Plan review and gap analysis |
| `code-reviewer` | Severity-rated code review |
| `test-engineer` | Test strategy and regression design |
| `tester` | Test authoring and coverage work |
| `qa-tester` | Runtime QA and interaction checks |
| `git-master` | Commit strategy and history hygiene |
| `scientist` | Data/experiment-style analysis |
| `tracer` | Evidence-driven causal tracing |
| `document-specialist` | Documentation synthesis and reference support |
| `simplifier` | Behavior-preserving simplification |

## Delegation Rules

1. Use `explorer` first for fast discovery.
2. Use `planner` before broad or risky implementation.
3. Use `executor` for code changes.
4. Use `verifier` before declaring done.
5. Use `writer` for README, changelog, and user-facing docs.
6. Use `architect`, `security-reviewer`, or `critic` when the risk or scope justifies an independent pass.

## Skill Catalog

### Core workflows
- `autopilot`
- `ralph`
- `ultrawork`
- `team`
- `swarm`
- `pipeline`
- `deep-interview`
- `omp-plan`
- `omp-setup`
- `ecomode`

### Utilities and platform support
- `hud`
- `trace`
- `note`
- `configure-notifications`
- `release`
- `mcp-setup`
- `setup`
- `psm`
- `learner`

### Graph + knowledge workflows
- `graphify`
- `graphwiki`
- `graph-provider`
- `wiki`
- `spending`
- `swe-bench`

## HUD Reference

The HUD is the compact session status line. Read it left-to-right:
- version / mode
- active model
- context usage
- approximate token usage
- request count / age
- tools used
- skills used
- agents used
- current status

Treat the HUD as runtime context, not a replacement for verification.

## Keyword Quick Reference

Prefer slash commands when possible.

| Intent | Prefer |
| --- | --- |
| plan the work | `/omp-plan` |
| run guided setup | `/omp:setup` |
| keep going to completion | `/ralph` |
| parallel execution | `/ultrawork` |
| coordinated multi-agent work | `/team` |
| requirements interview | `/deep-interview` |
| HUD help | `/hud` |
| inspect skills | `/skills list` |
| inspect MCP tools | `/mcp show` |

## Working Style

- Be explicit about assumptions.
- Prefer the smallest correct diff.
- Do not skip tests, diagnostics, or build checks when code changes.
- Do not claim completion without fresh evidence.
