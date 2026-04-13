/**
 * hud-emitter hook tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { processHook } from "../../src/hooks/hud-emitter.mts";

let homeDir = "";

function hudPath(...parts: string[]): string {
  return join(homeDir, ".omp", ...parts);
}

describe("hud-emitter hook", () => {
  beforeEach(() => {
    homeDir = mkdtempSync(join(tmpdir(), "omp-hud-emitter-"));
    vi.stubEnv("HOME", homeDir);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    rmSync(homeDir, { recursive: true, force: true });
  });

  describe("processHook", () => {
    it("should process SessionStart hook type", () => {
      const result = processHook({
        hook_type: "SessionStart",
        session_id: "test-session",
        model: "claude-sonnet-4.5",
      });
      expect(result.status).toBe("ok");
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it("should emit hud on SessionStart", () => {
      const result = processHook({
        hook_type: "SessionStart",
        session_id: "test-session",
      });
      expect(result.mutations).toContainEqual(
        expect.objectContaining({ type: "emit_hud" })
      );
    });

    it("should write statusline artifacts on SessionStart", () => {
      processHook({
        hook_type: "SessionStart",
        session_id: "my-session",
        model: "claude-opus-4.6",
      });

      expect(existsSync(hudPath("hud", "status.json"))).toBe(true);
      expect(existsSync(hudPath("hud", "display.txt"))).toBe(true);
      expect(existsSync(hudPath("hud", "tmux-segment.sh"))).toBe(true);
      expect(existsSync(hudPath("hud.line"))).toBe(true);

      const display = readFileSync(hudPath("hud", "display.txt"), "utf-8").trim();
      expect(display).toContain("claude-opus-4.6");
      expect(display).toContain("idle");
    });

    it("should process PostToolUse hook type", () => {
      const result = processHook({
        hook_type: "PostToolUse",
        tool_name: "Read",
        tool_input: {},
        tool_output: {},
      });
      expect(result.status).toBe("ok");
    });

    it("should emit hud on PostToolUse", () => {
      const result = processHook({
        hook_type: "PostToolUse",
        tool_name: "Read",
        session_id: "test-session",
      });
      expect(result.mutations).toContainEqual(
        expect.objectContaining({ type: "emit_hud" })
      );
    });

    it("should track tool usage in hud emit", () => {
      processHook({
        hook_type: "SessionStart",
        session_id: "test-session",
      });
      const result = processHook({
        hook_type: "PostToolUse",
        tool_name: "Read",
        session_id: "test-session",
      });
      const hudMutation = result.mutations.find((m) => m.type === "emit_hud");
      expect(hudMutation).toBeDefined();
      expect(readFileSync(hudPath("hud", "display.txt"), "utf-8")).toContain("tools:1/13");
    });

    it("should handle unknown hook type gracefully", () => {
      const result = processHook({
        hook_type: "UnknownHook" as never,
      });
      expect(result.status).toBe("skip");
    });

    it("should handle PostToolUse without session gracefully", () => {
      const result = processHook({
        hook_type: "PostToolUse",
        tool_name: "Read",
      });
      expect(result.status).toBe("ok");
    });

    it("should include log entries", () => {
      const result = processHook({
        hook_type: "SessionStart",
        session_id: "test",
      });
      expect(result.log.length).toBeGreaterThan(0);
    });

    it("should include default model if not provided", () => {
      const result = processHook({
        hook_type: "SessionStart",
        session_id: "test",
      });
      const hudMutation = result.mutations.find((m) => m.type === "emit_hud");
      expect(hudMutation).toBeDefined();
      expect(readFileSync(hudPath("hud", "display.txt"), "utf-8")).toContain("claude-sonnet-4.6");
    });
  });
});
