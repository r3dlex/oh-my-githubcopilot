/**
 * HUD event push tests — debounce, artifact filtering, and the fs.watch
 * wrapper (SPEC-omp-2.0 §5: event push for renderer #1).
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

import {
  HUD_DEBOUNCE_MS,
  HUD_WATCH_FILES,
  debounce,
  isHudArtifact,
  watchHudDir,
} from "../../src/extension/hud-push.mts";

describe("debounce", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("fires once on the trailing edge after the delay", () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const d = debounce(fn, 100);

    d.trigger();
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(99);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("coalesces rapid triggers into a single call", () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const d = debounce(fn, 100);

    d.trigger();
    vi.advanceTimersByTime(50);
    d.trigger();
    vi.advanceTimersByTime(50);
    d.trigger();
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("fires again for triggers after a completed window", () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const d = debounce(fn, 100);

    d.trigger();
    vi.advanceTimersByTime(100);
    d.trigger();
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("cancel discards a pending call", () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const d = debounce(fn, 100);

    d.trigger();
    d.cancel();
    vi.advanceTimersByTime(200);
    expect(fn).not.toHaveBeenCalled();
  });
});

describe("isHudArtifact", () => {
  it("refreshes conservatively when the platform reports no filename", () => {
    expect(isHudArtifact(null)).toBe(true);
    expect(isHudArtifact(undefined)).toBe(true);
  });

  it("matches the HUD artifact filenames", () => {
    for (const file of HUD_WATCH_FILES) {
      expect(isHudArtifact(file)).toBe(true);
    }
  });

  it("ignores unrelated files", () => {
    expect(isHudArtifact("other.txt")).toBe(false);
    expect(isHudArtifact("status.json.tmp")).toBe(false);
  });

  it("honors a custom file list", () => {
    expect(isHudArtifact("custom.json", ["custom.json"])).toBe(true);
    expect(isHudArtifact("status.json", ["custom.json"])).toBe(false);
  });
});

describe("watchHudDir", () => {
  const cleanups: Array<() => void> = [];

  afterEach(() => {
    while (cleanups.length > 0) cleanups.pop()?.();
  });

  function makeTempDir(): string {
    const dir = mkdtempSync(join(tmpdir(), "omp-hud-push-"));
    cleanups.push(() => rmSync(dir, { recursive: true, force: true }));
    return dir;
  }

  it("exports a debounce window suited for rapid artifact writes", () => {
    expect(HUD_DEBOUNCE_MS).toBeGreaterThan(0);
    expect(HUD_DEBOUNCE_MS).toBeLessThanOrEqual(1_000);
  });

  it("creates the hud dir and returns a close function", () => {
    const dir = join(makeTempDir(), "hud");
    const close = watchHudDir(dir, () => {});
    expect(typeof close).toBe("function");
    close?.();
    // Closing twice is safe.
    close?.();
  });

  it("invokes onChange (debounced) when a HUD artifact is written", async () => {
    const dir = makeTempDir();
    const onChange = vi.fn();
    const close = watchHudDir(dir, onChange, { debounceMs: 10 });
    expect(close).not.toBeNull();
    cleanups.push(() => close?.());

    writeFileSync(join(dir, "display.txt"), "[OMP] line\n");

    await vi.waitFor(() => expect(onChange).toHaveBeenCalled(), {
      timeout: 5_000,
    });
  });

  it("fails open (returns null) when the directory cannot be created", () => {
    const dir = makeTempDir();
    const blocker = join(dir, "blocker");
    writeFileSync(blocker, "not a directory");

    const close = watchHudDir(join(blocker, "hud"), () => {});
    expect(close).toBeNull();
  });
});
