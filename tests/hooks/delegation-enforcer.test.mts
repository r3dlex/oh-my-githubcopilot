/**
 * delegation-enforcer hook tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { processHook } from "../../src/hooks/delegation-enforcer.mts";

describe("delegation-enforcer hook", () => {
  describe("processHook", () => {
    it("should skip non-PreToolUse hooks", () => {
      const result = processHook({ hook_type: "PostToolUse", tool_name: "Write" });
      expect(result.status).toBe("skip");
    });

    it("should allow non-blocked tools", () => {
      const result = processHook({ hook_type: "PreToolUse", tool_name: "Read", agent_id: "orchestrator" });
      expect(result.status).toBe("ok");
      expect(result.decision).toBeUndefined();
    });

    it("should allow non-blocked agents with Write", () => {
      const result = processHook({ hook_type: "PreToolUse", tool_name: "Write", agent_id: "executor" });
      expect(result.status).toBe("ok");
      expect(result.decision).toBeUndefined();
    });

    it("should block orchestrator using Write tool", () => {
      const result = processHook({
        hook_type: "PreToolUse",
        tool_name: "Write",
        agent_id: "orchestrator",
        tool_input: { file_path: "/test.txt", content: "test" },
      });
      expect(result.status).toBe("ok");
      expect(result.decision).toBe("deny");
      expect(result.mutations).toContainEqual(
        expect.objectContaining({
          type: "reroute_tool",
          toAgent: "executor",
        })
      );
    });

    it("should block orchestrator using Edit tool", () => {
      const result = processHook({
        hook_type: "PreToolUse",
        tool_name: "Edit",
        agent_id: "orchestrator",
        tool_input: { file_path: "/test.txt" },
      });
      expect(result.status).toBe("ok");
      expect(result.decision).toBe("deny");
    });

    it("should allow orchestrator with Read tool", () => {
      const result = processHook({
        hook_type: "PreToolUse",
        tool_name: "Read",
        agent_id: "orchestrator",
      });
      expect(result.status).toBe("ok");
      expect(result.decision).toBeUndefined();
    });

    it("should allow non-orchestrator agent with Write", () => {
      const result = processHook({
        hook_type: "PreToolUse",
        tool_name: "Write",
        agent_id: "planner",
      });
      expect(result.status).toBe("ok");
      expect(result.decision).toBeUndefined();
    });

    it("should handle missing agent_id gracefully", () => {
      const result = processHook({ hook_type: "PreToolUse", tool_name: "Write" });
      expect(result.status).toBe("ok");
      expect(result.decision).toBeUndefined();
    });

    it("should handle missing tool_name gracefully", () => {
      const result = processHook({ hook_type: "PreToolUse", agent_id: "orchestrator" });
      expect(result.status).toBe("ok");
    });

    it("should include latency in result", () => {
      const result = processHook({
        hook_type: "PreToolUse",
        tool_name: "Write",
        agent_id: "orchestrator",
      });
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it("should include log entries on enforcement", () => {
      const result = processHook({
        hook_type: "PreToolUse",
        tool_name: "Edit",
        agent_id: "orchestrator",
      });
      expect(result.log.length).toBeGreaterThan(0);
    });
  });
});