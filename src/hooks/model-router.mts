/**
 * model-router hook
 * Trigger: pre-cycle (PreToolUse equivalent)
 * Priority: 80
 *
 * Reads agent frontmatter model_tier and adds advisory additionalContext.
 */

export interface HookInput {
  hook_type: "PreToolUse";
  tool_name?: string;
  agent_id?: string;
  session_id?: string;
}

export interface HookOutput {
  decision?: "allow";
  additionalContext?: string;
  status: "ok" | "skip" | "error";
  latencyMs: number;
  mutations: Array<{ type: "set_model"; model: "opus" | "sonnet" | "haiku" }>;
  log: string[];
}

// Model tier recommendations — advisory only
const TIER_RECOMMENDATIONS: Record<string, string> = {
  high: "model: claude-opus-4.6 or gpt-5 recommended for this task (architecture, security, critical decisions)",
  standard: "model: claude-sonnet-4.5 recommended for this task (standard implementation and review)",
  fast: "model: gpt-5.4-mini or haiku recommended for quick lookups and formatting",
};

// Default if agent tier unknown
const DEFAULT_TIER = "standard";

export function processHook(input: HookInput): HookOutput {
  const start = Date.now();

  try {
    if (input.hook_type !== "PreToolUse") {
      return {
        status: "skip",
        latencyMs: Date.now() - start,
        mutations: [],
        log: [],
      };
    }

    const agentId = input.agent_id;
    if (!agentId) {
      return {
        status: "ok",
        latencyMs: Date.now() - start,
        mutations: [],
        log: [],
      };
    }

    // Agent tier is determined by agent frontmatter in the agent definition files.
    // This hook reads agent metadata from the session state or agent registry.
    // For now, we use a simple mapping based on known agent tiers.
    const agentTier = getAgentTier(agentId);
    const recommendation = TIER_RECOMMENDATIONS[agentTier] || TIER_RECOMMENDATIONS[DEFAULT_TIER];

    const mutations: HookOutput["mutations"] = [
      { type: "set_model", model: agentTierToModel(agentTier) },
    ];

    return {
      status: "ok",
      latencyMs: Date.now() - start,
      additionalContext: recommendation,
      mutations,
      log: [`${agentId} → tier: ${agentTier} → ${agentTierToModel(agentTier)}`],
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

function getAgentTier(agentId: string): string {
  // Tier 1 — High
  if (["orchestrator", "architect", "planner", "reviewer-security", "critic"].includes(agentId)) {
    return "high";
  }
  // Tier 3 — Fast
  if (["explorer", "writer"].includes(agentId)) {
    return "fast";
  }
  // Tier 2 — Standard (default)
  return "standard";
}

function agentTierToModel(tier: string): "opus" | "sonnet" | "haiku" {
  if (tier === "high") return "opus";
  if (tier === "fast") return "haiku";
  return "sonnet";
}

// Main entry point — only runs when executed directly (not imported)
import { fileURLToPath } from "url";

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input: HookInput = JSON.parse(await readStdin());
  const output = processHook(input);
  console.log(JSON.stringify(output));
}

async function readStdin(): Promise<string> {
  const chunks: string[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return chunks.join("");
}
