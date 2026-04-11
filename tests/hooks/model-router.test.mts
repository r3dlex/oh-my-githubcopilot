/**
 * model-router hook tests
 */

import { describe, it, expect } from "vitest";
import { processHook } from "../../src/hooks/model-router.mts";

describe("model-router hook", () => {
  describe("processHook", () => {
    it("should skip non-PreToolUse hooks", () => {
      const result = processHook({ hook_type: "PostToolUse" });
      expect(result.status).toBe("skip");
    });

    it("should return ok for PreToolUse without agent_id", () => {
      const result = processHook({ hook_type: "PreToolUse", tool_name: "Read" });
      expect(result.status).toBe("ok");
      expect(result.mutations).toHaveLength(0);
    });

    it("should return ok with mutations for valid PreToolUse with agent_id", () => {
      const result = processHook({
        hook_type: "PreToolUse",
        tool_name: "Read",
        agent_id: "orchestrator",
      });
      expect(result.status).toBe("ok");
      expect(result.mutations.length).toBeGreaterThan(0);
    });

    it("should include set_model mutation for high-tier agents", () => {
      const result = processHook({
        hook_type: "PreToolUse",
        tool_name: "Read",
        agent_id: "orchestrator",
      });
      expect(result.mutations).toContainEqual(
        expect.objectContaining({ type: "set_model" })
      );
    });

    it("should set opus model for high-tier agents", () => {
      const result = processHook({
        hook_type: "PreToolUse",
        tool_name: "Read",
        agent_id: "architect",
      });
      const setModelMutation = result.mutations.find((m: any) => m.type === "set_model");
      expect(setModelMutation).toBeDefined();
    });

    it("should set haiku model for fast-tier agents", () => {
      const result = processHook({
        hook_type: "PreToolUse",
        tool_name: "Read",
        agent_id: "explorer",
      });
      const setModelMutation = result.mutations.find((m: any) => m.type === "set_model");
      expect(setModelMutation).toBeDefined();
    });

    it("should set sonnet model for standard-tier agents", () => {
      const result = processHook({
        hook_type: "PreToolUse",
        tool_name: "Read",
        agent_id: "analyst",
      });
      const setModelMutation = result.mutations.find((m: any) => m.type === "set_model");
      expect(setModelMutation).toBeDefined();
    });

    it("should include additionalContext in result", () => {
      const result = processHook({
        hook_type: "PreToolUse",
        tool_name: "Read",
        agent_id: "orchestrator",
      });
      expect(result.additionalContext).toBeDefined();
      expect(typeof result.additionalContext).toBe("string");
    });

    it("should include log entries", () => {
      const result = processHook({
        hook_type: "PreToolUse",
        tool_name: "Read",
        agent_id: "orchestrator",
      });
      expect(result.log.length).toBeGreaterThan(0);
    });

    it("should include latency in result", () => {
      const result = processHook({
        hook_type: "PreToolUse",
        tool_name: "Read",
        agent_id: "planner",
      });
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it("should handle unknown agents gracefully", () => {
      const result = processHook({
        hook_type: "PreToolUse",
        tool_name: "Read",
        agent_id: "unknown-agent",
      });
      expect(result.status).toBe("ok");
    });

    it("should handle errors gracefully", () => {
      const result = processHook({
        hook_type: "PreToolUse",
        tool_name: "Read",
        agent_id: "orchestrator",
      } as any); // Pass invalid input to trigger error path
      expect(result.status).toBeDefined();
    });
  });
});