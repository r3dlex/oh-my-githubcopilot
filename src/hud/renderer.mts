/**
 * HUD Renderer
 * Formats HudState into ANSI or plain text status lines.
 */


export interface HudState {
  sessionId: string;
  activeMode: string | null;
  activeModel: string;
  contextPct: number;
  tokensUsed: number;
  tokensTotal: number;
  agentsActive: string[];
  lastAgent: string;
  lastOutput: string;
  taskProgress: number;
  startedAt: number;
  updatedAt: number;
  version: string;
  status: HudStatus;
  sessionDurationMs: number;
  cumulativeAgentsUsed: number;
  toolsUsed: Set<string>;
  skillsUsed: Set<string>;
}

export type HudStatus = "idle" | "running" | "waiting" | "complete" | "error" | "eco";

const STATUS_ICONS: Record<HudStatus, string> = {
  idle: "○",
  running: "●",
  waiting: "◷",
  complete: "✓",
  error: "✗",
  eco: "⚡",
};

function formatAge(startedAt: number): string {
  const elapsed = Date.now() - startedAt;
  const mins = Math.floor(elapsed / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return `${hours}h${remainingMins}m`;
}

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}k`;
  return `${tokens}`;
}

function ctxColor(pct: number): string {
  if (pct < 60) return "\x1b[32m"; // green
  if (pct < 85) return "\x1b[33m"; // yellow
  return "\x1b[31m"; // red
}

function reset(): string {
  return "\x1b[0m";
}

/**
 * Render HUD line with ANSI color codes.
 * Format: [OMP v1.0.0] mode | model | ctx:N% | tok:~Nk/Nk | Nm | tools:N/N | skills:N/N | agents:N/N | N% status
 */
export function renderAnsi(state: HudState): string {
  const age = formatAge(state.startedAt);
  const tokens = formatTokens(state.tokensUsed);
  const ctx = state.contextPct;
  const mode = state.activeMode || "-";
  const model = state.activeModel || "sonnet";
  const icon = STATUS_ICONS[state.status] || "●";

  const ctxClr = ctxColor(ctx);
  const ctxStr = `${ctxClr}ctx:${ctx}%${reset()}`;
  const tokenStr = `tok:~${tokens}/${state.tokensTotal}`;
  const modeStr = mode === "-" ? "-" : `\x1b[36m${mode}${reset()}`; // cyan for active modes

  return `[OMP v${state.version}] ${modeStr} | ${model} | ${ctxStr} | ${tokenStr} | ${age} | tools:${state.toolsUsed?.size || 0} | skills:${state.skillsUsed?.size || 0} | agents:${state.cumulativeAgentsUsed} | ${icon} ${state.status}`;
}

/**
 * Render HUD line as plain text (no ANSI codes).
 * Format: [OMP v1.0.0] mode | model | ctx:N% | tok:~Nk/Nk | Nm | tools:N/N | skills:N/N | agents:N/N | N% status
 */
export function renderPlain(state: HudState): string {
  const age = formatAge(state.startedAt);
  const tokens = formatTokens(state.tokensUsed);
  const ctx = state.contextPct;
  const mode = state.activeMode || "-";
  const model = state.activeModel || "sonnet";

  return `[OMP v${state.version}] ${mode} | ${model} | ctx:${ctx}% | tok:~${tokens}/${state.tokensTotal} | ${age} | tools:${state.toolsUsed?.size || 0} | skills:${state.skillsUsed?.size || 0} | agents:${state.cumulativeAgentsUsed} | ${state.status}`;
}
