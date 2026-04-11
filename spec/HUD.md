# OMP HUD Specification

## 1. Overview

The HUD (Heads-Up Display) provides real-time session status to the user without disrupting the main conversation. It renders context utilization, active mode, token budget, agent activity, and task progress. The HUD is driven by the `hud-emitter` hook firing on every agent cycle.

## 2. HUD Format Template

```
[OMP v1.0.0] <mode> | <model> | ctx:<contextPct>% | tok:~<tokensUsed>/<tokensTotal> | <duration> | tools:<count> | skills:<count> | agents:<count> | <status>
```

| Field | Example | Description |
|-------|---------|-------------|
| `mode` | `autopilot` | Current execution mode, or `-` if none |
| `model` | `sonnet` | Active model identifier |
| `contextPct` | `67` | Estimated context window utilization % |
| `tokensUsed` | `67k` | Tokens consumed this session (short form with ~) |
| `tokensTotal` | `200k` | Model context window size |
| `duration` | `3m` | Session elapsed time |
| `tools` | `12` | Count of unique tools used |
| `skills` | `5` | Count of unique skills invoked |
| `agents` | `3` | Count of cumulative agents used |
| `status` | `running` | Current session status |

Example: `[OMP v1.0.0] autopilot | sonnet | ctx:67% | tok:~67k/200k | 3m | tools:12 | skills:5 | agents:3 | ● running`

Status values: `idle`, `running`, `waiting`, `complete`, `error`, `eco`

## 3. HudState TypeScript Interface

```typescript
interface HudState {
  sessionId: string;
  activeMode: ExecutionMode | null;
  activeModel: string;          // NEW: active model identifier
  contextPct: number;           // 0-100, estimated from token usage
  tokensUsed: number;
  tokensTotal: number;
  agentsActive: string[];
  lastAgent: string;
  lastOutput: string;           // last agent output, max 200 chars
  taskProgress: number;         // 0-100
  status: HudStatus;
  startedAt: number;            // unix timestamp ms
  updatedAt: number;
  version: string;
  sessionDurationMs: number;    // NEW: session duration in ms
  cumulativeAgentsUsed: number; // NEW: count of cumulative agents used
  toolsUsed: Set<string>;       // NEW: unique tools used
  skillsUsed: Set<string>;      // NEW: unique skills invoked
}

type HudStatus = 'idle' | 'running' | 'waiting' | 'complete' | 'error' | 'eco';

// ExecutionMode is defined in spec/HOOKS.md as the string union:
// type ExecutionMode = 'autopilot' | 'ralph' | 'ultrawork' | 'team' | 'ecomode' | 'swarm' | 'pipeline' | 'plan';
```

## 4. Context % Estimation Method

Context utilization is estimated using the `token-tracker` hook's cumulative tracking:

```
contextPct = (tokensUsed / tokensTotal) * 100
```

The `hud-emitter` reads from the token tracker's state. When tokens exceed 80%, the HUD displays a warning indicator:

| Context % | Indicator | Color |
|----------|-----------|-------|
| 0-59% | (empty) | default |
| 60-79% | `⚡` | yellow |
| 80-89% | `⚡⚡` | orange |
| 90-100% | `⚡⚡⚡` | red + "ECO" badge |

The orchestrator reads `contextPct` and responds accordingly (prioritize completion, suppress exploration).

## 5. Data Flow Diagram

```
Agent Cycle Completes
        │
        ▼
┌─────────────────┐     ┌──────────────────┐
│  hud-emitter    │────▶│  HUD State Store │
│  hook fires     │     │  (memory/PSM)    │
└─────────────────┘     └────────┬─────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              ▼                  ▼                  ▼
       ┌────────────┐    ┌────────────┐    ┌────────────┐
       │  Strategy A │    │ Strategy B │    │ Strategy C │
       │  Copilot CLI│    │ tmux       │    │ File poll  │
       │  status bar │    │ status-right│   │ consumer   │
       └────────────┘    └────────────┘    └────────────┘
```

1. Agent cycle completes
2. `hud-emitter` hook fires (trigger: `post-cycle`)
3. Hook reads current HudState from state store
4. Emits updated HudState to registered display strategies
5. Each strategy renders the HUD in its respective output channel

## 6. Display Strategies

### Strategy A: Copilot CLI Status

OMP writes to a temporary file `~/.omp/hud/status.json`. The Copilot CLI reads this file and renders the status in its own UI. Updates occur on every `hud-emitter` cycle.

```typescript
// Consumer reads ~/.omp/hud/status.json
const hud: HudState = JSON.parse(fs.readFileSync(statusPath, 'utf-8'));
```

### Strategy B: tmux Status Right

OMP writes a shell prompt segment to `~/.omp/hud/tmux-segment.sh`. The user configures tmux to source this script in `status-right`. Update frequency: every 3 seconds (debounced).

```bash
# ~/.tmux.conf
set -g status-right '#(cat ~/.omp/hud/tmux-segment.sh)'
```

The segment file contains pure text suitable for tmux (no ANSI codes in the segment; color via tmux `#[fg=...]`).

### Strategy C: File Polling (Passive Consumer)

OMP writes a complete HUD line to `~/.omp/hud/display.txt`. Any consumer (tmux widget, terminal overlay, Alfred workflow) can read this file at its own polling interval. Write is atomic (write to temp, rename).

## 7. Color Coding Thresholds

The HUD uses ANSI color codes when supported (Strategy B and C):

| Context % | Color | Meaning |
|-----------|-------|---------|
| 0-59% | default (white/gray) | Healthy |
| 60-79% | yellow | Moderate load |
| 80-89% | orange | High load, ecomode recommended |
| 90-100% | red | Critical, ecomode active |

Mode-specific colors:
| Mode | Color | Icon |
|------|-------|------|
| `autopilot` | cyan | `▶` |
| `ralph` | magenta | `⟳` |
| `ultrawork` | green | `⚡` |
| `team` | blue | `⬡` |
| `ecomode` | yellow | `◐` |
| `swarm` | orange | `⬡` |
| `pipeline` | purple | `▶` |
| `plan` | white | `◎` |

## 8. HUD Events Emitted

The `hud-emitter` hook emits the following events:

- `hud:update` — Full state push on every agent cycle
- `hud:mode-change` — When execution mode changes
- `hud:threshold-warning` — When context crosses 60%, 80%, 90%
- `hud:agent-switch` — When active agent changes
- `hud:complete` — When stop-continuation signals session end

Consumers can subscribe to events via the MCP server's `subscribe_hud_events` tool (see `spec/MCP.md`).