/**
 * Drift guard: the self-contained COMMANDS list and HUD canvas helpers in
 * extension/extension.mjs must stay in exact sync with their src/ sources:
 * getCommandDefinitions() (src/extension/registry.mts), the HUD canvas
 * metadata/formatting (src/extension/hud-canvas.mts), the event-push
 * helpers (src/extension/hud-push.mts), and the HUD artifact paths +
 * default line (src/hud/statusline.mts).
 *
 * Importing extension.mjs must NOT trigger joinSession — main() only runs
 * when the file is executed directly.
 */

import { describe, it, expect, vi, afterEach } from "vitest";

import { getCommandDefinitions } from "../../src/extension/registry.mts";
import { buildActivationInstruction } from "../../src/extension/commands.mts";
import {
  HUD_CANVAS_ID,
  HUD_CANVAS_DISPLAY_NAME,
  HUD_CANVAS_DESCRIPTION,
  buildHudCanvasResponse,
} from "../../src/extension/hud-canvas.mts";
import {
  HUD_DEBOUNCE_MS,
  HUD_WATCH_FILES,
  debounce,
  isHudArtifact,
} from "../../src/extension/hud-push.mts";
import {
  DEFAULT_STATUSLINE,
  getStatuslinePaths,
} from "../../src/hud/statusline.mts";
// @ts-expect-error — plain .mjs module without type declarations
import {
  COMMANDS,
  buildActivationInstruction as mjsInstruction,
  HUD_CANVAS as mjsHudCanvas,
  DEFAULT_STATUSLINE as mjsDefaultStatusline,
  HUD_DEBOUNCE_MS as mjsHudDebounceMs,
  HUD_WATCH_FILES as mjsHudWatchFiles,
  getHudPaths as mjsGetHudPaths,
  buildHudCanvasResponse as mjsBuildHudCanvasResponse,
  debounce as mjsDebounce,
  isHudArtifact as mjsIsHudArtifact,
} from "../../extension/extension.mjs";

interface InlineCommand {
  name: string;
  skillId: string;
  description: string;
}

const inline = COMMANDS as InlineCommand[];
const definitions = getCommandDefinitions();

describe("extension.mjs ↔ registry parity", () => {
  it("has the same command names in the same order", () => {
    expect(inline.map((c) => c.name)).toEqual(definitions.map((d) => d.name));
  });

  it("has identical descriptions per command", () => {
    expect(
      inline.map((c) => ({ name: c.name, description: c.description })),
    ).toEqual(
      definitions.map((d) => ({ name: d.name, description: d.description })),
    );
  });

  it("targets the same skill id per command as the registry handlers", () => {
    for (const [i, def] of definitions.entries()) {
      expect(def.handler("probe-args")).toBe(
        buildActivationInstruction(inline[i].skillId, "probe-args"),
      );
    }
  });

  it("produces identical activation instructions in both implementations", () => {
    expect(mjsInstruction("ralph", "  go  ")).toBe(
      buildActivationInstruction("ralph", "  go  "),
    );
    expect(mjsInstruction("ralph", "")).toBe(
      buildActivationInstruction("ralph", ""),
    );
  });
});

describe("extension.mjs ↔ HUD canvas parity", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("declares the same canvas metadata", () => {
    expect(mjsHudCanvas).toEqual({
      id: HUD_CANVAS_ID,
      displayName: HUD_CANVAS_DISPLAY_NAME,
      description: HUD_CANVAS_DESCRIPTION,
    });
  });

  it("shares the default statusline with src/hud/statusline.mts", () => {
    expect(mjsDefaultStatusline).toBe(DEFAULT_STATUSLINE);
  });

  it("shares the debounce window and watched artifact filenames", () => {
    expect(mjsHudDebounceMs).toBe(HUD_DEBOUNCE_MS);
    expect(mjsHudWatchFiles).toEqual(HUD_WATCH_FILES);
  });

  it("derives the same HUD artifact paths as getStatuslinePaths()", () => {
    const home = "/home/parity-test";
    const srcPaths = getStatuslinePaths(home);
    expect(mjsGetHudPaths(home)).toEqual({
      hudDir: srcPaths.hudDir,
      displayPath: srcPaths.displayPath,
      legacyLinePath: srcPaths.legacyLinePath,
    });
  });

  it("produces identical canvas open responses in both implementations", () => {
    for (const line of [
      "",
      "   \n",
      "[OMP v1.0.0] autopilot | sonnet | ctx:67% | running",
      "  padded line  ",
    ]) {
      expect(mjsBuildHudCanvasResponse(line)).toEqual(
        buildHudCanvasResponse(line),
      );
    }
  });

  it("filters watch events identically in both implementations", () => {
    for (const filename of [
      null,
      undefined,
      "status.json",
      "display.txt",
      "status.json.tmp",
      "unrelated.log",
    ]) {
      expect(mjsIsHudArtifact(filename)).toBe(isHudArtifact(filename));
    }
  });

  it("debounces with identical trailing-edge semantics", () => {
    vi.useFakeTimers();
    const srcFn = vi.fn();
    const mjsFn = vi.fn();
    const src = debounce(srcFn, 100);
    const mjs = mjsDebounce(mjsFn, 100) as {
      trigger: () => void;
      cancel: () => void;
    };

    src.trigger();
    mjs.trigger();
    vi.advanceTimersByTime(50);
    src.trigger();
    mjs.trigger();
    vi.advanceTimersByTime(99);
    expect(srcFn).not.toHaveBeenCalled();
    expect(mjsFn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(srcFn).toHaveBeenCalledTimes(1);
    expect(mjsFn).toHaveBeenCalledTimes(1);

    src.trigger();
    mjs.trigger();
    src.cancel();
    mjs.cancel();
    vi.advanceTimersByTime(200);
    expect(srcFn).toHaveBeenCalledTimes(1);
    expect(mjsFn).toHaveBeenCalledTimes(1);
  });
});
