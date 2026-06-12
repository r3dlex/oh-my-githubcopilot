// src/hooks/model-router.mts
import { fileURLToPath } from "url";

// src/hooks/runner.mts
async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(String(chunk));
  }
  return chunks.join("");
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
  if (["orchestrator", "architect", "planner", "reviewer-security", "critic"].includes(agentId)) {
    return "high";
  }
  if (["explorer", "writer"].includes(agentId)) {
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
  await runHookMain(processHook, { failOpenDecision: true });
}
export {
  processHook
};
//# sourceMappingURL=model-router.mjs.map
