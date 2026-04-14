/**
 * keyword-detector hook tests
 */

import { describe, it, expect } from "vitest";
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
      expect(result.modifiedPrompt).toContain("/omp:autopilot");
      expect(result.mutations).toContainEqual(expect.objectContaining({ type: "set_mode", mode: "autopilot" }));
    });

    it("should detect ralph: keyword", () => {
      const result = processHook({ hook_type: "UserPromptSubmitted", prompt: "ralph: fix the bug" });
      expect(result.status).toBe("ok");
      expect(result.modifiedPrompt).toContain("/omp:ralph");
    });

    it("should detect ulw: keyword", () => {
      const result = processHook({ hook_type: "UserPromptSubmitted", prompt: "ulw:" });
      expect(result.status).toBe("ok");
      expect(result.modifiedPrompt).toContain("/omp:ultrawork");
    });

    it("should detect team: keyword", () => {
      const result = processHook({ hook_type: "UserPromptSubmitted", prompt: "team: work on this" });
      expect(result.status).toBe("ok");
      expect(result.modifiedPrompt).toContain("/omp:team");
    });

    it("should detect eco: keyword", () => {
      const result = processHook({ hook_type: "UserPromptSubmitted", prompt: "eco: enable" });
      expect(result.status).toBe("ok");
      expect(result.modifiedPrompt).toContain("/omp:ecomode");
    });

    it("should detect /autopilot slash form", () => {
      const result = processHook({ hook_type: "UserPromptSubmitted", prompt: "/autopilot run" });
      expect(result.status).toBe("ok");
      expect(result.modifiedPrompt).toContain("/omp:autopilot");
    });

    it("should detect /ralph slash form", () => {
      const result = processHook({ hook_type: "UserPromptSubmitted", prompt: "/ralph fix issue" });
      expect(result.status).toBe("ok");
      expect(result.modifiedPrompt).toContain("/omp:ralph");
    });

    it("should detect /team slash form", () => {
      const result = processHook({ hook_type: "UserPromptSubmitted", prompt: "/team" });
      expect(result.status).toBe("ok");
      expect(result.modifiedPrompt).toContain("/omp:team");
    });

    it("should handle keyword-only prompt with no task", () => {
      const result = processHook({ hook_type: "UserPromptSubmitted", prompt: "autopilot:" });
      expect(result.status).toBe("ok");
      expect(result.modifiedPrompt).toBe("/omp:autopilot");
    });

    it("should preserve task part after keyword", () => {
      const result = processHook({ hook_type: "UserPromptSubmitted", prompt: "ralph: implement the feature" });
      expect(result.modifiedPrompt).toBe("/omp:ralph implement the feature");
    });

    it("should detect long namespace alias oh-my-githubcopilot:ralph", () => {
      const result = processHook({
        hook_type: "UserPromptSubmitted",
        prompt: "oh-my-githubcopilot:ralph fix this",
      });
      expect(result.status).toBe("ok");
      expect(result.modifiedPrompt).toBe("/omp:ralph fix this");
    });

    it("should detect long namespace alias /oh-my-githubcopilot:ralph", () => {
      const result = processHook({
        hook_type: "UserPromptSubmitted",
        prompt: "/oh-my-githubcopilot:ralph",
      });
      expect(result.status).toBe("ok");
      expect(result.modifiedPrompt).toBe("/omp:ralph");
    });

    it("should handle planner keyword", () => {
      const result = processHook({ hook_type: "UserPromptSubmitted", prompt: "plan: some task" });
      expect(result.status).toBe("ok");
      expect(result.modifiedPrompt).toContain("/omp:plan");
    });

    it("should route setup keyword to the short setup command surface", () => {
      const result = processHook({ hook_type: "UserPromptSubmitted", prompt: "setup: bootstrap this repo" });
      expect(result.status).toBe("ok");
      expect(result.modifiedPrompt).toContain("/setup");
    });

    it("should detect /setup slash form and preserve the short setup command surface", () => {
      const result = processHook({ hook_type: "UserPromptSubmitted", prompt: "/setup --non-interactive" });
      expect(result.status).toBe("ok");
      expect(result.modifiedPrompt).toContain("/setup");
    });

    it("should detect /omp:setup slash namespace form", () => {
      const result = processHook({ hook_type: "UserPromptSubmitted", prompt: "/omp:setup --non-interactive" });
      expect(result.status).toBe("ok");
      expect(result.modifiedPrompt).toContain("/setup");
    });

    it("should detect /omp:plan slash namespace form", () => {
      const result = processHook({ hook_type: "UserPromptSubmitted", prompt: "/omp:plan map this change" });
      expect(result.status).toBe("ok");
      expect(result.modifiedPrompt).toContain("/omp:plan");
    });

    it("should no longer route removed ralplan alias", () => {
      const result = processHook({ hook_type: "UserPromptSubmitted", prompt: "ralplan: some task" });
      expect(result.status).toBe("ok");
      expect(result.modifiedPrompt).toBeUndefined();
    });

    it("should no longer route removed ultraqa alias", () => {
      const result = processHook({ hook_type: "UserPromptSubmitted", prompt: "ultraqa: verify this" });
      expect(result.status).toBe("ok");
      expect(result.modifiedPrompt).toBeUndefined();
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
      expect(result.modifiedPrompt).toContain("/omp:graphify");
    });

    it("should detect graphwiki: keyword", () => {
      const result = processHook({ hook_type: "UserPromptSubmitted", prompt: "graphwiki: query what is X?" });
      expect(result.status).toBe("ok");
      expect(result.modifiedPrompt).toContain("/omp:graphwiki");
    });

    it("should detect graph: keyword and route to graph-provider", () => {
      const result = processHook({ hook_type: "UserPromptSubmitted", prompt: "graph: status" });
      expect(result.status).toBe("ok");
      expect(result.modifiedPrompt).toContain("/omp:graph-provider");
      expect(result.mutations).toContainEqual(expect.objectContaining({ type: "set_mode", mode: "graph-provider" }));
    });

    it("should detect spending: keyword", () => {
      const result = processHook({ hook_type: "UserPromptSubmitted", prompt: "spending: status" });
      expect(result.status).toBe("ok");
      expect(result.modifiedPrompt).toContain("/omp:spending");
    });

    it("should detect /graphify slash form", () => {
      const result = processHook({ hook_type: "UserPromptSubmitted", prompt: "/graphify build" });
      expect(result.status).toBe("ok");
      expect(result.modifiedPrompt).toContain("/omp:graphify");
    });

    it("should detect /graphwiki slash form", () => {
      const result = processHook({ hook_type: "UserPromptSubmitted", prompt: "/graphwiki query what is X?" });
      expect(result.status).toBe("ok");
      expect(result.modifiedPrompt).toContain("/omp:graphwiki");
    });

    it("should detect /graph-provider slash form (literal match)", () => {
      const result = processHook({ hook_type: "UserPromptSubmitted", prompt: "/graph-provider set graphwiki" });
      expect(result.status).toBe("ok");
      expect(result.modifiedPrompt).toContain("/omp:graph-provider");
    });

    it("should detect /mcp slash surface without truncating the command", () => {
      const result = processHook({ hook_type: "UserPromptSubmitted", prompt: "/mcp-setup --interactive" });
      expect(result.status).toBe("ok");
      expect(result.modifiedPrompt).toBe("/mcp --interactive");
    });

    it("should detect /spending slash form", () => {
      const result = processHook({ hook_type: "UserPromptSubmitted", prompt: "/spending reset" });
      expect(result.status).toBe("ok");
      expect(result.modifiedPrompt).toContain("/omp:spending");
    });
  });
});
