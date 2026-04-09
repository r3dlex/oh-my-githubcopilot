---
id: ARCH-002
title: Plugin Architecture — Agents, Hooks, Skills
domain: architecture
rules: false
status: provisional
---

# Plugin Architecture — Agents, Hooks, Skills

## Context

oh-my-copilot is a GitHub Copilot CLI plugin with three extension points: agents, hooks, and skills.

## Decision

OMP is structured as a GitHub Copilot CLI plugin with three extension points:

- **Agents** — `.agent.md` files with YAML frontmatter + TypeScript entry. Agents own domains (e.g., `executor.agent.md`, `architect.agent.md`).
- **Hooks** — JSON-registered lifecycle hooks in `hooks/hooks.json`. Six hooks registered: `keyword-detector`, `delegation-enforcer`, `model-router`, `token-tracker`, `hud-emitter`, `stop-continuation`.
- **Skills** — slash-command modules invoked via `/oh-my-claudecode:<skill>`.

The plugin manifest (`plugin.json`) wires extension points together and is synced to `.claude-plugin/plugin.json` via `npm run sync-claude-plugin`.

## Provisional Status

This ADR is **Provisionally Accepted** because agent TypeScript implementations (`src/agents/*.ts`) do not yet exist. Currently, agents are defined as YAML frontmatter `.agent.md` files only. When `src/agents/` TypeScript files are first created, this ADR must be re-verified and the rules updated.

## Rules (when enforced)

- Hooks must be registered in `hooks/hooks.json` with `id`, `entry`, `trigger`, and `timeoutMs`
- Plugin manifest must exist at `plugin.json`

## Consequences

- Agents are discovered via `.agent.md` files in `src/agents/`
- Hooks are discovered via `hooks/hooks.json`
- Skills are discovered via `src/skills/` modules

## Compliance and Enforcement

Rules are **not yet enforceable** — provisional status. When `src/agents/` TypeScript files are created, update this ADR with `rules: true` and a companion `.rules.ts` file.
