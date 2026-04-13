// src/hooks/hud-emitter.mts
import { mkdirSync as mkdirSync2, readFileSync as readFileSync2, writeFileSync as writeFileSync2 } from "fs";
import { createRequire } from "module";
import { homedir as homedir2 } from "os";
import { join as join2 } from "path";

// src/hud/statusline.mts
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "fs";
import { homedir } from "os";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

// src/hud/renderer.mts
function formatAge(startedAt) {
  const elapsed = Date.now() - startedAt;
  const mins = Math.floor(elapsed / 6e4);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return `${hours}h${remainingMins}m`;
}
function formatTokens(tokens) {
  if (tokens >= 1e6) return `${(tokens / 1e6).toFixed(1)}M`;
  if (tokens >= 1e3) return `${(tokens / 1e3).toFixed(1)}k`;
  return `${tokens}`;
}
function renderPlain(state) {
  const age = formatAge(state.startedAt);
  const tokens = formatTokens(state.tokensUsed);
  const ctx = state.contextPct;
  const mode = state.activeMode || "-";
  const model = state.activeModel || "sonnet";
  const reqWarningPlain = state.warningActive ? " !!" : "";
  const reqStrPlain = `req:${state.premiumRequests ?? 0}/${state.premiumRequestsTotal ?? 1500}${reqWarningPlain}`;
  return `[OMP v${state.version}] ${mode} | ${model} | ctx:${ctx}% | tok:~${tokens}/${state.tokensTotal} | ${reqStrPlain} | ${age} | tools:${state.toolsUsed?.size || 0}/${state.toolsTotal ?? 13} | skills:${state.skillsUsed?.size || 0}/${state.skillsTotal ?? 21} | agents:${state.cumulativeAgentsUsed}/${state.agentsTotal ?? 23} | ${state.status}`;
}

