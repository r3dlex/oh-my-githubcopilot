/**
 * hud-emitter hook
 * Trigger: post-cycle (PostToolUse + SessionStart)
 * Priority: 60
 *
 * Writes HUD statusline to ~/.omp/hud.line after every tool call.
 * Initializes session state on SessionStart.
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { homedir } from "os";
import { join } from "path";

export interface HookInput {
  hook_type: "SessionStart" | "PostToolUse";
  tool_name?: string;
  tool_input?: unknown;
  tool_output?: unknown;
  session_id?: string;
  model?: string;
}

export interface HookOutput {
  status: "ok" | "skip" | "error";
  latencyMs: number;
  mutations: Array<{ type: "emit_hud"; hudEmit: HudEmit } | { type: "log"; level: "info"; message: string }>;
  log: string[];
}

export interface HudEmit {
  sessionId: string;
  activeMode: string | null;
  contextPct: number;
  tokensUsed: number;
  tokensTotal: number;
  agentsActive: string[];
  lastAgent: string;
  lastOutput: string;
  taskProgress: number;
}

interface SessionState {
  version: string;
  session_id: string;
  started_at: number;
  model: string;
  tokens_estimated: number;
  token_budget: number;
  context_pct: number;
  tools_used: string[];
  skills_used: string[];
  agents_used: string[];
  active_mode: string | null;
}

function getStatePath(sessionId?: string): string {
  const base = join(homedir(), ".omp", "state");
  if (sessionId) {
    return join(base, "sessions", sessionId, "session.json");
  }
  return join(base, "session.json");
}

function getHudLinePath(): string {
  return join(homedir(), ".omp", "hud.line");
}

function ensureDir(path: string): void {
  mkdirSync(path.substring(0, path.lastIndexOf("/")), { recursive: true });
}

function formatAge(startedAt: number): string {
  const elapsed = Date.now() - startedAt;
  const mins = Math.floor(elapsed / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return `${hours}h${remainingMins}m`;
}

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `~${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `~${(tokens / 1_000).toFixed(1)}k`;
  return `~${tokens}`;
}

function buildHudLine(state: SessionState): string {
  const age = formatAge(state.started_at);
  const tokens = formatTokens(state.tokens_estimated);
  const ctx = state.context_pct;
  const tools = state.tools_used.length;
  const skills = state.skills_used.length;
  const agents = state.agents_used.length;
  const mode = state.active_mode || "-";
  const model = state.model || "sonnet";

  return `OMP v${state.version} | ${model} | tkn: ${tokens}/${state.token_budget} | ctx: ${ctx}% | session: ${age} | tools: ${tools} | skills: ${skills} | agents: ${agents} | mode: ${mode}`;
}

function processSessionStart(input: HookInput): HookOutput {
  const start = Date.now();
  const log: string[] = [];
  const sessionId = input.session_id || "default";

  const state: SessionState = {
    version: "1.0.0",
    session_id: sessionId,
    started_at: Date.now(),
    model: input.model || "claude-sonnet-4.5",
    tokens_estimated: 0,
    token_budget: 200_000,
    context_pct: 0,
    tools_used: [],
    skills_used: [],
    agents_used: [],
    active_mode: null,
  };

  const statePath = getStatePath(sessionId);
  ensureDir(statePath);
  writeFileSync(statePath, JSON.stringify(state), "utf-8");
  log.push(`Session initialized: ${sessionId}`);

  const hudLine = buildHudLine(state);
  const hudPath = getHudLinePath();
  ensureDir(hudPath);
  writeFileSync(hudPath, hudLine, "utf-8");
  log.push(`HUD line written: ${hudLine}`);

  return {
    status: "ok",
    latencyMs: Date.now() - start,
    mutations: [
      {
        type: "emit_hud",
        hudEmit: {
          sessionId,
          activeMode: null,
          contextPct: 0,
          tokensUsed: 0,
          tokensTotal: 200_000,
          agentsActive: [],
          lastAgent: "-",
          lastOutput: "",
          taskProgress: 0,
        },
      },
    ],
    log,
  };
}

function processPostToolUse(input: HookInput): HookOutput {
  const start = Date.now();
  const log: string[] = [];

  const statePath = getStatePath(input.session_id);
  let state: SessionState;

  try {
    const raw = JSON.parse(readFileSync(statePath, "utf-8"));
    state = {
      ...raw,
      tools_used: Array.isArray(raw.tools_used) ? raw.tools_used : [],
      skills_used: Array.isArray(raw.skills_used) ? raw.skills_used : [],
      agents_used: Array.isArray(raw.agents_used) ? raw.agents_used : [],
    };
  } catch {
    // Fall back to session start behavior if no state
    return processSessionStart(input);
  }

  // Update tools used
  if (input.tool_name && !state.tools_used.includes(input.tool_name)) {
    state.tools_used.push(input.tool_name);
  }

  // Recalculate HUD line
  const hudLine = buildHudLine(state);
  const hudPath = getHudLinePath();
  ensureDir(hudPath);
  writeFileSync(hudPath, hudLine, "utf-8");
  log.push(`HUD updated: ${hudLine}`);

  // Write updated state
  writeFileSync(statePath, JSON.stringify(state), "utf-8");

  return {
    status: "ok",
    latencyMs: Date.now() - start,
    mutations: [
      {
        type: "emit_hud",
        hudEmit: {
          sessionId: state.session_id,
          activeMode: state.active_mode,
          contextPct: state.context_pct,
          tokensUsed: state.tokens_estimated,
          tokensTotal: state.token_budget,
          agentsActive: state.agents_used,
          lastAgent: state.agents_used[state.agents_used.length - 1] || "-",
          lastOutput: "",
          taskProgress: 0,
        },
      },
    ],
    log,
  };
}

export function processHook(input: HookInput): HookOutput {
  if (input.hook_type === "SessionStart") {
    return processSessionStart(input);
  }
  if (input.hook_type === "PostToolUse") {
    return processPostToolUse(input);
  }
  return {
    status: "skip",
    latencyMs: 0,
    mutations: [],
    log: ["Unknown hook type"],
  };
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
