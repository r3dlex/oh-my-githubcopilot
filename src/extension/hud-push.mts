/**
 * HUD event push — fs.watch-based change detection for HUD artifacts
 * (SPEC-omp-2.0 §5: event push replaces file-mtime polling for renderer #1).
 *
 * Watches ~/.omp/hud for writes from the hud-emitter hook and triggers a
 * debounced refresh callback (the canvas renderer re-opens its instances so
 * the host re-renders). Fail-open: any watch setup failure returns null so
 * callers fall back to the polling renderers — tmux statusline (#2) and
 * `omp hud --watch` (#3).
 *
 * Mirrored in self-contained form in extension/extension.mjs; parity is
 * enforced by tests/extension/extension-parity.test.mts.
 */

import { mkdirSync, watch, type FSWatcher } from "fs";

/** Debounce window (ms) for coalescing rapid HUD artifact writes. */
export const HUD_DEBOUNCE_MS = 250;

/** HUD artifact filenames whose changes should trigger a refresh. */
export const HUD_WATCH_FILES = ["status.json", "display.txt"];

export interface Debounced {
  trigger: () => void;
  cancel: () => void;
}

/** Trailing-edge debounce: fn runs once, delayMs after the last trigger. */
export function debounce(fn: () => void, delayMs: number): Debounced {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return {
    trigger() {
      if (timer !== null) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        fn();
      }, delayMs);
    },
    cancel() {
      if (timer !== null) clearTimeout(timer);
      timer = null;
    },
  };
}

/**
 * True when a watch event for `filename` should refresh the HUD.
 * A null/undefined filename means the platform could not report which
 * directory entry changed — refresh conservatively.
 */
export function isHudArtifact(
  filename: string | null | undefined,
  files: readonly string[] = HUD_WATCH_FILES,
): boolean {
  if (filename === null || filename === undefined) return true;
  return files.includes(String(filename));
}

export interface WatchHudDirOptions {
  debounceMs?: number;
  files?: readonly string[];
}

/**
 * Watches `hudDir` for HUD artifact changes and invokes `onChange`
 * (debounced). The directory is watched instead of individual files because
 * artifacts are written atomically (temp + rename), which breaks per-file
 * watchers on some platforms.
 *
 * Returns a close function, or null when the watch could not be
 * established (fail-open).
 */
export function watchHudDir(
  hudDir: string,
  onChange: () => void,
  options: WatchHudDirOptions = {},
): (() => void) | null {
  const { debounceMs = HUD_DEBOUNCE_MS, files = HUD_WATCH_FILES } = options;
  const debounced = debounce(onChange, debounceMs);
  let watcher: FSWatcher;
  try {
    mkdirSync(hudDir, { recursive: true });
    watcher = watch(hudDir, (_event, filename) => {
      if (isHudArtifact(filename, files)) debounced.trigger();
    });
  } catch {
    debounced.cancel();
    return null;
  }
  const close = (): void => {
    debounced.cancel();
    try {
      watcher.close();
    } catch {
      // Already closed — nothing to clean up.
    }
  };
  watcher.on("error", close);
  return close;
}
