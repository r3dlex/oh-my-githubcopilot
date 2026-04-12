/**
 * GraphWiki skill unit tests.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/graph/graphwiki-adapter.mjs", () => ({
  GraphwikiAdapter: vi.fn().mockImplementation(() => mockAdapter),
}));

const mockAdapter = {
  query: vi.fn(),
  path: vi.fn(),
  lint: vi.fn(),
  refine: vi.fn(),
  build: vi.fn(),
  status: vi.fn(),
  clean: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("graphwiki skill", () => {
  describe("query", () => {
    it("returns error when no question provided", async () => {
      const { activate } = await import("../../src/skills/graphwiki.mjs");
      const result = await activate({ trigger: "graphwiki:", args: ["query"] });
      expect(result.status).toBe("error");
      expect(result.message).toContain("Usage");
    });

    it("delegates to adapter.query", async () => {
      mockAdapter.query.mockReturnValue("X is a module");
      const { activate } = await import("../../src/skills/graphwiki.mjs");
      const result = await activate({ trigger: "graphwiki:", args: ["query", "what is X?"] });
      expect(result.status).toBe("ok");
      expect(result.message).toContain("X is a module");
      expect(mockAdapter.query).toHaveBeenCalledWith(expect.any(String), "what is X?");
    });

    it("handles empty adapter output", async () => {
      mockAdapter.query.mockReturnValue("");
      const { activate } = await import("../../src/skills/graphwiki.mjs");
      const result = await activate({ trigger: "graphwiki:", args: ["query", "anything"] });
      expect(result.status).toBe("ok");
      expect(result.message).toContain("(no output)");
    });
  });

  describe("path", () => {
    it("returns error when missing from/to", async () => {
      const { activate } = await import("../../src/skills/graphwiki.mjs");
      const result = await activate({ trigger: "graphwiki:", args: ["path", "A"] });
      expect(result.status).toBe("error");
    });

    it("delegates to adapter.path", async () => {
      mockAdapter.path.mockReturnValue("A -> B -> C");
      const { activate } = await import("../../src/skills/graphwiki.mjs");
      const result = await activate({ trigger: "graphwiki:", args: ["path", "A", "C"] });
      expect(result.status).toBe("ok");
      expect(result.message).toContain("A -> B -> C");
    });
  });

  describe("lint", () => {
    it("returns clean message when no issues", async () => {
      mockAdapter.lint.mockReturnValue({ issues: [], clean: true });
      const { activate } = await import("../../src/skills/graphwiki.mjs");
      const result = await activate({ trigger: "graphwiki:", args: ["lint"] });
      expect(result.status).toBe("ok");
      expect(result.message).toContain("No lint issues");
    });

    it("returns issues when lint finds problems", async () => {
      mockAdapter.lint.mockReturnValue({ issues: ["orphan node: X"], clean: false });
      const { activate } = await import("../../src/skills/graphwiki.mjs");
      const result = await activate({ trigger: "graphwiki:", args: ["lint"] });
      expect(result.status).toBe("ok");
      expect(result.message).toContain("orphan node");
    });
  });

  describe("refine", () => {
    it("delegates to adapter.refine without --review", async () => {
      mockAdapter.refine.mockReturnValue("refined");
      const { activate } = await import("../../src/skills/graphwiki.mjs");
      await activate({ trigger: "graphwiki:", args: ["refine"] });
      expect(mockAdapter.refine).toHaveBeenCalledWith(expect.any(String), false);
    });

    it("passes review=true when --review flag present", async () => {
      mockAdapter.refine.mockReturnValue("reviewed");
      const { activate } = await import("../../src/skills/graphwiki.mjs");
      await activate({ trigger: "graphwiki:", args: ["refine", "--review"] });
      expect(mockAdapter.refine).toHaveBeenCalledWith(expect.any(String), true);
    });
  });

  describe("build", () => {
    it("returns error on failed build", async () => {
      mockAdapter.build.mockReturnValue({ success: false, outputPath: "", error: "not found" });
      const { activate } = await import("../../src/skills/graphwiki.mjs");
      const result = await activate({ trigger: "graphwiki:", args: ["build"] });
      expect(result.status).toBe("error");
    });

    it("returns ok on successful build", async () => {
      mockAdapter.build.mockReturnValue({ success: true, outputPath: "/out/graph.json" });
      const { activate } = await import("../../src/skills/graphwiki.mjs");
      const result = await activate({ trigger: "graphwiki:", args: ["build"] });
      expect(result.status).toBe("ok");
    });
  });

  describe("status", () => {
    it("returns no graph message when not built", async () => {
      mockAdapter.status.mockReturnValue({ exists: false, outputPath: "", reportPath: "" });
      const { activate } = await import("../../src/skills/graphwiki.mjs");
      const result = await activate({ trigger: "graphwiki:", args: ["status"] });
      expect(result.status).toBe("ok");
      expect(result.message).toContain("No graph found");
    });

    it("returns paths when graph exists", async () => {
      mockAdapter.status.mockReturnValue({
        exists: true,
        outputPath: "/ws/graphwiki-out/graph.json",
        reportPath: "/ws/graphwiki-out/GRAPH_REPORT.md",
      });
      const { activate } = await import("../../src/skills/graphwiki.mjs");
      const result = await activate({ trigger: "graphwiki:", args: ["status"] });
      expect(result.message).toContain("graph.json");
    });
  });

  describe("clean", () => {
    it("delegates to adapter.clean", async () => {
      const { activate } = await import("../../src/skills/graphwiki.mjs");
      const result = await activate({ trigger: "graphwiki:", args: ["clean"] });
      expect(result.status).toBe("ok");
      expect(mockAdapter.clean).toHaveBeenCalled();
    });
  });

  describe("unknown action", () => {
    it("returns usage error", async () => {
      const { activate } = await import("../../src/skills/graphwiki.mjs");
      const result = await activate({ trigger: "graphwiki:", args: ["unknown"] });
      expect(result.status).toBe("error");
      expect(result.message).toContain("Usage");
    });
  });

  describe("error handling", () => {
    it("catches adapter errors and returns error status", async () => {
      mockAdapter.query.mockImplementation(() => { throw new Error("CLI not found"); });
      const { activate } = await import("../../src/skills/graphwiki.mjs");
      const result = await activate({ trigger: "graphwiki:", args: ["query", "anything"] });
      expect(result.status).toBe("error");
      expect(result.message).toContain("CLI not found");
    });
  });

  describe("deactivate", () => {
    it("does not throw", async () => {
      const { deactivate } = await import("../../src/skills/graphwiki.mjs");
      expect(() => deactivate()).not.toThrow();
    });
  });
});
