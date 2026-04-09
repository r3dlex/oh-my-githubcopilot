---
id: ARCH-004
title: SQLite PSM as State Persistence Layer
domain: architecture
rules: false
---

# SQLite PSM as State Persistence Layer

## Context

The Plugin State Manager (PSM) needs durable, transactional state across sessions. An SQLite file is portable, requires no external server, and fits the synchronous hook model.

## Decision

The Plugin State Manager (PSM) uses `better-sqlite3` for local state persistence. PSM state is stored at `~/.omp/state/omp.db` — **not** `.omc/state/`, which is used by OMC (oh-my-copilot's own orchestration session state).

- OMC session state: `.omc/state/` (CLAUDE.md worktree_paths)
- OMP PSM state: `~/.omp/state/omp.db` (this ADR)

Runtime path can be overridden via `OMP_STATE_DB` environment variable.

## Rules

- PSM database path resolves to `~/.omp/state/omp.db` at runtime
- No synchronous PSM writes from hook entry points (hooks are synchronous — defer to post-cycle)

## Consequences

- Single-file portable database at `~/.omp/state/omp.db`
- Synchronous API fits the plugin's hook model
- Separate from OMC session state avoids coupling

## Compliance and Enforcement

Set `rules: true` and create a companion `.rules.ts` file to enforce that PSM code uses `~/.omp/state/` and not `.omc/state/` for PSM writes.
