# oh-my-copilot (OMP)

Multi-agent orchestration for GitHub Copilot CLI.

[![npm version](https://img.shields.io/npm/v/oh-my-copilot?color=red)](https://npmjs.com/package/oh-my-copilot)
[![npm downloads](https://img.shields.io/npm/dm/oh-my-copilot?color=blue)](https://npmjs.com/package/oh-my-copilot)
[![License: MIT](https://img.shields.io/npm/l/oh-my-copilot?color=green)](LICENSE)

---

## Quick Start

```bash
# Install
npm install -g oh-my-copilot

# Initialize (creates ~/.omp/ config)
omc setup

# Start using OMP skills
/omc-setup
```

## Key Features

| Feature | Description |
|---------|-------------|
| **18 Agents** | Specialized subagents for executor, architect, planner, reviewer, debugger, and more |
| **30+ Skills** | autopilot, ralph, ultrawork, team, ecomode, swarm, pipeline, plan |
| **6 Hooks** | Keyword detection, delegation enforcement, model routing, token tracking, HUD emission, stop-continuation |
| **PSM** | Plugin State Manager with SQLite persistence |
| **MCP Server** | 10 tools for extended capabilities |
| **HUD Display** | Real-time session context and progress tracking |
| **SWE-bench** | Benchmark harness for reproducible evaluation |

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     oh-my-copilot                       │
├─────────────────────────────────────────────────────────┤
│  Agents         │  Hooks        │  PSM (SQLite)        │
│  ─────────────  │  ──────────   │  ──────────────      │
│  executor       │  keyword-     │  Cross-session       │
│  architect      │  detector     │  state persistence    │
│  planner        │  delegation- │                      │
│  reviewer       │  enforcer     │  MCP Server          │
│  debugger       │  model-router │  ─────────────       │
│  ... (18 total) │  token-tracker│  10 tools exposed    │
│                 │  hud-emitter   │                      │
│                 │  stop-contin.  │  HUD Display         │
├─────────────────┴───────────────┴─────────────────────┤
│  ~/.omp/ (user)  +  .omp/ (workspace)  configs          │
└─────────────────────────────────────────────────────────┘
```

### Agents

OMP provides 18 specialized agents via Claude Code subagents:

| Agent | Tier | Use Case |
|-------|------|----------|
| executor | opus | Implementation, testing |
| architect | opus | Architecture, security |
| planner | sonnet | Strategic planning |
| document-specialist | sonnet | Documentation |
| reviewer | sonnet | Code review |
| verifier | sonnet | Verification |

_See [AGENTS.md](AGENTS.md) for the full registry._

### Hooks

Six hooks power the orchestration pipeline:

- **keyword-detector** — triggers OMP skills on magic keywords
- **delegation-enforcer** — routes tasks to appropriate agents
- **model-router** — selects optimal model tier per task
- **token-tracker** — monitors usage and cost
- **hud-emitter** — streams session context to HUD
- **stop-continuation** — graceful cancellation handling

### PSM (Plugin State Manager)

Cross-session persistence via SQLite:

```javascript
// State persists across sessions
await state.write({ mode: 'autopilot', iteration: 3 });
const state = await state.read();
```

### MCP Server

10 tools exposed for extended capabilities. See [spec/MCP.md](spec/MCP.md).

## Documentation

- [AGENTS.md](AGENTS.md) — Agent registry and delegation rules
- [spec/AGENTS_SPEC.md](spec/AGENTS_SPEC.md) — Agent capabilities table
- [spec/SKILLS.md](spec/SKILLS.md) — Skill catalog
- [spec/HOOKS.md](spec/HOOKS.md) — Hook system
- [spec/HUD.md](spec/HUD.md) — HUD display
- [spec/PSM.md](spec/PSM.md) — Plugin State Manager
- [spec/MCP.md](spec/MCP.md) — MCP server

## Requirements

- Node.js >= 22.0.0
- GitHub Copilot CLI

---

MIT License | [GitHub](https://github.com/r3dlex/oh-my-copilot)
