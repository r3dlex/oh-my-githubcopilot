# OMP MCP Server Specification

## 1. Purpose

The OMP MCP server exposes OMP capabilities as a Model Context Protocol server, enabling external clients (Claude Desktop, other MCP clients, custom tooling) to interact with OMP agents, hooks, HUD, and state management. It also serves as a bridge between OMP and non-Copilot-CLI environments.

## 2. .mcp.json Configuration

Clients connect to the OMP MCP server via the standard MCP configuration file:

```json
{
  "schemaVersion": "1.0",
  "mcpServers": {
    "oh-my-copilot": {
      "type": "stdio",
      "command": "node",
      "args": ["./dist/mcp/server.js"],
      "env": {
        "OMP_STATE_DB": "~/.omp/state/omp.db",
        "OMP_FLEET_DB": "~/.omp/fleet/fleet.db",
        "OMP_LOG_LEVEL": "info"
      }
    }
  }
}
```

The server communicates over stdio using the MCP JSON-RPC protocol. No network port is opened by default.

## 3. MCP Server Architecture

```
Client (e.g. Claude Desktop)
    │
    ▼ stdio JSON-RPC
┌──────────────────────────────────┐
│  OMP MCP Server                  │
│  dist/mcp/server.js              │
│                                  │
│  ┌────────────────────────────┐  │
│  │  Tool Router               │  │
│  │  Routes requests → agents  │  │
│  └────────────┬───────────────┘  │
│               │                  │
│  ┌────────────▼───────────────┐  │
│  │  Agent Orchestrator        │  │
│  │  (same as CLI orchestrator)│  │
│  └────────────┬───────────────┘  │
│               │                  │
│  ┌────────────▼───────────────┐  │
│  │  SQLite State Layer        │  │
│  │  ~/.omp/state/omp.db       │  │
│  └────────────────────────────┘  │
└──────────────────────────────────┘
```

## 4. Available Tools

The OMP MCP server exposes the following 10 tools:

| # | Tool | Description | Parameters |
|---|------|-------------|------------|
| 1 | `omp_delegate_task` | Delegate a task to a specific agent | `agentId`, `task`, `tier` |
| 2 | `omp_get_agents` | List all registered agents with their IDs and roles | none |
| 3 | `omp_activate_skill` | Activate an OMP skill by keyword or ID | `skillId` or `keyword` |
| 4 | `omp_get_hud_state` | Return the current HUD state | none |
| 5 | `omp_subscribe_hud_events` | Subscribe to HUD event stream | `eventTypes[]` |
| 6 | `omp_get_session_state` | Retrieve the current session state from PSM | none |
| 7 | `omp_save_session` | Persist current session state to SQLite | none |
| 8 | `omp_list_sessions` | List all saved sessions with metadata | none |
| 9 | `omp_invoke_hook` | Manually invoke a hook by ID with input | `hookId`, `input` |
| 10 | `omp_fleet_status` | Return fleet-wide status from fleet SQLite | none |

## 5. Tool Definitions

### omp_delegate_task

```json
{
  "name": "omp_delegate_task",
  "description": "Delegate a coding task to a specific OMP agent",
  "inputSchema": {
    "type": "object",
    "properties": {
      "agentId": { "type": "string", "enum": ["orchestrator","explorer","planner","executor","verifier","writer","reviewer","designer","researcher","tester","debugger","architect","devops","security","data","mobile","performance","integration"] },
      "task": { "type": "string", "description": "Task description" },
      "tier": { "type": "string", "enum": ["high","standard","fast"], "description": "Model tier override" }
    },
    "required": ["agentId", "task"]
  }
}
```

### omp_get_agents

```json
{
  "name": "omp_get_agents",
  "description": "List all 18 OMP agents with their IDs, tiers, tools, and roles",
  "inputSchema": { "type": "object", "properties": {} }
}
```

### omp_activate_skill

```json
{
  "name": "omp_activate_skill",
  "description": "Activate an OMP execution mode or skill by ID or magic keyword",
  "inputSchema": {
    "type": "object",
    "properties": {
      "skillId": { "type": "string", "description": "Skill ID (e.g. 'autopilot', 'ralph')" },
      "keyword": { "type": "string", "description": "Magic keyword (e.g. 'autopilot:', '/ralph')" }
    }
  }
}
```

### omp_get_hud_state

```json
{
  "name": "omp_get_hud_state",
  "description": "Return the current HUD state including context %, tokens, active mode, task progress",
  "inputSchema": { "type": "object", "properties": {} }
}
```

### omp_subscribe_hud_events

```json
{
  "name": "omp_subscribe_hud_events",
  "description": "Subscribe to real-time HUD event stream (hud:update, hud:mode-change, hud:threshold-warning, hud:agent-switch, hud:complete)",
  "inputSchema": {
    "type": "object",
    "properties": {
      "eventTypes": {
        "type": "array",
        "items": { "type": "string", "enum": ["hud:update","hud:mode-change","hud:threshold-warning","hud:agent-switch","hud:complete"] },
        "default": ["hud:update"]
      }
    }
  }
}
```

