/**
 * keyword-detector hook tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { processHook } from "../../src/hooks/keyword-detector.mts";

describe("keyword-detector hook", () => {
  describe("processHook", () => {
    it("should skip non-UserPromptSubmitted hooks", () => {
      const result = processHook({ hook_type: "PreToolUse", prompt: "test" });
      expect(result.status).toBe("skip");
    });

    it("should allow prompts without keywords", () => {
      const result = processHook({ hook_type: "UserPromptSubmitted", prompt: "just a regular prompt" });
      expect(result.status).toBe("ok");
      expect(result.modifiedPrompt).toBeUndefined();
      expect(result.mutations).toHaveLength(0);
    });

    it("should detect autopilot: keyword", () => {
      const result = processHook({ hook_type: "UserPromptSubmitted", prompt: "autopilot: do something" });
      expect(result.status).toBe("ok");
      expect(result.modifiedPrompt).toContain("/oh-my-copilot:autopilot");
      expect(result.mutations).toContainEqual(expect.objectContaining({ type: "set_mode", mode: "autopilot" }));
    });

    it("should detect ralph: keyword", () => {
      const result = processHook({ hook_type: "UserPromptSubmitted", prompt: "ralph: fix the bug" });
      expect(result.status).toBe("ok");
      expect(result.modifiedPrompt).toContain("/oh-my-copilot:ralph");
    });

    it("should detect ulw: keyword", () => {
      const result = processHook({ hook_type: "UserPromptSubmitted", prompt: "ulw:" });
      expect(result.status).toBe("ok");
      expect(result.modifiedPrompt).toContain("/oh-my-copilot:ultrawork");
    });

    it("should detect team: keyword", () => {
      const result = processHook({ hook_type: "UserPromptSubmitted", prompt: "team: work on this" });
      expect(result.status).toBe("ok");
      expect(result.modifiedPrompt).toContain("/oh-my-copilot:team");
    });

    it("should detect eco: keyword", () => {
      const result = processHook({ hook_type: "UserPromptSubmitted", prompt: "eco: enable" });
      expect(result.status).toBe("ok");
      expect(result.modifiedPrompt).toContain("/oh-my-copilot:ecomode");
    });

    it("should detect /autopilot slash form", () => {
      const result = processHook({ hook_type: "UserPromptSubmitted", prompt: "/autopilot run" });
      expect(result.status).toBe("ok");
      expect(result.modifiedPrompt).toContain("/oh-my-copilot:autopilot");
    });

    it("should detect /ralph slash form", () => {
      const result = processHook({ hook_type: "UserPromptSubmitted", prompt: "/ralph fix issue" });
      expect(result.status).toBe("ok");
      expect(result.modifiedPrompt).toContain("/oh-my-copilot:ralph");
    });

    it("should detect /team slash form", () => {
      const result = processHook({ hook_type: "UserPromptSubmitted", prompt: "/team" });
      expect(result.status).toBe("ok");
      expect(result.modifiedPrompt).toContain("/oh-my-copilot:team");
    });

    it("should handle keyword-only prompt with no task", () => {
      const result = processHook({ hook_type: "UserPromptSubmitted", prompt: "autopilot:" });
      expect(result.status).toBe("ok");
      expect(result.modifiedPrompt).toBe("/oh-my-copilot:autopilot");
    });

    it("should preserve task part after keyword", () => {
      const result = processHook({ hook_type: "UserPromptSubmitted", prompt: "ralph: implement the feature" });
      expect(result.modifiedPrompt).toBe("/oh-my-copilot:ralph implement the feature");
    });

    it("should handle planner keyword", () => {
      const result = processHook({ hook_type: "UserPromptSubmitted", prompt: "plan: some task" });
      expect(result.status).toBe("ok");
      expect(result.modifiedPrompt).toContain("/oh-my-copilot:omp-plan");
    });

    it("should include latency in result", () => {
      const result = processHook({ hook_type: "UserPromptSubmitted", prompt: "autopilot: test" });
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it("should handle unknown slash commands gracefully", () => {
      const result = processHook({ hook_type: "UserPromptSubmitted", prompt: "/unknowncommand" });
      expect(result.status).toBe("ok");
      expect(result.modifiedPrompt).toBeUndefined();
    });

    // v1.2 graph provider + spending skill keyword mappings
    it("should detect graphify: keyword", () => {
      const result = processHook({ hook_type: "UserPromptSubmitted", prompt: "graphify: build" });
      expect(result.status).toBe("ok");
      expect(result.modifiedPrompt).toContain("/oh-my-copilot:graphify");
    });

    it("should detect graphwiki: keyword", () => {
      const result = processHook({ hook_type: "UserPromptSubmitted", prompt: "graphwiki: query what is X?" });
      expect(result.status).toBe("ok");
      expect(result.modifiedPrompt).toContain("/oh-my-copilot:graphwiki");
    });

    it("should detect graph: keyword and route to graph-provider", () => {
      const result = processHook({ hook_type: "UserPromptSubmitted", prompt: "graph: status" });
      expect(result.status).toBe("ok");
      expect(result.modifiedPrompt).toContain("/oh-my-copilot:graph-provider");
      expect(result.mutations).toContainEqual(expect.objectContaining({ type: "set_mode", mode: "graph-provider" }));
    });

    it("should detect spending: keyword", () => {
      const result = processHook({ hook_type: "UserPromptSubmitted", prompt: "spending: status" });
      expect(result.status).toBe("ok");
      expect(result.modifiedPrompt).toContain("/oh-my-copilot:spending");
    });

    it("should detect /graphify slash form", () => {
      const result = processHook({ hook_type: "UserPromptSubmitted", prompt: "/graphify build" });
      expect(result.status).toBe("ok");
      expect(result.modifiedPrompt).toContain("/oh-my-copilot:graphify");
    });

    it("should detect /graphwiki slash form", () => {
      const result = processHook({ hook_type: "UserPromptSubmitted", prompt: "/graphwiki query what is X?" });
      expect(result.status).toBe("ok");
      expect(result.modifiedPrompt).toContain("/oh-my-copilot:graphwiki");
    });

    it("should detect /graph-provider slash form (literal match)", () => {
      // /graph-provider uses a literal startsWith match (the regex stops at the hyphen)
      const result = processHook({ hook_type: "UserPromptSubmitted", prompt: "/graph-provider set graphwiki" });
      expect(result.status).toBe("ok");
      expect(result.modifiedPrompt).toContain("/oh-my-copilot:graph-provider");
    });

    it("should detect /spending slash form", () => {
      const result = processHook({ hook_type: "UserPromptSubmitted", prompt: "/spending reset" });
      expect(result.status).toBe("ok");
      expect(result.modifiedPrompt).toContain("/oh-my-copilot:spending");
    });
  });
});