// src/hud/statusline.mts
var DEFAULT_VERSION = "0.0.0";
var DEFAULT_STATUSLINE = "OMP | hud: no active session";
var DEFAULT_TOKEN_BUDGET = 2e5;
var DEFAULT_PREMIUM_REQUESTS_TOTAL = 1500;
function getStatuslinePaths(home = process.env["HOME"] || homedir()) {
  const ompDir = join(home, ".omp");
  const hudDir = join(ompDir, "hud");
  return {
    legacyLinePath: join(ompDir, "hud.line"),
    hudDir,
    statusJsonPath: join(hudDir, "status.json"),
    displayPath: join(hudDir, "display.txt"),
    tmuxSegmentPath: join(hudDir, "tmux-segment.sh")
  };
}
function ensureParent(filePath) {
  mkdirSync(dirname(filePath), { recursive: true });
}
function writeAtomic(filePath, content, mode) {
  ensureParent(filePath);
  const tempPath = `${filePath}.tmp`;
  writeFileSync(tempPath, content, mode === void 0 ? "utf-8" : { encoding: "utf-8", mode });
  renameSync(tempPath, filePath);
}
function normalizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => typeof item === "string");
}
function serializeHudState(state) {
  return {
    ...state,
    toolsUsed: Array.from(state.toolsUsed),
    skillsUsed: Array.from(state.skillsUsed)
  };
}
function deserializeHudState(raw) {
  if (!raw || typeof raw !== "object") return null;
  const value = raw;
  const toolsUsed = new Set(normalizeStringArray(value.toolsUsed));
  const skillsUsed = new Set(normalizeStringArray(value.skillsUsed));
  const agentsActive = normalizeStringArray(value.agentsActive);
  const status = typeof value.status === "string" ? value.status : "idle";
  return {
    sessionId: typeof value.sessionId === "string" ? value.sessionId : "default",
    activeMode: typeof value.activeMode === "string" ? value.activeMode : null,
    activeModel: typeof value.activeModel === "string" ? value.activeModel : "sonnet",
    contextPct: typeof value.contextPct === "number" ? value.contextPct : 0,
    tokensUsed: typeof value.tokensUsed === "number" ? value.tokensUsed : 0,
    tokensTotal: typeof value.tokensTotal === "number" ? value.tokensTotal : DEFAULT_TOKEN_BUDGET,
    agentsActive,
    lastAgent: typeof value.lastAgent === "string" ? value.lastAgent : agentsActive.at(-1) ?? "-",
    lastOutput: typeof value.lastOutput === "string" ? value.lastOutput : "",
    taskProgress: typeof value.taskProgress === "number" ? value.taskProgress : 0,
    startedAt: typeof value.startedAt === "number" ? value.startedAt : Date.now(),
    updatedAt: typeof value.updatedAt === "number" ? value.updatedAt : Date.now(),
    version: typeof value.version === "string" ? value.version : DEFAULT_VERSION,
    status,
    sessionDurationMs: typeof value.sessionDurationMs === "number" ? value.sessionDurationMs : 0,
    cumulativeAgentsUsed: typeof value.cumulativeAgentsUsed === "number" ? value.cumulativeAgentsUsed : agentsActive.length,
    toolsUsed,
    skillsUsed,
    toolsTotal: typeof value.toolsTotal === "number" ? value.toolsTotal : 13,
    skillsTotal: typeof value.skillsTotal === "number" ? value.skillsTotal : 21,
    agentsTotal: typeof value.agentsTotal === "number" ? value.agentsTotal : 23,
    premiumRequests: typeof value.premiumRequests === "number" ? value.premiumRequests : 0,
    premiumRequestsTotal: typeof value.premiumRequestsTotal === "number" ? value.premiumRequestsTotal : DEFAULT_PREMIUM_REQUESTS_TOTAL,
    warningActive: typeof value.warningActive === "boolean" ? value.warningActive : false
  };
}
function buildHudState(snapshot, now = Date.now()) {
  const startedAt = snapshot.started_at ?? now;
  const updatedAt = snapshot.updated_at ?? now;
  const toolsUsed = new Set(normalizeStringArray(snapshot.tools_used));
  const skillsUsed = new Set(normalizeStringArray(snapshot.skills_used));
  const agentsActive = normalizeStringArray(snapshot.agents_used);
  return {
    sessionId: snapshot.session_id ?? "default",
    activeMode: snapshot.active_mode ?? null,
    activeModel: snapshot.model ?? "sonnet",
    contextPct: snapshot.context_pct ?? 0,
    tokensUsed: snapshot.tokens_estimated ?? 0,
    tokensTotal: snapshot.token_budget ?? DEFAULT_TOKEN_BUDGET,
    agentsActive,
    lastAgent: agentsActive.at(-1) ?? "-",
    lastOutput: snapshot.last_output ?? "",
    taskProgress: snapshot.task_progress ?? 0,
    startedAt,
    updatedAt,
    version: snapshot.version ?? DEFAULT_VERSION,
    status: snapshot.status ?? "idle",
    sessionDurationMs: Math.max(0, updatedAt - startedAt),
    cumulativeAgentsUsed: agentsActive.length,
    toolsUsed,
    skillsUsed,
    toolsTotal: 13,
    skillsTotal: 21,
    agentsTotal: 23,
    premiumRequests: snapshot.premium_requests ?? 0,
    premiumRequestsTotal: snapshot.premium_requests_total ?? DEFAULT_PREMIUM_REQUESTS_TOTAL,
    warningActive: snapshot.warning_active ?? false
  };
}
function writeHudArtifacts(snapshot, paths = getStatuslinePaths()) {
  const state = buildHudState(snapshot);
  const line = renderPlain(state);
  const serializedState = `${JSON.stringify(serializeHudState(state), null, 2)}
`;
  writeAtomic(paths.statusJsonPath, serializedState);
  writeAtomic(paths.displayPath, `${line}
`);
  writeAtomic(paths.tmuxSegmentPath, `${line}
`, 493);
  writeAtomic(paths.legacyLinePath, `${line}
`);
  return { line, state, paths };
}
function readStatusline(paths = getStatuslinePaths()) {
  try {
    const line = readFileSync(paths.displayPath, "utf-8").trim();
    if (line) return line;
  } catch {
  }
  try {
    const parsed = JSON.parse(readFileSync(paths.statusJsonPath, "utf-8"));
    const state = deserializeHudState(parsed);
    if (state) return renderPlain(state);
  } catch {
  }
  try {
    const line = readFileSync(paths.legacyLinePath, "utf-8").trim();
    if (line) return line;
  } catch {
  }
  return DEFAULT_STATUSLINE;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(readStatusline());
}

