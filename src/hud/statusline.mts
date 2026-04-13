/**
 * HUD statusline helpers and standalone entrypoint.
 *
 * Keeps HUD artifact generation in one place so hooks and shell wrappers
 * can share the same rendering and fallback behavior.
 */

import { mkdirSync, readFileSync, renameSync, writeFileSync } from "fs";
import { homedir } from "os";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { renderPlain, type HudState, type HudStatus } from "./renderer.mts";

const DEFAULT_VERSION = "0.0.0";
const DEFAULT_STATUSLINE = "OMP | hud: no active session";
const DEFAULT_TOKEN_BUDGET = 200_000;
const DEFAULT_PREMIUM_REQUESTS_TOTAL = 1500;

export interface StatuslinePaths {
  legacyLinePath: string;
  hudDir: string;
  statusJsonPath: string;
  displayPath: string;
  tmuxSegmentPath: string;
}

export interface HudSnapshot {
  version?: string;
  session_id?: string;
  started_at?: number;
  updated_at?: number;
  model?: string;
  tokens_estimated?: number;
  token_budget?: number;
  context_pct?: number;
  tools_used?: string[];
  skills_used?: string[];
  agents_used?: string[];
  active_mode?: string | null;
  last_output?: string;
  task_progress?: number;
  status?: HudStatus;
  premium_requests?: number;
  premium_requests_total?: number;
  warning_active?: boolean;
}

interface SerializedHudState extends Omit<HudState, "toolsUsed" | "skillsUsed"> {
  toolsUsed: string[];
  skillsUsed: string[];
}

export function getStatuslinePaths(home = process.env["HOME"] || homedir()): StatuslinePaths {
  const ompDir = join(home, ".omp");
  const hudDir = join(ompDir, "hud");
  return {
    legacyLinePath: join(ompDir, "hud.line"),
    hudDir,
    statusJsonPath: join(hudDir, "status.json"),
    displayPath: join(hudDir, "display.txt"),
    tmuxSegmentPath: join(hudDir, "tmux-segment.sh"),
  };
}

function ensureParent(filePath: string): void {
  mkdirSync(dirname(filePath), { recursive: true });
}

function writeAtomic(filePath: string, content: string, mode?: number): void {
  ensureParent(filePath);
  const tempPath = `${filePath}.tmp`;
  writeFileSync(tempPath, content, mode === undefined ? "utf-8" : { encoding: "utf-8", mode });
  renameSync(tempPath, filePath);
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function serializeHudState(state: HudState): SerializedHudState {
  return {
    ...state,
    toolsUsed: Array.from(state.toolsUsed),
    skillsUsed: Array.from(state.skillsUsed),
  };
}

function deserializeHudState(raw: unknown): HudState | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  const toolsUsed = new Set(normalizeStringArray(value.toolsUsed));
  const skillsUsed = new Set(normalizeStringArray(value.skillsUsed));
  const agentsActive = normalizeStringArray(value.agentsActive);
  const status = typeof value.status === "string" ? (value.status as HudStatus) : "idle";

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
    warningActive: typeof value.warningActive === "boolean" ? value.warningActive : false,
  };
}

export function buildHudState(snapshot: HudSnapshot, now = Date.now()): HudState {
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
    warningActive: snapshot.warning_active ?? false,
  };
}

export function writeHudArtifacts(snapshot: HudSnapshot, paths = getStatuslinePaths()): { line: string; state: HudState; paths: StatuslinePaths } {
  const state = buildHudState(snapshot);
  const line = renderPlain(state);
  const serializedState = `${JSON.stringify(serializeHudState(state), null, 2)}\n`;

  writeAtomic(paths.statusJsonPath, serializedState);
  writeAtomic(paths.displayPath, `${line}\n`);
  writeAtomic(paths.tmuxSegmentPath, `${line}\n`, 0o755);
  writeAtomic(paths.legacyLinePath, `${line}\n`);

  return { line, state, paths };
}

export function readStatusline(paths = getStatuslinePaths()): string {
  try {
    const line = readFileSync(paths.displayPath, "utf-8").trim();
    if (line) return line;
  } catch {
    // Fall through to other sources.
  }

  try {
    const parsed = JSON.parse(readFileSync(paths.statusJsonPath, "utf-8"));
    const state = deserializeHudState(parsed);
    if (state) return renderPlain(state);
  } catch {
    // Fall through to legacy file.
  }

  try {
    const line = readFileSync(paths.legacyLinePath, "utf-8").trim();
    if (line) return line;
  } catch {
    // No HUD artifacts yet.
  }

  return DEFAULT_STATUSLINE;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(readStatusline());
}
