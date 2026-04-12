/**
 * token-tracker hook
 * Trigger: post-message (PostToolUse equivalent)
 * Priority: 70
 *
 * Estimates token usage from character counts (1 token ≈ 4 chars).
 * Accumulates in session state. Warns at 60%, 80%, 90% thresholds.
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { incrementSpending } from "../spending/tracker.mjs";

export interface HookInput {
  hook_type: "PostToolUse";
  tool_name?: string;
  tool_input?: unknown;
  tool_output?: unknown;
  session_id?: string;
}

export interface HookOutput {
  modifiedResult?: unknown;
  status: "ok" | "skip" | "error";
  latencyMs: number;
  mutations: Array<{ type: "set_token_budget"; budget: number } | { type: "emit_hud"; hudEmit: unknown } | { type: "log"; level: "info" | "warn" | "error"; message: string }>;
  log: string[];
}

interface SessionState {
  tokens_estimated: number;
  token_budget: number;
  context_pct: number;
  warnings_issued: Set<string>;
}

// Model context windows in tokens (for future model-specific budget lookup)
// Exported for potential external use
export const MODEL_CONTEXTS = {
  "claude-sonnet-4.5": 200_000,
  "claude-sonnet-4": 200_000,
  "claude-sonnet-4.6": 200_000,
  "claude-opus-4.6": 200_000,
  "gpt-5": 128_000,
  "gpt-5.4-mini": 128_000,
  "gemini-3-pro": 128_000,
  default: 200_000,
};

const WARNING_THRESHOLDS = [60, 80, 90];

export function estimateTokens(input: unknown): number {
  if (!input) return 0;
  try {
    const str = typeof input === "string" ? input : JSON.stringify(input);
    return Math.ceil(str.length / 4);
  } catch {
    return 0;
  }
}

function getStatePath(sessionId?: string): string {
  const base = join(homedir(), ".omp", "state");
  if (sessionId) {
    return join(base, "sessions", sessionId, "session.json");
  }
  return join(base, "session.json");
}

function ensureDir(path: string): void {
  mkdirSync(path.substring(0, path.lastIndexOf("/")), { recursive: true });
}

export function processHook(input: HookInput): HookOutput {
  const start = Date.now();
  const log: string[] = [];

  try {
    if (input.hook_type !== "PostToolUse") {
      return {
        status: "skip",
        latencyMs: Date.now() - start,
        mutations: [],
        log: [],
      };
    }

    const statePath = getStatePath(input.session_id);
    let state: SessionState;

    try {
      state = JSON.parse(readFileSync(statePath, "utf-8"));
    } catch {
      // Initialize state if not found
      state = {
        tokens_estimated: 0,
        token_budget: 200_000,
        context_pct: 0,
        warnings_issued: new Set(),
      };
    }

    const inputTokens = estimateTokens(input.tool_input);
    const outputTokens = estimateTokens(input.tool_output);
    const delta = inputTokens + outputTokens;

    state.tokens_estimated += delta;
    state.context_pct = Math.min(100, Math.round((state.tokens_estimated / state.token_budget) * 100));

    const mutations: HookOutput["mutations"] = [
      { type: "set_token_budget", budget: state.token_budget },
    ];

    // Check warning thresholds
    for (const threshold of WARNING_THRESHOLDS) {
      const key = `warn_${threshold}`;
      if (state.context_pct >= threshold && !state.warnings_issued.has(key)) {
        state.warnings_issued.add(key);
        const message =
          threshold >= 90
            ? `CRITICAL: Context at ${state.context_pct}%. Tokens near budget limit.`
            : threshold >= 80
            ? `WARNING: Context at ${state.context_pct}%. Consider enabling ecomode.`
            : `INFO: Context at ${state.context_pct}%.`;
        mutations.push({ type: "log", level: threshold >= 80 ? "warn" : "info", message });
        log.push(message);
      }
    }

    // Write state back
    try {
      ensureDir(statePath);
      writeFileSync(statePath, JSON.stringify(state), "utf-8");
    } catch (e) {
      log.push(`Failed to write state: ${e}`);
    }

    // Track premium request spending
    const sessionId = input.session_id ?? `omp-${Date.now()}`;
    try { incrementSpending(sessionId); } catch { /* non-blocking */ }

    return {
      status: "ok",
      latencyMs: Date.now() - start,
      mutations,
      log,
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
