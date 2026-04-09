/**
 * Timer
 * High-resolution timing utilities.
 */

export interface Timer {
  start: number;
  end?: number;
}

export interface TimedResult<T> {
  value: T;
  elapsedMs: number;
}

/**
 * Start a timer.
 */
export function startTimer(): Timer {
  return { start: performance.now() };
}

/**
 * Stop a timer and return elapsed time in milliseconds.
 */
export function stopTimer(timer: Timer): number {
  timer.end = performance.now();
  return elapsed(timer);
}

/**
 * Get elapsed time from a timer (running or stopped).
 */
export function elapsed(timer: Timer): number {
  const end = timer.end ?? performance.now();
  return end - timer.start;
}

/**
 * Run a function and return its result with timing.
 */
export async function timed<T>(fn: () => Promise<T>): Promise<TimedResult<T>> {
  const timer = startTimer();
  const value = await fn();
  const elapsedMs = stopTimer(timer);
  return { value, elapsedMs };
}

/**
 * Run a synchronous function and return its result with timing.
 */
export function timedSync<T>(fn: () => T): TimedResult<T> {
  const timer = startTimer();
  const value = fn();
  const elapsedMs = stopTimer(timer);
  return { value, elapsedMs };
}

/**
 * Format milliseconds as human-readable duration.
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const mins = Math.floor(ms / 60_000);
  const secs = Math.round(ms % 60_000 / 1000);
  return `${mins}m ${secs}s`;
}