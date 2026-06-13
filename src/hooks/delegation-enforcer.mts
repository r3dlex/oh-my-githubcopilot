/**
 * delegation-enforcer hook
 * Trigger: pre-cycle (PreToolUse equivalent)
 * Priority: 90
 *
 * Blocks the top-level coordinator (orchestrator role) from using Write/Edit — forces delegation.
 * Note: since OMP 2.0, "orchestrator" is the orchestration role of the main session,
 * not a delegatable agent.
 */

import { readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

export interface HookInput {
  hook_type: "PreToolUse";
  tool_name?: string;
  tool_input?: unknown;
  agent_id?: string;
  session_id?: string;
}

export interface HookOutput {
  decision?: "allow" | "deny";
  modifiedArgs?: Record<string, unknown>;
  status: "ok" | "skip" | "error";
  latencyMs: number;
  mutations: Array<{ type: "reroute_tool"; toolCall: unknown; toAgent: string } | { type: "log"; level: "info" | "warn"; message: string }>;
  log: string[];
}

function getSessionStateDir(): string {
  const ompDir = join(homedir(), ".omp", "state");
  return ompDir;
}

function getCurrentAgent(sessionId?: string): string | null {
  try {
    const stateDir = getSessionStateDir();
    const sessionFile = sessionId
      ? join(stateDir, "sessions", sessionId, "session.json")
      : join(stateDir, "session.json");
    const data = JSON.parse(readFileSync(sessionFile, "utf-8"));
    return data.activeAgent || null;
  } catch {
    return null;
  }
}

const BLOCKED_TOOLS = new Set(["Write", "Edit"]);
const BLOCKED_AGENT = "orchestrator";

export function processHook(input: HookInput): HookOutput {
  const start = Date.now();
  const log: string[] = [];

  try {
    if (input.hook_type !== "PreToolUse") {
      return {
        status: "skip",
        latencyMs: Date.now() - start,
        mutations: [],
        log: ["Not a PreToolUse hook"],
      };
    }

    const agentId = input.agent_id || getCurrentAgent(input.session_id);
    const toolName = input.tool_name;

    if (!agentId || !toolName) {
      return {
        status: "ok",
        latencyMs: Date.now() - start,
        mutations: [],
        log: [],
      };
    }

    if (agentId === BLOCKED_AGENT && BLOCKED_TOOLS.has(toolName)) {
      log.push(`ENFORCEMENT: ${agentId} attempted ${toolName} — blocked`);
      log.push(`Rerouting to appropriate specialist agent`);

      return {
        decision: "deny",
        status: "ok",
        latencyMs: Date.now() - start,
        mutations: [
          {
            type: "reroute_tool",
            toolCall: { tool: toolName, params: input.tool_input },
            toAgent: "executor",
          },
          {
            type: "log",
            level: "warn",
            message: `Delegation enforced: ${agentId} cannot use ${toolName}`,
          },
        ],
        log,
      };
    }

    return {
      status: "ok",
      latencyMs: Date.now() - start,
      mutations: [],
      log: [],
    };
  } catch (err) {
    return {
      status: "error",
      latencyMs: Date.now() - start,
      mutations: [],
      log: [`Error: ${err}`],
    };
  }
}

// Main entry point — only runs when executed directly (not imported).
// Fail-open: any stdin/parse/processing failure still emits valid JSON and exits 0.
import { fileURLToPath } from "url";
import { runHookMain } from "./runner.mts";

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await runHookMain(processHook, { failOpenDecision: true, hookName: "delegation-enforcer" });
}
