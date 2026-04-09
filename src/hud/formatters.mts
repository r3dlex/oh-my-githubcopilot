/**
 * HUD Formatters
 * Utility functions for formatting HUD display values.
 */

export interface FormatOptions {
  compact?: boolean;
  color?: boolean;
}

/**
 * Format a byte count as human-readable string.
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1_048_576).toFixed(1)}MB`;
}

/**
 * Format a duration in milliseconds.
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const mins = Math.floor(ms / 60_000);
  const secs = Math.round(ms % 60_000 / 1000);
  return `${mins}m ${secs}s`;
}

/**
 * Format a percentage with optional color code.
 */
export function formatPct(value: number, opts: FormatOptions = {}): string {
  const pct = Math.min(100, Math.max(0, Math.round(value)));
  if (opts.compact) return `${pct}%`;
  if (opts.color) {
    if (pct < 60) return `\x1b[32m${pct}%\x1b[0m`;
    if (pct < 85) return `\x1b[33m${pct}%\x1b[0m`;
    return `\x1b[31m${pct}%\x1b[0m`;
  }
  return `${pct}%`;
}

/**
 * Format a count with singular/plural.
 */
export function formatCount(value: number, singular: string, plural?: string): string {
  const p = plural ?? `${singular}s`;
  return value === 1 ? `1 ${singular}` : `${value} ${p}`;
}

/**
 * Truncate a string to a maximum length.
 */
export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return `${str.slice(0, maxLen - 1)}…`;
}

/**
 * Pad a string to a fixed width.
 */
export function pad(str: string, width: number, char = " "): string {
  if (str.length >= width) return str;
  return str.padEnd(width, char);
}

/**
 * Format an elapsed time string (e.g., "3m", "1h 23m").
 */
export function formatAge(startedAt: number): string {
  const elapsed = Date.now() - startedAt;
  const mins = Math.floor(elapsed / 60_000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
}