/**
 * HUD statusline tests
 */

import { describe, expect, it } from "vitest";
import { existsSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import {
  buildHudState,
  getStatuslinePaths,
  readStatusline,
  writeHudArtifacts,
} from "../../src/hud/statusline.mts";

describe("hud statusline", () => {
  it("should build HudState from session snapshots", () => {
    const state = buildHudState({
      version: "1.5.3",
      session_id: "session-1",
      started_at: 1000,
      updated_at: 4000,
      model: "gpt-5.4",
      tokens_estimated: 1024,
      token_budget: 128_000,
      context_pct: 1,
      tools_used: ["Read", "Write"],
      skills_used: ["team"],
      agents_used: ["executor"],
      active_mode: "team",
      status: "running",
    }, 4000);

    expect(state.sessionId).toBe("session-1");
    expect(state.toolsUsed.size).toBe(2);
    expect(state.skillsUsed.size).toBe(1);
    expect(state.cumulativeAgentsUsed).toBe(1);
    expect(state.sessionDurationMs).toBe(3000);
  });

  it("should write all statusline artifacts", () => {
    const homeDir = mkdtempSync(join(tmpdir(), "omp-statusline-"));
    try {
      const paths = getStatuslinePaths(homeDir);
      const { line } = writeHudArtifacts({
        version: "1.5.3",
        session_id: "session-2",
        started_at: Date.now() - 60_000,
        updated_at: Date.now(),
        model: "gpt-5.4",
        tokens_estimated: 2048,
        token_budget: 128_000,
        context_pct: 2,
        tools_used: ["Read"],
        agents_used: ["executor"],
        status: "running",
      }, paths);

      expect(existsSync(paths.statusJsonPath)).toBe(true);
      expect(existsSync(paths.displayPath)).toBe(true);
      expect(existsSync(paths.tmuxSegmentPath)).toBe(true);
      expect(existsSync(paths.legacyLinePath)).toBe(true);
      expect(readFileSync(paths.displayPath, "utf-8").trim()).toBe(line);
    } finally {
      rmSync(homeDir, { recursive: true, force: true });
    }
  });

  it("should fall back from display.txt to status.json to legacy line", () => {
    const homeDir = mkdtempSync(join(tmpdir(), "omp-statusline-read-"));
    try {
      const paths = getStatuslinePaths(homeDir);
      writeHudArtifacts({
        version: "1.5.3",
        session_id: "session-3",
        started_at: Date.now() - 30_000,
        updated_at: Date.now(),
        model: "gpt-5.4-mini",
        tokens_estimated: 500,
        token_budget: 128_000,
        context_pct: 0,
        tools_used: ["Read"],
        status: "idle",
      }, paths);

      const fromDisplay = readStatusline(paths);
      expect(fromDisplay).toContain("gpt-5.4-mini");

      unlinkSync(paths.displayPath);
      const fromJson = readStatusline(paths);
      expect(fromJson).toContain("gpt-5.4-mini");

      unlinkSync(paths.statusJsonPath);
      writeFileSync(paths.legacyLinePath, "legacy line\n", "utf-8");
      expect(readStatusline(paths)).toBe("legacy line");
    } finally {
      rmSync(homeDir, { recursive: true, force: true });
    }
  });
});
