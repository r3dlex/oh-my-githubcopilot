/**
 * HUD Metrics
 * Tracks and estimates HUD metrics from hook events.
 */

export interface HudMetrics {
  tokensEstimated: number;
  tokenBudget: number;
  contextPct: number;
  toolsUsed: Set<string>;
  skillsUsed: Set<string>;
  agentsUsed: Set<string>;
}

// Model context windows in tokens
const MODEL_CONTEXTS: Record<string, number> = {
  "claude-sonnet-4.5": 200_000,
  "claude-sonnet-4.6": 200_000,
  "claude-opus-4.6": 200_000,
  "gpt-5": 128_000,
  "gpt-5.4-mini": 128_000,
  default: 200_000,
};

/**
 * Estimate tokens from a string or object.
 * Approximate: 1 token ≈ 4 characters.
 */
export function estimateTokens(input: unknown): number {
  if (!input) return 0;
  try {
    const str = typeof input === "string" ? input : JSON.stringify(input);
    return Math.ceil(str.length / 4);
  } catch {
    return 0;
  }
}

/**
 * Calculate context percentage from token count and model.
 */
export function calcContextPct(tokens: number, model: string): number {
  const limit = MODEL_CONTEXTS[model] || MODEL_CONTEXTS.default;
  return Math.min(100, Math.round((tokens / limit) * 100));
}

/**
 * Update metrics after a tool call.
 */
export function updateMetrics(
  metrics: HudMetrics,
  toolName: string,
  toolInput: unknown,
  toolOutput: unknown,
  model: string
): HudMetrics {
  const inputTokens = estimateTokens(toolInput);
  const outputTokens = estimateTokens(toolOutput);
  metrics.tokensEstimated += inputTokens + outputTokens;
  metrics.contextPct = calcContextPct(metrics.tokensEstimated, model);
  metrics.toolsUsed.add(toolName);
  return metrics;
}
