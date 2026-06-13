// src/hooks/model-router.mts
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
      parseInt(process.env.OMP_HOOK_STDIN_TIMEOUT_MS ?? "500")
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

// src/hooks/model-router.mts
var TIER_RECOMMENDATIONS = {
  high: "model: claude-opus-4.6 or gpt-5 recommended for this task (architecture, security, critical decisions)",
  standard: "model: claude-sonnet-4.6 recommended for this task (standard implementation and review)",
  fast: "model: gpt-5.4-mini or haiku recommended for quick lookups and formatting"
};
var DEFAULT_TIER = "standard";
function processHook(input) {
  const start = Date.now();
  try {
    if (input.hook_type !== "PreToolUse") {
      return {
        status: "skip",
        latencyMs: Date.now() - start,
        mutations: [],
        log: []
      };
    }
    const agentId = input.agent_id;
    if (!agentId) {
      return {
        status: "ok",
        latencyMs: Date.now() - start,
        mutations: [],
        log: []
      };
    }
    const agentTier = getAgentTier(agentId);
    const recommendation = TIER_RECOMMENDATIONS[agentTier] || TIER_RECOMMENDATIONS[DEFAULT_TIER];
    const mutations = [
      { type: "set_model", model: agentTierToModel(agentTier) }
    ];
    return {
      status: "ok",
      latencyMs: Date.now() - start,
      additionalContext: recommendation,
      mutations,
      log: [`${agentId} \u2192 tier: ${agentTier} \u2192 ${agentTierToModel(agentTier)}`]
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
function getAgentTier(agentId) {
  if (["orchestrator", "architect", "planner", "security-reviewer", "critic", "debugger", "code-reviewer", "analyst", "designer", "code-simplifier"].includes(agentId)) {
    return "high";
  }
  if (["explore"].includes(agentId)) {
    return "fast";
  }
  return "standard";
}
function agentTierToModel(tier) {
  if (tier === "high") return "opus";
  if (tier === "fast") return "haiku";
  return "sonnet";
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await runHookMain(processHook, { failOpenDecision: true, hookName: "model-router" });
}
export {
  processHook
};
//# sourceMappingURL=model-router.mjs.map
