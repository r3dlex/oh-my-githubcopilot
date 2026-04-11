/**
 * token-tracker hook tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { processHook, MODEL_CONTEXTS, estimateTokens } from "../../src/hooks/token-tracker.mts";

describe("token-tracker hook", () => {
  describe("processHook", () => {
    it("should skip non-PostToolUse hooks", () => {
      const result = processHook({ hook_type: "PreToolUse", tool_name: "Read" });
      expect(result.status).toBe("skip");
    });

    it("should handle PostToolUse hooks", () => {
      const result = processHook({
        hook_type: "PostToolUse",
        tool_name: "Read",
        tool_input: { file_path: "/test.txt" },
        tool_output: "file content here",
      });
      expect(result.status).toBe("ok");
    });

    it("should include set_token_budget mutation", () => {
      const result = processHook({
        hook_type: "PostToolUse",
        tool_name: "Read",
        tool_input: "input",
        tool_output: "output",
      });
      expect(result.mutations).toContainEqual(
        expect.objectContaining({ type: "set_token_budget" })
      );
    });

    it("should include latency in result", () => {
      const result = processHook({
        hook_type: "PostToolUse",
        tool_name: "Read",
      });
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it("should handle missing tool_input and tool_output", () => {
      const result = processHook({
        hook_type: "PostToolUse",
        tool_name: "Read",
      });
      expect(result.status).toBe("ok");
    });

    it("should handle null tool_output", () => {
      const result = processHook({
        hook_type: "PostToolUse",
        tool_name: "Read",
        tool_input: "test",
        tool_output: null,
      });
      expect(result.status).toBe("ok");
    });

    it("should handle object tool_input and tool_output", () => {
      const result = processHook({
        hook_type: "PostToolUse",
        tool_name: "Read",
        tool_input: { key: "value", nested: { data: true } },
        tool_output: { result: "success", count: 42 },
      });
      expect(result.status).toBe("ok");
    });
  });

  describe("MODEL_CONTEXTS", () => {
    it("should have entries for known models", () => {
      expect(MODEL_CONTEXTS["claude-sonnet-4.5"]).toBe(200_000);
      expect(MODEL_CONTEXTS["claude-opus-4.6"]).toBe(200_000);
      expect(MODEL_CONTEXTS["gpt-5"]).toBe(128_000);
      expect(MODEL_CONTEXTS["gpt-5.4-mini"]).toBe(128_000);
    });

    it("should have a default entry", () => {
      expect(MODEL_CONTEXTS.default).toBe(200_000);
    });
  });

  describe("estimateTokens", () => {
    it("should return 0 for null input", () => {
      expect(estimateTokens(null)).toBe(0);
    });

    it("should return 0 for undefined input", () => {
      expect(estimateTokens(undefined)).toBe(0);
    });

    it("should estimate tokens from string", () => {
      const str = "hello world"; // 11 chars
      expect(estimateTokens(str)).toBe(3); // ceil(11/4)
    });

    it("should estimate tokens from object", () => {
      const obj = { key: "value" };
      const result = estimateTokens(obj);
      expect(result).toBeGreaterThan(0);
    });

    it("should estimate tokens from array", () => {
      const arr = [1, 2, 3, 4, 5];
      const result = estimateTokens(arr);
      expect(result).toBeGreaterThan(0);
    });
  });
});