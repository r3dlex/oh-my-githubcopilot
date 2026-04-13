/**
 * HUD watch daemon — polls session state and rewrites HUD artifacts on each tick.
 *
 * Usage:
 *   omp hud --watch           Poll every 2s (default)
 *   OMP_HUD_INTERVAL=5000 omp hud --watch   Override interval (ms)
 *
 * Each cycle:
 *   readState() → buildHudState() → renderAnsi() → writeHudArtifacts()
 *
 * Elapsed time is always recomputed from startedAt so the display never goes stale
 * between hook firings.
 */

import { readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import {
  buildHudState,
  writeHudArtifacts,
  getStatuslinePaths,
  type HudSnapshot,
} from "./statusline.mts";
import { renderAnsi } from "./renderer.mts";

const DEFAULT_INTERVAL_MS = 2_000;
const STATE_PATH = join(homedir(), ".omp", "state", "session.json");

function readSnapshot(): HudSnapshot | null {
  try {
    const raw = readFileSync(STATE_PATH, "utf-8");
    const parsed = JSON.parse(raw) as HudSnapshot;
    return parsed;
  } catch {
    return null;
  }
}

function tick(paths = getStatuslinePaths()): void {
  const snapshot = readSnapshot();
  if (!snapshot) return;

  // Pass current time so buildHudState recomputes sessionDurationMs from live clock.
  const now = Date.now();
  const state = buildHudState(snapshot, now);

  // Write all artifacts (display.txt, tmux-segment.sh, status.json, hud.line).
  writeHudArtifacts(snapshot, paths);

  // Render ANSI to stdout so a terminal running `omp hud --watch` shows live output.
  process.stdout.write("\x1b[2J\x1b[H" + renderAnsi(state) + "\x1b[K\n\x1b[J");
}

/**
 * Start the HUD watch daemon.
 *
 * Runs until SIGINT or SIGTERM. The interval is configurable via the
 * OMP_HUD_INTERVAL env var (milliseconds).
 */
export function runHudWatch(): void {
  const intervalMs = Math.max(
    500,
    parseInt(process.env["OMP_HUD_INTERVAL"] ?? "", 10) || DEFAULT_INTERVAL_MS,
  );

  const paths = getStatuslinePaths();

  // Hide cursor while watch loop is active.
  process.stdout.write("\x1b[?25l");

  // Initial render immediately.
  try {
    tick(paths);
  } catch {
    // Swallow first-tick errors — state may not exist yet.
  }

  const timer = setInterval(() => {
    try {
      tick(paths);
    } catch {
      // Swallow per-tick errors to keep the daemon alive.
    }
  }, intervalMs);

  const stop = () => {
    clearInterval(timer);
    // Restore cursor and clear screen before exit.
    process.stdout.write("\x1b[?25h\x1b[2J\x1b[H");
    process.exit(0);
  };

  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}
