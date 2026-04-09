/**
 * HUD Renderer
 * Formats HudState into ANSI or plain text status lines.
 */

export interface HudState {
  sessionId: string;
  activeMode: string | null;
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
  model: string;
  status: HudStatus;
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
 */
export function renderAnsi(state: HudState): string {
  const age = formatAge(state.startedAt);
  const tokens = formatTokens(state.tokensUsed);
  const ctx = state.contextPct;
  const mode = state.activeMode || "-";
  const model = state.model || "sonnet";
  const icon = STATUS_ICONS[state.status] || "●";

  const ctxClr = ctxColor(ctx);
  const ctxStr = `${ctxClr}ctx: ${ctx}%${reset()}`;
  const tokenStr = `tkn: ${tokens}/${state.tokensTotal}`;
  const modeStr = mode === "-" ? "-" : `\x1b[36m${mode}${reset()}`; // cyan for active modes

  return `OMP v${state.version} | ${model} | ${tokenStr} | ${ctxStr} | session: ${age} | ${modeStr} | ${icon} ${state.status}`;
}

/**
 * Render HUD line as plain text (no ANSI codes).
 */
export function renderPlain(state: HudState): string {
  const age = formatAge(state.startedAt);
  const tokens = formatTokens(state.tokensUsed);
  const ctx = state.contextPct;
  const mode = state.activeMode || "-";
  const model = state.model || "sonnet";

  return `OMP v${state.version} | ${model} | tkn: ~${tokens}/${state.tokensTotal} | ctx: ${ctx}% | session: ${age} | mode: ${mode} | ${state.status}`;
}
