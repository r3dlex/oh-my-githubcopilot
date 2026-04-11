/**
 * Agent Loader tests
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadAllAgents, getAgent, clearCache } from "../../src/utils/agent-loader.mts";

describe("agent-loader", () => {
  beforeEach(() => {
    clearCache();
  });

  afterEach(() => {
    clearCache();
  });

  describe("loadAllAgents", () => {
    it("should return a Map", () => {
      const result = loadAllAgents();
      expect(result).toBeInstanceOf(Map);
    });

    it("should return cached results on subsequent calls", () => {
      const result1 = loadAllAgents();
      const result2 = loadAllAgents();
      expect(result1).toBe(result2);
    });

    it("should load agent definitions with required properties", () => {
      const agents = loadAllAgents();
      if (agents.size > 0) {
        const firstEntry = agents.values().next().value;
        expect(firstEntry).toHaveProperty("id");
        expect(firstEntry).toHaveProperty("name");
        expect(firstEntry).toHaveProperty("description");
        expect(firstEntry).toHaveProperty("modelTier");
        expect(firstEntry).toHaveProperty("tools");
        expect(firstEntry).toHaveProperty("content");
      } else {
        expect(true).toBe(true);
      }
    });

    it("should have modelTier as 'high', 'standard', or 'fast'", () => {
      const agents = loadAllAgents();
      if (agents.size > 0) {
        const agent = agents.values().next().value;
        expect(["high", "standard", "fast"]).toContain(agent.modelTier);
      }
    });

    it("should have tools as an array", () => {
      const agents = loadAllAgents();
      if (agents.size > 0) {
        const agent = agents.values().next().value;
        expect(Array.isArray(agent.tools)).toBe(true);
      }
    });
  });

  describe("getAgent", () => {
    it("should return null for nonexistent agent", () => {
      const result = getAgent("nonexistent-agent-id");
      expect(result).toBeNull();
    });

    it("should return agent definition when found", () => {
      const agents = loadAllAgents();
      if (agents.size > 0) {
        const firstKey = agents.keys().next().value;
        const result = getAgent(firstKey);
        expect(result).not.toBeNull();
        expect(result?.id).toBe(firstKey);
      }
    });
  });

  describe("clearCache", () => {
    it("should clear the cache", () => {
      const result1 = loadAllAgents();
      clearCache();
      const result2 = loadAllAgents();
      // After clear, loading again creates new Map instance
      expect(result1).not.toBe(result2);
    });

    it("should allow fresh load after cache clear", () => {
      clearCache();
      const result = loadAllAgents();
      expect(result).toBeInstanceOf(Map);
    });
  });
});