# oh-my-copilot (OMP)

<p align="center">
  <img src="assets/omp-banner.png" alt="Oh My Copilot" width="100%"/>
</p>

<p align="center">
  Multi-agent orchestration for GitHub Copilot CLI — powered by 18 specialized agents, 21 skills, and a real-time HUD.
</p>

[![npm version](https://img.shields.io/npm/v/oh-my-copilot?color=red)](https://npmjs.com/package/oh-my-copilot)
[![npm downloads](https://img.shields.io/npm/dm/oh-my-copilot?color=blue)](https://npmjs.com/package/oh-my-copilot)
[![License: MIT](https://img.shields.io/npm/l/oh-my-copilot?color=green)](LICENSE)
[![Sponsor](https://img.shields.io/static/v1?label=Sponsor&message=r3dlex&color=EA4949&logo=github-sponsors)](https://github.com/sponsors/r3dlex)

---

## Why OMP?

Every software team juggles implementation, architecture, security review, testing, and DevOps — all simultaneously. OMP orchestrates specialized agents so every dimension gets expert attention, in parallel, without you herding cats.

| What you get | Why it matters |
|--------------|----------------|
| **23 agents** | Executor, architect, planner, reviewer, debugger, designer, security-reviewer, scientist, analyst, and more — each tuned to a different craft |
| **21 skills** | `autopilot`, `ralph`, `ultrawork`, `team`, `ecomode`, `swarm`, `pipeline`, `plan` — trigger with a slash command |
| **6 hooks** | Keyword detection, delegation routing, model selection, token tracking, HUD emission, stop-continuation |
| **MCP server** | 10 built-in tools for extended capabilities |
| **HUD display** | Real-time session context and progress tracking |
| **PSM** | Plugin State Manager with SQLite persistence across sessions |
| **SWE-bench** | Benchmark harness for reproducible evaluation |

<p align="center">
  <img src="assets/buddy-swarm.png" alt="OMP swarm mode" width="600"/>
</p>

## Quick Start

```bash
# Install
npm install -g oh-my-copilot

# Initialize (creates ~/.omp/ config)
omp setup

# Start using OMP skills
/omp-setup
```

<p align="center">
  <img src="assets/buddy-playful.png" alt="OMP in action" width="600"/>
</p>

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

## 💛 Love this project? [Sponsor r3dlex](https://github.com/sponsors/r3dlex)

If OMP saves you time, consider sponsoring the maintainer:

[![Sponsor r3dlex](https://github.githubassets.com/assets/images/modules/sponsors/modules/SponsorButton--glyph-sm-b5211212fc9306694a295e37672660c1.gif)](https://github.com/sponsors/r3dlex)

Every sponsorship helps keep development going.

MIT License | [GitHub](https://github.com/r3dlex/oh-my-copilot)