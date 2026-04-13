# oh-my-githubcopilot (OMP)

<p align="center">
  <img src="assets/omp-banner.png" alt="Oh My Copilot" width="100%"/>
</p>

<p align="center">
  Multi-agent orchestration for GitHub Copilot CLI — powered by 23 specialized agents, 25 skills, and a real-time HUD.
</p>

[![npm version](https://img.shields.io/npm/v/oh-my-githubcopilot?color=red)](https://npmjs.com/package/oh-my-githubcopilot)
[![npm downloads](https://img.shields.io/npm/dm/oh-my-githubcopilot?color=blue)](https://npmjs.com/package/oh-my-githubcopilot)
[![License: Apache-2.0](https://img.shields.io/npm/l/oh-my-githubcopilot?color=green)](LICENSE)
[![Sponsor](https://img.shields.io/static/v1?label=Sponsor&message=r3dlex&color=EA4949&logo=github-sponsors)](https://github.com/sponsors/r3dlex)

---

## Why OMP?

Every software team juggles implementation, architecture, security review, testing, and DevOps — all simultaneously. OMP orchestrates specialized agents so every dimension gets expert attention, in parallel, without you herding cats.

| What you get | Why it matters |
|--------------|----------------|
| **23 agents** | executor, architect, planner, reviewer, debugger, designer, security-reviewer, scientist, analyst, and more — each tuned to a different craft |
| **25 skills** | `autopilot`, `ralph`, `ultrawork`, `team`, `ecomode`, `swarm`, `pipeline`, `omp-plan`, `graphify`, `spending`, and more — trigger with a slash command |
| **6 hooks** | Keyword detection, delegation routing, model selection, token tracking, HUD emission, stop-continuation |
| **MCP server** | Built-in tools for extended capabilities |
| **HUD display** | Real-time session context and progress tracking |
| **PSM** | Plugin State Manager with SQLite persistence across sessions |
| **SWE-bench** | Benchmark harness for reproducible evaluation |
| **`.github/` convention** | Agents, skills, and hooks auto-discovered by VS Code Copilot — no config required |

<p align="center">
  <img src="assets/buddy-swarm.png" alt="OMP swarm mode" width="600"/>
</p>

## Quick Start

### 1) Install the plugin

From a local checkout:

```bash
git clone https://github.com/r3dlex/oh-my-githubcopilot.git
cd oh-my-githubcopilot
copilot plugin install ./
```

Or install from GitHub directly:

```bash
copilot plugin install r3dlex/oh-my-githubcopilot
```

### 2) Run first-time setup in Copilot

```text
/skills list
/omp:setup
/mcp show
```

`/omp:setup` now safely merges the required Copilot CLI experimental features into
`~/.copilot/config.json` and fills in `statusLine` if you have not already configured one.
After setup completes, restart the Copilot CLI session so the new experimental/status-line settings are picked up.

Required feature flags ensured by setup:

- `STATUS_LINE`
- `SHOW_FILE`
- `EXTENSIONS`
- `BACKGROUND_SESSIONS`
- `CONFIGURE_COPILOT_AGENT`
- `MULTI_TURN_AGENTS`
- `SESSION_STORE`

### 3) Start delegating work

```text
@executor implement the requested change
@planner break this task into steps
@verifier check build, tests, and diagnostics
```

### Optional: install the CLI companion

```bash
npm install -g oh-my-githubcopilot
omp setup
omp hud
```

The `omp` CLI is a companion tool for local runtime features; the Copilot plugin works without it.
Running `omp setup` performs the same non-destructive Copilot config merge as `/omp:setup`.

### Optional: adopt OMP into another repository

```bash
git clone https://github.com/r3dlex/oh-my-githubcopilot.git /tmp/omp
/tmp/omp/scripts/omp-adopt.sh --target . --mode template
```

<p align="center">
  <img src="assets/buddy-playful.png" alt="OMP in action" width="600"/>
</p>

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    oh-my-githubcopilot                      │
├──────────────────┬──────────────────┬────────────────────────┤
│  Agents (23)     │  Hooks (6)       │  PSM (SQLite)          │
│  ─────────────   │  ─────────────   │  ────────────────      │
│  executor        │  keyword-        │  Cross-session         │
│  architect       │  detector        │  state persistence     │
│  planner         │  delegation-     │                        │
│  reviewer        │  enforcer        │  MCP Server            │
│  debugger        │  model-router    │  ─────────────         │
│  designer        │  token-tracker   │  tools exposed         │
│  security-       │  hud-emitter     │                        │
│  reviewer        │  stop-contin.    │  HUD Display           │
│  ... (23 total)  │                  │  ─────────────         │
│                  │                  │  tmux status bar       │
├──────────────────┴──────────────────┴────────────────────────┤
│  .github/agents/  +  .github/skills/  +  .github/hooks/     │
│  ~/.omp/ (user config)  +  .omp/ (workspace config)         │
└──────────────────────────────────────────────────────────────┘
```

### Agents

OMP provides 23 specialized agents, each with Copilot-compatible frontmatter for native discovery:

| Agent | Model tier | Use case |
|-------|-----------|---------|
| executor | standard | Implementation, file edits, testing |
| architect | high | Architecture decisions and verification |
| planner | high | Strategic planning and sequencing |
| verifier | standard | Build/test/diagnostic validation |
| writer | standard | Documentation and changelog work |
| explorer | fast | Read-only codebase surveys |
| debugger | standard | Root-cause analysis |
| reviewer | high | General quality review |
| security-reviewer | standard | Security review |
| ... | ... | 23 total roles across implementation, planning, QA, and documentation |

### Skills

25 skills, each triggerable via slash command or keyword:

| Skill | Trigger | Purpose |
|------|---------|---------|
| autopilot | `autopilot:` | Autonomous end-to-end execution |
| ralph | `ralph:` | Persistent completion loop |
| ultrawork | `ultrawork:` | Parallel multi-agent high-throughput implementation |
| team | `team:` | Coordinated multi-agent execution |
| deep-interview | `deep-interview:` | Requirements clarification |
| omp-plan | `plan:` | Strategic planning |
| omp-setup | `/omp:setup` | Guided OMP setup |
| graphify | `graphify:` | Knowledge graph generation |
| graphwiki | `graphwiki:` | Query and maintain graphwiki knowledge |
| graph-provider | `graph-provider:` | Manage the active graph backend |
| spending | `spending:` | Track premium request usage |
| ... | ... | 25 total skills |

## Repository Layout

```
.
├── AGENTS.md        # orchestration brain
├── agents/          # 23 Copilot-facing agent files
├── skills/          # 25 skills
├── hooks/           # hook config + shell entrypoints
├── src/             # TypeScript implementation
├── dist/            # built runtime artifacts committed for plugin consumers
├── .github/
│   ├── agents/      # workspace-discovered agent copies
│   ├── skills/      # workspace-discovered skill copies
│   └── copilot-instructions.md
└── spec/            # architecture and subsystem docs
```

## Verification

Before release or plugin publication, verify at least:

```bash
npm run build
npm run typecheck
npm test
```

For plugin smoke checks, reinstall and verify the runtime surfaces:

```bash
copilot plugin uninstall oh-my-githubcopilot
copilot plugin install ./
```

Then check:

```text
/skills list
/omp:setup
@executor
/mcp show
```
