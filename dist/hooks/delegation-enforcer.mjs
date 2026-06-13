// src/hooks/delegation-enforcer.mts
import { readFileSync } from "fs";
import { homedir as homedir2 } from "os";
import { join as join2 } from "path";
import { fileURLToPath } from "url";

// src/hooks/runner.mts
import { appendFileSync, mkdirSync } from "fs";
import { homedir } from "os";
import { join } from "path";
async function readStdin() {
  const readStdinActual = async () => {
    const chunks = [];
    for await (const chunk of process.stdin) {
      chunks.push(String(chunk));
    }
    return chunks.join("");
  };
  const stdinTimeout = new Promise(
    (resolve) => setTimeout(
      () => resolve(""),
      parseInt(process.env.OMP_HOOK_STDIN_TIMEOUT_MS ?? "500") || 500
    )
  );
  return Promise.race([readStdinActual(), stdinTimeout]);
}
function logHookFailure(hook, reason) {
  try {
    process.stderr.write(`[omp hook fail-open] ${hook}: ${reason}
`);
  } catch {
  }
  try {
    const logsDir = join(homedir(), ".omp", "logs");
    mkdirSync(logsDir, { recursive: true });
    const record = JSON.stringify({ ts: (/* @__PURE__ */ new Date()).toISOString(), hook, reason });
    appendFileSync(join(logsDir, "hook-failures.jsonl"), record + "\n", "utf-8");
  } catch {
  }
}
async function runHookMain(processHook2, options = {}) {
  let outputJson;
  try {
    const input = JSON.parse(await readStdin());
    const serialized = JSON.stringify(processHook2(input));
    if (typeof serialized !== "string") {
      throw new Error("hook produced no serializable output");
    }
    outputJson = serialized;
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    logHookFailure(options.hookName ?? "unknown", reason);
    const failOpen = {
      ...options.failOpenDecision ? { decision: "allow" } : {},
      status: "error",
      latencyMs: 0,
      mutations: [],
      log: [`fail-open: ${reason}`]
    };
    outputJson = JSON.stringify(failOpen);
  }
  console.log(outputJson);
  process.exitCode = 0;
}

// src/hooks/delegation-enforcer.mts
function getSessionStateDir() {
  const ompDir = join2(homedir2(), ".omp", "state");
  return ompDir;
}
function getCurrentAgent(sessionId) {
  try {
    const stateDir = getSessionStateDir();
    const sessionFile = sessionId ? join2(stateDir, "sessions", sessionId, "session.json") : join2(stateDir, "session.json");
    const data = JSON.parse(readFileSync(sessionFile, "utf-8"));
    return data.activeAgent || null;
  } catch {
    return null;
  }
}
var BLOCKED_TOOLS = /* @__PURE__ */ new Set(["Write", "Edit"]);
var BLOCKED_AGENT = "orchestrator";
function processHook(input) {
  const start = Date.now();
  const log = [];
  try {
    if (input.hook_type !== "PreToolUse") {
      return {
        status: "skip",
        latencyMs: Date.now() - start,
        mutations: [],
        log: ["Not a PreToolUse hook"]
      };
    }
    const agentId = input.agent_id || getCurrentAgent(input.session_id);
    const toolName = input.tool_name;
    if (!agentId || !toolName) {
      return {
        status: "ok",
        latencyMs: Date.now() - start,
        mutations: [],
        log: []
      };
    }
    if (agentId === BLOCKED_AGENT && BLOCKED_TOOLS.has(toolName)) {
      log.push(`ENFORCEMENT: ${agentId} attempted ${toolName} \u2014 blocked`);
      log.push(`Rerouting to appropriate specialist agent`);
      return {
        decision: "deny",
        status: "ok",
        latencyMs: Date.now() - start,
        mutations: [
          {
            type: "reroute_tool",
            toolCall: { tool: toolName, params: input.tool_input },
            toAgent: "executor"
          },
          {
            type: "log",
            level: "warn",
            message: `Delegation enforced: ${agentId} cannot use ${toolName}`
          }
        ],
        log
      };
    }
    return {
      status: "ok",
      latencyMs: Date.now() - start,
      mutations: [],
      log: []
    };
  } catch (err) {
    return {
      status: "error",
      latencyMs: Date.now() - start,
      mutations: [],
      log: [`Error: ${err}`]
    };
  }
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await runHookMain(processHook, { failOpenDecision: true, hookName: "delegation-enforcer" });
}
export {
  processHook
};
//# sourceMappingURL=delegation-enforcer.mjs.map
