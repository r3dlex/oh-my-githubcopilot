/**
 * HUD canvas metadata + pure formatting tests (SPEC-omp-2.0 §5 renderer #1).
 */

import { describe, it, expect } from "vitest";

import {
  HUD_CANVAS_ID,
  HUD_CANVAS_DISPLAY_NAME,
  HUD_CANVAS_DESCRIPTION,
  buildHudCanvasResponse,
} from "../../src/extension/hud-canvas.mts";
import { DEFAULT_STATUSLINE } from "../../src/hud/statusline.mts";

describe("HUD canvas metadata", () => {
  it("uses a canvas id outside the reserved canvas.* lifecycle namespace", () => {
    expect(HUD_CANVAS_ID).toBe("omp-hud");
    expect(HUD_CANVAS_ID.startsWith("canvas.")).toBe(false);
  });

  it("provides a display name and a single-sentence description", () => {
    expect(HUD_CANVAS_DISPLAY_NAME).toBe("OMP HUD");
    expect(HUD_CANVAS_DESCRIPTION.length).toBeGreaterThan(0);
  });
});

describe("buildHudCanvasResponse", () => {
  it("maps a rendered HUD line to title + status", () => {
    const line = "[OMP v1.0.0] autopilot | sonnet | ctx:67% | running";
    expect(buildHudCanvasResponse(line)).toEqual({
      title: HUD_CANVAS_DISPLAY_NAME,
      status: line,
    });
  });

  it("trims surrounding whitespace from the line", () => {
    expect(buildHudCanvasResponse("  [OMP] line  \n").status).toBe(
      "[OMP] line",
    );
  });

  it("falls back to the default statusline for empty input", () => {
    expect(buildHudCanvasResponse("").status).toBe(DEFAULT_STATUSLINE);
    expect(buildHudCanvasResponse("   \n").status).toBe(DEFAULT_STATUSLINE);
  });
});
