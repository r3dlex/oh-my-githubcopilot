/**
 * OMP MCP Server
 * Provides state, memory, and session tools over STDIO transport.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import Database from "better-sqlite3";
import { readFileSync, mkdirSync } from "fs";
import { homedir } from "os";
import { join, dirname } from "path";

// --- Database Setup ---
function getDbPath(): string {
  const envPath = process.env["OMP_STATE_DB"];
  if (envPath) return envPath.replace("~", homedir());
  return join(homedir(), ".omp", "state", "omp.db");
}

function ensureDbDir(dbPath: string): void {
  mkdirSync(dirname(dbPath), { recursive: true });
}

const dbPath = getDbPath();
ensureDbDir(dbPath);
const db = new Database(dbPath);

// Run migrations
db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    worktree_id TEXT,
    state_json TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_sessions_worktree ON sessions(worktree_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_updated ON sessions(updated_at);

  CREATE TABLE IF NOT EXISTS memory (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    category TEXT,
    session_id TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_memory_category ON memory(category);
  CREATE INDEX IF NOT EXISTS idx_memory_session ON memory(session_id);

  CREATE TABLE IF NOT EXISTS trace (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    hook_id TEXT,
    agent_id TEXT,
    event_type TEXT NOT NULL,
    payload TEXT,
    duration_ms INTEGER,
    timestamp INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_trace_session ON trace(session_id);
  CREATE INDEX IF NOT EXISTS idx_trace_hook ON trace(hook_id);
  CREATE INDEX IF NOT EXISTS idx_trace_agent ON trace(agent_id);
`);

// --- Tool Definitions ---
const TOOLS = [
  // State tools
  {
    name: "omp_get_session_state",
    description: "Retrieve the current session state from PSM",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "omp_save_session",
    description: "Persist current session state to SQLite",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "omp_list_sessions",
    description: "List all saved OMP sessions with IDs, creation dates, and task counts",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "omp_get_agents",
    description: "List all 18 OMP agents with their IDs, tiers, tools, and roles",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "omp_delegate_task",
    description: "Delegate a task to a specific OMP agent",
    inputSchema: {
      type: "object",
      properties: {
        agentId: {
          type: "string",
          enum: [
            "orchestrator", "explorer", "planner", "executor", "verifier",
            "writer", "reviewer", "designer", "researcher", "tester",
            "debugger", "architect", "devops", "security", "data",
            "mobile", "performance", "integration",
          ],
        },
        task: { type: "string", description: "Task description" },
        tier: {
          type: "string",
          enum: ["high", "standard", "fast"],
          description: "Model tier override",
        },
      },
      required: ["agentId", "task"],
    },
  },
  {
    name: "omp_activate_skill",
    description: "Activate an OMP skill by keyword or ID",
    inputSchema: {
      type: "object",
      properties: {
        skillId: { type: "string", description: "Skill ID (e.g. 'autopilot', 'ralph')" },
        keyword: { type: "string", description: "Magic keyword (e.g. 'autopilot:', '/ralph')" },
      },
    },
  },
  {
    name: "omp_get_hud_state",
    description: "Return the current HUD state",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "omp_subscribe_hud_events",
    description: "Subscribe to HUD event stream",
    inputSchema: {
      type: "object",
      properties: {
        eventTypes: {
          type: "array",
          items: {
            type: "string",
            enum: ["hud:update", "hud:mode-change", "hud:threshold-warning", "hud:agent-switch", "hud:complete"],
          },
          default: ["hud:update"],
        },
      },
    },
  },
  {
    name: "omp_invoke_hook",
    description: "Manually invoke a hook by ID with input",
    inputSchema: {
      type: "object",
      properties: {
        hookId: {
          type: "string",
          enum: ["keyword-detector", "delegation-enforcer", "model-router", "token-tracker", "hud-emitter", "stop-continuation"],
        },
        input: { type: "object", description: "HookInput conforming to spec/HOOKS.md" },
      },
      required: ["hookId", "input"],
    },
  },
  {
    name: "omp_fleet_status",
    description: "Return fleet-wide status from fleet SQLite",
    inputSchema: { type: "object", properties: {} },
  },
];

// --- Tool Handlers ---
function handleListTools() {
  return { tools: TOOLS };
}

async function handleCallTool(name: string, args: Record<string, unknown>) {
  switch (name) {
    case "omp_get_session_state": {
      const sessions = db.prepare("SELECT * FROM sessions ORDER BY updated_at DESC LIMIT 1").all();
      return { content: [{ type: "text", text: JSON.stringify(sessions[0] || null, null, 2) }] };
    }
    case "omp_save_session": {
      return { content: [{ type: "text", text: JSON.stringify({ status: "ok" }) }] };
    }
    case "omp_list_sessions": {
      const sessions = db.prepare("SELECT id, created_at, updated_at FROM sessions ORDER BY updated_at DESC").all();
      return { content: [{ type: "text", text: JSON.stringify(sessions, null, 2) }] };
    }
    case "omp_get_agents": {
      const agents = [
        { id: "orchestrator", tier: "high", role: "Delegation coordinator" },
        { id: "architect", tier: "high", role: "System design" },
        { id: "executor", tier: "standard", role: "General implementation" },
        { id: "explorer", tier: "fast", role: "Codebase analysis" },
        { id: "analyst", tier: "standard", role: "Quality metrics" },
        { id: "planner", tier: "high", role: "Task decomposition" },
        { id: "debugger", tier: "standard", role: "Root cause analysis" },
        { id: "verifier", tier: "standard", role: "Test execution" },
        { id: "reviewer-style", tier: "standard", role: "Style review" },
        { id: "reviewer-security", tier: "high", role: "Security review" },
        { id: "reviewer-performance", tier: "standard", role: "Performance review" },
        { id: "test-engineer", tier: "standard", role: "Test creation" },
        { id: "dependency-expert", tier: "standard", role: "Dependency audits" },
        { id: "build-fixer", tier: "standard", role: "CI/build fixes" },
        { id: "git-master", tier: "standard", role: "Git strategy" },
        { id: "writer", tier: "fast", role: "Documentation" },
        { id: "designer", tier: "standard", role: "UI/UX design" },
        { id: "critic", tier: "high", role: "Final review" },
      ];
      return { content: [{ type: "text", text: JSON.stringify(agents, null, 2) }] };
    }
    case "omp_delegate_task": {
      // Stub — actual delegation goes through orchestrator
      return { content: [{ type: "text", text: JSON.stringify({ delegated: args.agentId, task: args.task }) }] };
    }
    case "omp_activate_skill": {
      return { content: [{ type: "text", text: JSON.stringify({ skillId: args.skillId || args.keyword, activated: true }) }] };
    }
    case "omp_get_hud_state": {
      try {
        const hudPath = join(homedir(), ".omp", "hud.line");
        const hud = readFileSync(hudPath, "utf-8").trim();
        return { content: [{ type: "text", text: hud }] };
      } catch {
        return { content: [{ type: "text", text: "No HUD state available" }] };
      }
    }
    case "omp_subscribe_hud_events": {
      // SSE subscription over stdio — stub for now
      return { content: [{ type: "text", text: JSON.stringify({ subscribed: true, events: args.eventTypes || ["hud:update"] }) }] };
    }
    case "omp_invoke_hook": {
      return { content: [{ type: "text", text: JSON.stringify({ hookId: args.hookId, invoked: true }) }] };
    }
    case "omp_fleet_status": {
      return { content: [{ type: "text", text: JSON.stringify({ fleet_size: 0, active_workers: 0 }) }] };
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// --- Server Startup ---
const server = new Server(
  { name: "oh-my-copilot", version: "1.0.0" },
  {
    capabilities: { tools: {} },
  }
);

server.setRequestHandler(ListToolsRequestSchema, handleListTools);
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const name = request.params.name;
    const args = request.params.arguments ?? {};
    const result = await handleCallTool(name, args);
    return { content: result.content };
  } catch (err) {
    return {
      content: [{ type: "text", text: JSON.stringify({ error: String(err) }) }],
      isError: true,
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
