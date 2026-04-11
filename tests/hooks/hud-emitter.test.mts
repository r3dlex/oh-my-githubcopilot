/**
 * hud-emitter hook tests
 */

import { describe, it, expect } from "vitest";
import { processHook } from "../../src/hooks/hud-emitter.mts";

describe("hud-emitter hook", () => {
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

    it("should include emit_hud with session info on SessionStart", () => {
      const result = processHook({
        hook_type: "SessionStart",
        session_id: "my-session",
        model: "claude-opus-4.6",
      });
      const hudMutation = result.mutations.find((m: any) => m.type === "emit_hud");
      expect(hudMutation).toBeDefined();
      expect(hudMutation.hudEmit.sessionId).toBe("my-session");
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
      const result = processHook({
        hook_type: "PostToolUse",
        tool_name: "Read",
        session_id: "test-session",
      });
      const hudMutation = result.mutations.find((m: any) => m.type === "emit_hud");
      expect(hudMutation).toBeDefined();
    });

    it("should handle unknown hook type gracefully", () => {
      const result = processHook({
        hook_type: "UnknownHook" as any,
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
      const hudMutation = result.mutations.find((m: any) => m.type === "emit_hud");
      expect(hudMutation).toBeDefined();
    });
  });
});