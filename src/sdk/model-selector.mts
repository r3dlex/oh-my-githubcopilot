/**
 * Model Selector
 * Advisory model tier routing based on task type.
 */

export type ModelTier = "high" | "standard" | "fast";

interface ModelRecommendation {
  model: string;
  tier: ModelTier;
  reason: string;
}

const MODEL_MAP: Record<ModelTier, string> = {
  high: "claude-opus-4.6",
  standard: "claude-sonnet-4.5",
  fast: "gpt-5.4-mini",
};

const AGENT_TIER_MAP: Record<string, ModelTier> = {
  // "orchestrator" is the top-level coordinator role (not a delegatable agent)
  orchestrator: "high",
  architect: "high",
  planner: "high",
  "security-reviewer": "high",
  critic: "high",
  debugger: "high",
  "code-reviewer": "high",
  executor: "standard",
  verifier: "standard",
  analyst: "standard",
  "test-engineer": "standard",
  "git-master": "standard",
  designer: "standard",
  explore: "fast",
  writer: "fast",
};

/**
 * Get a model recommendation for an agent.
 */
export function recommendForAgent(agentId: string): ModelRecommendation {
  const tier = AGENT_TIER_MAP[agentId] ?? "standard";
  return {
    model: MODEL_MAP[tier],
    tier,
    reason: `Agent '${agentId}' maps to ${tier} tier`,
  };
}

/**
 * Get a model recommendation for a task type.
 */
export function recommendForTask(taskType: string): ModelRecommendation {
  const normalized = taskType.toLowerCase();

  if (normalized.includes("architect") || normalized.includes("design")) {
    return { model: "claude-opus-4.6", tier: "high", reason: "Architecture task" };
  }
  if (normalized.includes("security") || normalized.includes("audit")) {
    return { model: "claude-opus-4.6", tier: "high", reason: "Security task" };
  }
  if (normalized.includes("explor") || normalized.includes("lookup")) {
    return { model: "gpt-5.4-mini", tier: "fast", reason: "Lookup task" };
  }
  if (normalized.includes("write") || normalized.includes("doc")) {
    return { model: "gpt-5.4-mini", tier: "fast", reason: "Documentation task" };
  }

  return { model: "claude-sonnet-4.5", tier: "standard", reason: "Default task" };
}

/**
 * Get all available models.
 */
export function getAvailableModels(): string[] {
  return Object.values(MODEL_MAP);
}