// src/hooks/hud-emitter.mts
import { fileURLToPath as fileURLToPath2 } from "url";
var _require = createRequire(import.meta.url);
var { version: PKG_VERSION } = _require("../../package.json");
function getStatePath(sessionId) {
  const base = join2(process.env["HOME"] || homedir2(), ".omp", "state");
  if (sessionId) {
    return join2(base, "sessions", sessionId, "session.json");
  }
  return join2(base, "session.json");
}
function ensureDir(path) {
  mkdirSync2(path.substring(0, path.lastIndexOf("/")), { recursive: true });
}
function stringifyOutput(value) {
  if (typeof value === "string") {
    return value.trim().slice(0, 200);
  }
  if (value === void 0 || value === null) {
    return "";
  }
  try {
    return JSON.stringify(value).slice(0, 200);
  } catch {
    return String(value).slice(0, 200);
  }
}
function buildEmit(state) {
  return {
    sessionId: state.session_id,
    activeMode: state.active_mode,
    contextPct: state.context_pct,
    tokensUsed: state.tokens_estimated,
    tokensTotal: state.token_budget,
    agentsActive: state.agents_used,
    lastAgent: state.agents_used[state.agents_used.length - 1] || "-",
    lastOutput: state.last_output,
    taskProgress: state.task_progress
  };
}
function processSessionStart(input) {
  const start = Date.now();
  const log = [];
  const sessionId = input.session_id || "default";
  const now = Date.now();
  const state = {
    version: PKG_VERSION,
    session_id: sessionId,
    started_at: now,
    updated_at: now,
    model: input.model || "claude-sonnet-4.5",
    tokens_estimated: 0,
    token_budget: 2e5,
    context_pct: 0,
    tools_used: [],
    skills_used: [],
    agents_used: [],
    active_mode: null,
    last_output: "",
    task_progress: 0,
    status: "idle",
    premium_requests: 0,
    premium_requests_total: 1500,
    warning_active: false
  };
  const statePath = getStatePath(sessionId);
  ensureDir(statePath);
  writeFileSync2(statePath, JSON.stringify(state), "utf-8");
  log.push(`Session initialized: ${sessionId}`);
  const { line, state: hudState } = writeHudArtifacts(state);
  log.push(`HUD artifacts written: ${line}`);
  return {
    status: "ok",
    latencyMs: Date.now() - start,
    mutations: [{ type: "emit_hud", hudEmit: buildEmit(state) }],
    log: [...log, `HUD state version: ${hudState.version}`]
  };
}
function processPostToolUse(input) {
  const start = Date.now();
  const log = [];
  const statePath = getStatePath(input.session_id);
  let state;
  try {
    const raw = JSON.parse(readFileSync2(statePath, "utf-8"));
    state = {
      ...raw,
      version: typeof raw.version === "string" ? raw.version : PKG_VERSION,
      session_id: typeof raw.session_id === "string" ? raw.session_id : input.session_id || "default",
      started_at: typeof raw.started_at === "number" ? raw.started_at : Date.now(),
      updated_at: Date.now(),
      model: typeof raw.model === "string" ? raw.model : input.model || "claude-sonnet-4.5",
      tokens_estimated: typeof raw.tokens_estimated === "number" ? raw.tokens_estimated : 0,
      token_budget: typeof raw.token_budget === "number" ? raw.token_budget : 2e5,
      context_pct: typeof raw.context_pct === "number" ? raw.context_pct : 0,
      tools_used: Array.isArray(raw.tools_used) ? raw.tools_used : [],
      skills_used: Array.isArray(raw.skills_used) ? raw.skills_used : [],
      agents_used: Array.isArray(raw.agents_used) ? raw.agents_used : [],
      active_mode: typeof raw.active_mode === "string" ? raw.active_mode : null,
      last_output: typeof raw.last_output === "string" ? raw.last_output : "",
      task_progress: typeof raw.task_progress === "number" ? raw.task_progress : 0,
      status: raw.status ?? "running",
      premium_requests: typeof raw.premium_requests === "number" ? raw.premium_requests : 0,
      premium_requests_total: typeof raw.premium_requests_total === "number" ? raw.premium_requests_total : 1500,
      warning_active: typeof raw.warning_active === "boolean" ? raw.warning_active : false
    };
  } catch {
    return processSessionStart(input);
  }
  if (input.tool_name && !state.tools_used.includes(input.tool_name)) {
    state.tools_used.push(input.tool_name);
  }
  state.status = "running";
  state.last_output = stringifyOutput(input.tool_output);
  writeFileSync2(statePath, JSON.stringify(state), "utf-8");
  const { line } = writeHudArtifacts(state);
  log.push(`HUD updated: ${line}`);
  return {
    status: "ok",
    latencyMs: Date.now() - start,
    mutations: [{ type: "emit_hud", hudEmit: buildEmit(state) }],
    log
  };
}
function processHook(input) {
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
    log: ["Unknown hook type"]
  };
}
if (process.argv[1] === fileURLToPath2(import.meta.url)) {
  const input = JSON.parse(await readStdin());
  const output = processHook(input);
  console.log(JSON.stringify(output));
}
async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return chunks.join("");
}
export {
  processHook
};
//# sourceMappingURL=hud-emitter.mjs.map