#### Event Subscription Protocol (`omp_subscribe_hud_events`)

The MCP server uses **SSE (Server-Sent Events)** over stdio for push-based HUD event delivery. After a client calls `omp_subscribe_hud_events`, the server streams events as newline-delimited JSON objects:

```json
{"event":"hud:update","data":{"contextPct":67,"tokensUsed":12400,"agentsActive":["executor","verifier"]}}
{"event":"hud:threshold-warning","data":{"type":"context","value":85,"message":"Context at 85%"}}
{"event":"hud:complete","data":{"sessionId":"abc123","duration":840000}}
```

**Event types:**

| Event | Trigger | Fields |
|-------|---------|--------|
| `hud:update` | Every PostToolUse hook | `contextPct`, `tokensUsed`, `agentsActive` |
| `hud:mode-change` | Skill activated/deactivated | `mode: ExecutionMode \| null` |
| `hud:threshold-warning` | ctx ≥ 80% or tokens ≥ 80% budget | `type`, `value`, `message` |
| `hud:agent-switch` | Delegation to new agent | `from`, `to` |
| `hud:complete` | Session ends | `sessionId`, `duration` |

Clients unsubscribe by closing their stdio connection. The subscription is scoped to the current session and terminates on `SessionEnd`.

### omp_get_session_state

```json
{
  "name": "omp_get_session_state",
  "description": "Retrieve the current session state from the PSM",
  "inputSchema": { "type": "object", "properties": {} }
}
```

### omp_save_session

```json
{
  "name": "omp_save_session",
  "description": "Persist the current session state to SQLite",
  "inputSchema": { "type": "object", "properties": {} }
}
```

### omp_list_sessions

```json
{
  "name": "omp_list_sessions",
  "description": "List all saved OMP sessions with IDs, creation dates, and task counts",
  "inputSchema": { "type": "object", "properties": {} }
}
```

### omp_invoke_hook

```json
{
  "name": "omp_invoke_hook",
  "description": "Manually invoke an OMP hook by ID with custom input",
  "inputSchema": {
    "type": "object",
    "properties": {
      "hookId": { "type": "string", "enum": ["keyword-detector","delegation-enforcer","model-router","token-tracker","hud-emitter","stop-continuation"] },
      "input": { "type": "object", "description": "HookInput conforming to spec/HOOKS.md" }
    },
    "required": ["hookId", "input"]
  }
}
```

### omp_fleet_status

```json
{
  "name": "omp_fleet_status",
  "description": "Return fleet-wide session count, agent states, and resource usage from fleet SQLite",
  "inputSchema": { "type": "object", "properties": {} }
}
```

## 6. SQLite Schema

OMP uses SQLite for state persistence. The main database is at `~/.omp/state/omp.db`.

### Table: sessions

```sql
CREATE TABLE sessions (
  id          TEXT PRIMARY KEY,
  worktree_id TEXT,
  state_json  TEXT NOT NULL,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);
CREATE INDEX idx_sessions_worktree ON sessions(worktree_id);
CREATE INDEX idx_sessions_updated ON sessions(updated_at);
```

### Table: memory

```sql
CREATE TABLE memory (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  category    TEXT,
  session_id  TEXT,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL,
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);
CREATE INDEX idx_memory_category ON memory(category);
CREATE INDEX idx_memory_session ON memory(session_id);
```

### Table: trace

```sql
CREATE TABLE trace (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id  TEXT NOT NULL,
  hook_id     TEXT,
  agent_id    TEXT,
  event_type  TEXT NOT NULL,
  payload     TEXT,
  duration_ms INTEGER,
  timestamp   INTEGER NOT NULL,
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);
CREATE INDEX idx_trace_session ON trace(session_id);
CREATE INDEX idx_trace_hook ON trace(hook_id);
CREATE INDEX idx_trace_agent ON trace(agent_id);
CREATE INDEX idx_trace_timestamp ON trace(timestamp);
```

The fleet database at `~/.omp/fleet/fleet.db` uses the same schema but with an additional `fleet_id` column to distinguish fleet-wide records from per-session records.

## 7. Tool Routing

Incoming MCP tool requests are routed as follows:

1. MCP server receives JSON-RPC request
2. Routes to `ToolRouter.handle(request)`
3. ToolRouter validates against `ToolDefinition` input schema
4. For agent-delegation tools: calls `orchestrator.delegate(agentId, task)`
5. For state tools: reads/writes SQLite via `StateManager`
6. Returns JSON-RPC response with result or error

Errors follow standard JSON-RPC error codes:
- `-32600` Invalid request
- `-32601` Method not found
- `-32602` Invalid params
- `-32000` Server error (internal)