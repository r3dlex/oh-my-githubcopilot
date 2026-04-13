/**
 * hud-emitter hook
 * Trigger: post-cycle (PostToolUse + SessionStart)
 * Priority: 60
 *
 * Writes HUD artifacts after every tool call and initializes session state.
 */

import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { createRequire } from "module";
import { homedir } from "os";
import { join } from "path";
import { writeHudArtifacts } from "../hud/statusline.mts";

const _require = createRequire(import.meta.url);
const { version: PKG_VERSION } = _require("../../package.json") as { version: string };

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
  updated_at: number;
  model: string;
  tokens_estimated: number;
  token_budget: number;
  context_pct: number;
  tools_used: string[];
  skills_used: string[];
  agents_used: string[];
  active_mode: string | null;
  last_output: string;
  task_progress: number;
  status: "idle" | "running" | "waiting" | "complete" | "error" | "eco";
  premium_requests: number;
  premium_requests_total: number;
  warning_active: boolean;
}

function getStatePath(sessionId?: string): string {
  const base = join(process.env["HOME"] || homedir(), ".omp", "state");
  if (sessionId) {
    return join(base, "sessions", sessionId, "session.json");
  }
  return join(base, "session.json");
}

function ensureDir(path: string): void {
  mkdirSync(path.substring(0, path.lastIndexOf("/")), { recursive: true });
}

function stringifyOutput(value: unknown): string {
  if (typeof value === "string") {
    return value.trim().slice(0, 200);
  }
  if (value === undefined || value === null) {
    return "";
  }
  try {
    return JSON.stringify(value).slice(0, 200);
  } catch {
    return String(value).slice(0, 200);
  }
}

function buildEmit(state: SessionState): HudEmit {
  return {
    sessionId: state.session_id,
    activeMode: state.active_mode,
    contextPct: state.context_pct,
    tokensUsed: state.tokens_estimated,
    tokensTotal: state.token_budget,
    agentsActive: state.agents_used,
    lastAgent: state.agents_used[state.agents_used.length - 1] || "-",
    lastOutput: state.last_output,
    taskProgress: state.task_progress,
  };
}

const MODEL_CONTEXTS: Record<string, number> = {
  "claude-sonnet-4.5": 200_000,
  "claude-sonnet-4": 200_000,
  "claude-sonnet-4.6": 200_000,
  "claude-opus-4.6": 200_000,
  "gpt-5": 128_000,
  "gpt-5.4-mini": 128_000,
  "gemini-3-pro": 128_000,
  default: 200_000,
};

function resolveTokenBudget(model: string): number {
  return MODEL_CONTEXTS[model] ?? MODEL_CONTEXTS["default"] ?? 200_000;
}

function resolvePremiumRequestsTotal(): number {
  const env = process.env["OMP_PREMIUM_REQUESTS_TOTAL"];
  if (env) {
    const parsed = parseInt(env, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return 1500;
}

function processSessionStart(input: HookInput): HookOutput {
  const start = Date.now();
  const log: string[] = [];
  const sessionId = input.session_id || "default";
  const now = Date.now();
  const model = input.model || "claude-sonnet-4.6";

  const state: SessionState = {
    version: PKG_VERSION,
    session_id: sessionId,
    started_at: now,
    updated_at: now,
    model,
    tokens_estimated: 0,
    token_budget: resolveTokenBudget(model),
    context_pct: 0,
    tools_used: [],
    skills_used: [],
    agents_used: [],
    active_mode: null,
    last_output: "",
    task_progress: 0,
    status: "idle",
    premium_requests: 0,
    premium_requests_total: resolvePremiumRequestsTotal(),
    warning_active: false,
  };

  const statePath = getStatePath(sessionId);
  ensureDir(statePath);
  writeFileSync(statePath, JSON.stringify(state), "utf-8");
  log.push(`Session initialized: ${sessionId}`);

  const { line, state: hudState } = writeHudArtifacts(state);
  log.push(`HUD artifacts written: ${line}`);

  return {
    status: "ok",
    latencyMs: Date.now() - start,
    mutations: [{ type: "emit_hud", hudEmit: buildEmit(state) }],
    log: [...log, `HUD state version: ${hudState.version}`],
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
      version: typeof raw.version === "string" ? raw.version : PKG_VERSION,
      session_id: typeof raw.session_id === "string" ? raw.session_id : input.session_id || "default",
      started_at: typeof raw.started_at === "number" ? raw.started_at : Date.now(),
      updated_at: Date.now(),
      model: typeof raw.model === "string" ? raw.model : input.model || "claude-sonnet-4.6",
      tokens_estimated: typeof raw.tokens_estimated === "number" ? raw.tokens_estimated : 0,
      token_budget: typeof raw.token_budget === "number" ? raw.token_budget : resolveTokenBudget(typeof raw.model === "string" ? raw.model : input.model || "claude-sonnet-4.6"),
      context_pct: typeof raw.context_pct === "number" ? raw.context_pct : 0,
      tools_used: Array.isArray(raw.tools_used) ? raw.tools_used : [],
      skills_used: Array.isArray(raw.skills_used) ? raw.skills_used : [],
      agents_used: Array.isArray(raw.agents_used) ? raw.agents_used : [],
      active_mode: typeof raw.active_mode === "string" ? raw.active_mode : null,
      last_output: typeof raw.last_output === "string" ? raw.last_output : "",
      task_progress: typeof raw.task_progress === "number" ? raw.task_progress : 0,
      status: raw.status ?? "running",
      premium_requests: typeof raw.premium_requests === "number" ? raw.premium_requests : 0,
      premium_requests_total: typeof raw.premium_requests_total === "number" ? raw.premium_requests_total : resolvePremiumRequestsTotal(),
      warning_active: typeof raw.warning_active === "boolean" ? raw.warning_active : false,
    };
  } catch {
    return processSessionStart(input);
  }

  if (input.tool_name && !state.tools_used.includes(input.tool_name)) {
    state.tools_used.push(input.tool_name);
  }
  state.status = "running";
  state.last_output = stringifyOutput(input.tool_output);

  writeFileSync(statePath, JSON.stringify(state), "utf-8");
  const { line } = writeHudArtifacts(state);
  log.push(`HUD updated: ${line}`);

  return {
    status: "ok",
    latencyMs: Date.now() - start,
    mutations: [{ type: "emit_hud", hudEmit: buildEmit(state) }],
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
