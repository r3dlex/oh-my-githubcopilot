/**
 * Tests for readStatusline() live-age behavior:
 * - status.json is the primary source (formatAge runs at call time)
 * - display.txt is the fallback (pre-rendered cached string)
 */

import { describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import {
  getStatuslinePaths,
  readStatusline,
} from "../../src/hud/statusline.mts";

const DEFAULT_STATUSLINE = "OMP | hud: no active session";

/** Build a minimal serialized HudState that deserializeHudState accepts. */
function makeStatusJson(overrides: {
  sessionId?: string;
  activeModel?: string;
  startedAt?: number;
  updatedAt?: number;
  status?: string;
} = {}): string {
  const now = Date.now();
  const state = {
    sessionId: overrides.sessionId ?? "test-session",
    activeMode: null,
    activeModel: overrides.activeModel ?? "gpt-4o-live",
    contextPct: 0,
    tokensUsed: 100,
    tokensTotal: 200_000,
    agentsActive: [],
    lastAgent: "-",
    lastOutput: "",
    taskProgress: 0,
    startedAt: overrides.startedAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
    version: "1.0.0",
    status: overrides.status ?? "idle",
    sessionDurationMs: 0,
    cumulativeAgentsUsed: 0,
    toolsUsed: [],
    skillsUsed: [],
    toolsTotal: 13,
    skillsTotal: 25,
    agentsTotal: 23,
    premiumRequests: 0,
    premiumRequestsTotal: 1500,
    warningActive: false,
  };
  return JSON.stringify(state, null, 2) + "\n";
}

describe("readStatusline live-age behavior", () => {
  it("status.json takes priority over display.txt", () => {
    const homeDir = mkdtempSync(join(tmpdir(), "omp-live-age-priority-"));
    try {
      const paths = getStatuslinePaths(homeDir);
      mkdirSync(paths.hudDir, { recursive: true });

      // Write status.json with a distinct model name
      writeFileSync(paths.statusJsonPath, makeStatusJson({ activeModel: "gpt-live-primary" }), "utf-8");

      // Write display.txt with stale content that should NOT be returned
      writeFileSync(paths.displayPath, "STALE display.txt content - should not appear\n", "utf-8");

      const result = readStatusline(paths);
      expect(result).toContain("gpt-live-primary");
      expect(result).not.toContain("STALE");
    } finally {
      rmSync(homeDir, { recursive: true, force: true });
    }
  });

  it("advancing age: different startedAt values produce different age strings", () => {
    const homeDir = mkdtempSync(join(tmpdir(), "omp-live-age-advance-"));
    try {
      const paths = getStatuslinePaths(homeDir);
      mkdirSync(paths.hudDir, { recursive: true });

      // Write status.json with startedAt 61 seconds ago → expect "1m"
      writeFileSync(
        paths.statusJsonPath,
        makeStatusJson({ startedAt: Date.now() - 61_000, activeModel: "gpt-age-test" }),
        "utf-8",
      );
      const result1 = readStatusline(paths);
      expect(result1).toContain("1m");

      // Write status.json with startedAt 121 seconds ago → expect "2m"
      writeFileSync(
        paths.statusJsonPath,
        makeStatusJson({ startedAt: Date.now() - 121_000, activeModel: "gpt-age-test" }),
        "utf-8",
      );
      const result2 = readStatusline(paths);
      expect(result2).toContain("2m");
    } finally {
      rmSync(homeDir, { recursive: true, force: true });
    }
  });

  it("falls back to display.txt when status.json is missing", () => {
    const homeDir = mkdtempSync(join(tmpdir(), "omp-live-age-fallback-"));
    try {
      const paths = getStatuslinePaths(homeDir);
      mkdirSync(paths.hudDir, { recursive: true });

      // Do NOT write status.json; write only display.txt
      const knownContent = "cached display line from display.txt";
      writeFileSync(paths.displayPath, `${knownContent}\n`, "utf-8");

      const result = readStatusline(paths);
      expect(result).toBe(knownContent);
    } finally {
      rmSync(homeDir, { recursive: true, force: true });
    }
  });

  it("returns DEFAULT_STATUSLINE when no artifacts exist", () => {
    const homeDir = mkdtempSync(join(tmpdir(), "omp-live-age-default-"));
    try {
      const paths = getStatuslinePaths(homeDir);
      // Do NOT create any files — all reads will throw

      const result = readStatusline(paths);
      expect(result).toBe(DEFAULT_STATUSLINE);
    } finally {
      rmSync(homeDir, { recursive: true, force: true });
    }
  });
});
