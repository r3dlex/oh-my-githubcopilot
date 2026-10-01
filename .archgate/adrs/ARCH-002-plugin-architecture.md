---
id: ARCH-002
title: Plugin Architecture — Agents, Hooks, Skills
domain: architecture
rules: false
status: provisional
---

# Plugin Architecture — Agents, Hooks, Skills

## Context

oh-my-githubcopilot is a GitHub Copilot CLI plugin with three extension points: agents, hooks, and skills.

## Decision

OMP is structured as a GitHub Copilot CLI plugin with three extension points:

- **Agents** — `.agent.md` files with YAML frontmatter + TypeScript entry. Agents own domains (e.g., `executor.agent.md`, `architect.agent.md`).
- **Hooks** — JSON-registered lifecycle hooks in `hooks/hooks.json`. Six hooks registered: `keyword-detector`, `delegation-enforcer`, `model-router`, `token-tracker`, `hud-emitter`, `stop-continuation`.
- **Skills** — slash-command modules invoked via `/oh-my-githubcopilot:<skill>`; the real skill surface is `skills/<id>/SKILL.md` (59 entries in `plugin.json`), loaded by `src/utils/skill-loader.mts`.

The plugin manifest (`plugin.json`) wires extension points together and is synced to `.claude-plugin/plugin.json` via `npm run sync-claude-plugin`.

## Provisional Status

This ADR is **Provisionally Accepted** because agent TypeScript implementations (`src/agents/*.ts`) do not yet exist. Currently, agents are defined as YAML frontmatter `.agent.md` files only. When `src/agents/` TypeScript files are first created, this ADR must be re-verified and the rules updated.

## Rules (when enforced)

- Hooks must be registered in `hooks/hooks.json` with `id`, `entry`, `trigger`, and `timeoutMs`
- Plugin manifest must exist at `plugin.json`

## Consequences

- Agents are discovered via `.agent.md` files in `src/agents/`
- Hooks are discovered via `hooks/hooks.json`
- Skills are discovered via `skills/<id>/SKILL.md` + `plugin.json`, loaded by `src/utils/skill-loader.mts` — not via `src/skills/` modules. `src/skills/` holds only `spawn-skill.mts` (the single seam that spawns the real `bin/omp.mjs <id>` for skill activation, resolving the bin path from the running module rather than `process.cwd()`) plus the handful of skills with in-process logic (graph-provider, graphify, graphwiki, spending) and the setup/mcp-setup skills.

## Compliance and Enforcement

Rules are **not yet enforceable** — provisional status. When `src/agents/` TypeScript files are created, update this ADR with `rules: true` and a companion `.rules.ts` file.
