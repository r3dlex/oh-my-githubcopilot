/**
 * HUD Metrics tests
 */

import { describe, it, expect } from "vitest";
import { estimateTokens, calcContextPct, updateMetrics } from "../../src/hud/metrics.mts";
import type { HudMetrics } from "../../src/hud/metrics.mts";

describe("HUD metrics", () => {
  describe("estimateTokens", () => {
    it("should return 0 for null input", () => {
      expect(estimateTokens(null)).toBe(0);
    });

    it("should return 0 for undefined input", () => {
      expect(estimateTokens(undefined)).toBe(0);
    });

    it("should estimate tokens from string", () => {
      const str = "hello world"; // 11 chars
      expect(estimateTokens(str)).toBe(3); // ceil(11/4) = 3
    });

    it("should estimate tokens from short string", () => {
      const str = "hi"; // 2 chars
      expect(estimateTokens(str)).toBe(1);
    });

    it("should estimate tokens from object", () => {
      const obj = { name: "test", value: 42 };
      const result = estimateTokens(obj);
      expect(result).toBeGreaterThan(0);
    });

    it("should estimate tokens from array", () => {
      const arr = [1, 2, 3, 4, 5];
      const result = estimateTokens(arr);
      expect(result).toBeGreaterThan(0);
    });

    it("should estimate tokens from number", () => {
      const result = estimateTokens(12345);
      expect(result).toBeGreaterThan(0);
    });

    it("should handle empty string", () => {
      expect(estimateTokens("")).toBe(0);
    });
  });

  describe("calcContextPct", () => {
    it("should calculate correct percentage for sonnet", () => {
      const result = calcContextPct(100_000, "claude-sonnet-4.5");
      expect(result).toBe(50);
    });

    it("should cap at 100%", () => {
      const result = calcContextPct(300_000, "claude-sonnet-4.5");
      expect(result).toBe(100);
    });

    it("should use default for unknown model", () => {
      const result = calcContextPct(100_000, "unknown-model");
      expect(result).toBe(50);
    });

    it("should return 0 for 0 tokens", () => {
      const result = calcContextPct(0, "claude-sonnet-4.5");
      expect(result).toBe(0);
    });

    it("should round to nearest integer", () => {
      const result = calcContextPct(33_333, "claude-sonnet-4.5");
      expect(result).toBe(17); // 33333/200000*100 = 16.67 -> 17
    });

    it("should handle gpt-5 model", () => {
      const result = calcContextPct(64_000, "gpt-5");
      expect(result).toBe(50);
    });
  });

  describe("updateMetrics", () => {
    it("should add tool to toolsUsed set", () => {
      const metrics: HudMetrics = {
        version: "1.0.0",
        activeModel: "claude-sonnet-4.5",
        sessionDurationMs: 0,
        cumulativeAgentsUsed: 0,
        tokensEstimated: 0,
        tokenBudget: 200_000,
        contextPct: 0,
        toolsUsed: new Set(),
        skillsUsed: new Set(),
        agentsUsed: new Set(),
      };

      const result = updateMetrics(metrics, "Read", "input", "output", "claude-sonnet-4.5");
      expect(result.toolsUsed.has("Read")).toBe(true);
    });

    it("should track multiple tools", () => {
      const metrics: HudMetrics = {
        version: "1.0.0",
        activeModel: "claude-sonnet-4.5",
        sessionDurationMs: 0,
        cumulativeAgentsUsed: 0,
        tokensEstimated: 0,
        tokenBudget: 200_000,
        contextPct: 0,
        toolsUsed: new Set(),
        skillsUsed: new Set(),
        agentsUsed: new Set(),
      };

      const result1 = updateMetrics(metrics, "Read", "", "", "claude-sonnet-4.5");
      const result2 = updateMetrics(result1, "Write", "", "", "claude-sonnet-4.5");

      expect(result2.toolsUsed.has("Read")).toBe(true);
      expect(result2.toolsUsed.has("Write")).toBe(true);
    });

    it("should handle empty tool input and output", () => {
      const metrics: HudMetrics = {
        version: "1.0.0",
        activeModel: "claude-sonnet-4.5",
        sessionDurationMs: 0,
        cumulativeAgentsUsed: 0,
        tokensEstimated: 0,
        tokenBudget: 200_000,
        contextPct: 0,
        toolsUsed: new Set(),
        skillsUsed: new Set(),
        agentsUsed: new Set(),
      };

      const result = updateMetrics(metrics, "Read", "", "", "claude-sonnet-4.5");
      expect(result.tokensEstimated).toBeGreaterThanOrEqual(0);
    });
  });
});