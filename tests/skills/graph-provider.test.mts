/**
 * graph-provider skill unit tests.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/graph/registry.mjs", () => ({
  getProvider: vi.fn(),
  setProvider: vi.fn(),
  listProviders: vi.fn(),
}));

vi.mock("../../src/utils/config.mjs", () => ({
  loadConfig: vi.fn(),
  writeConfig: vi.fn(),
}));

import { getProvider, setProvider, listProviders } from "../../src/graph/registry.mjs";
import { loadConfig } from "../../src/utils/config.mjs";

const mockGetProvider = vi.mocked(getProvider);
const mockSetProvider = vi.mocked(setProvider);
const mockListProviders = vi.mocked(listProviders);
const mockLoadConfig = vi.mocked(loadConfig);

const mockBuildableProvider = {
  id: "graphwiki",
  name: "GraphWiki",
  outputDir: "graphwiki-out",
  build: vi.fn(),
  exists: vi.fn(),
  getReportPath: vi.fn(),
  getGraphPath: vi.fn(),
  clean: vi.fn(),
  status: vi.fn(),
  // GraphWikiClient methods (duck-type check)
  query: vi.fn(),
};

const mockGraphifyProvider = {
  id: "graphify",
  name: "Graphify",
  outputDir: "graphify-out",
  build: vi.fn(),
  exists: vi.fn(),
  getReportPath: vi.fn(),
  getGraphPath: vi.fn(),
  clean: vi.fn(),
  status: vi.fn(),
  // No query — GraphBuildable only
};

beforeEach(() => {
  vi.clearAllMocks();
  mockListProviders.mockReturnValue(["graphify", "graphwiki"]);
  mockGetProvider.mockReturnValue(mockBuildableProvider as any);
});

describe("graph-provider skill", () => {
  describe("get", () => {
    it("returns active provider from config", async () => {
      mockLoadConfig.mockReturnValue({ graph: { provider: "graphwiki" } });
      const { activate } = await import("../../src/skills/graph-provider.mjs");
      const result = await activate({ trigger: "graph:", args: ["get"] });
      expect(result.status).toBe("ok");
      expect(result.message).toContain("graphwiki");
    });

    it("defaults to graphwiki when no config", async () => {
      mockLoadConfig.mockReturnValue({});
      const { activate } = await import("../../src/skills/graph-provider.mjs");
      const result = await activate({ trigger: "graph:", args: ["get"] });
      expect(result.status).toBe("ok");
      expect(result.message).toContain("graphwiki");
    });
  });

  describe("set", () => {
    it("calls setProvider with given id", async () => {
      const { activate } = await import("../../src/skills/graph-provider.mjs");
      const result = await activate({ trigger: "graph:", args: ["set", "graphify"] });
      expect(result.status).toBe("ok");
      expect(mockSetProvider).toHaveBeenCalledWith("graphify");
    });

    it("returns error when no id provided", async () => {
      const { activate } = await import("../../src/skills/graph-provider.mjs");
      const result = await activate({ trigger: "graph:", args: ["set"] });
      expect(result.status).toBe("error");
      expect(result.message).toContain("Usage");
    });
  });

  describe("list", () => {
    it("returns all available providers", async () => {
      const { activate } = await import("../../src/skills/graph-provider.mjs");
      const result = await activate({ trigger: "graph:", args: ["list"] });
      expect(result.status).toBe("ok");
      expect(result.message).toContain("graphify");
      expect(result.message).toContain("graphwiki");
    });
  });

  describe("build", () => {
    it("delegates to active provider's build()", async () => {
      mockBuildableProvider.build.mockReturnValue({ success: true, outputPath: "/out" });
      const { activate } = await import("../../src/skills/graph-provider.mjs");
      const result = await activate({ trigger: "graph:", args: ["build"] });
      expect(result.status).toBe("ok");
      expect(mockBuildableProvider.build).toHaveBeenCalled();
    });

    it("returns error when build fails", async () => {
      mockBuildableProvider.build.mockReturnValue({ success: false, error: "CLI missing" });
      const { activate } = await import("../../src/skills/graph-provider.mjs");
      const result = await activate({ trigger: "graph:", args: ["build"] });
      expect(result.status).toBe("error");
    });
  });

  describe("status", () => {
    it("returns no graph message when not built", async () => {
      mockBuildableProvider.status.mockReturnValue({ exists: false, outputPath: "", reportPath: "" });
      const { activate } = await import("../../src/skills/graph-provider.mjs");
      const result = await activate({ trigger: "graph:", args: ["status"] });
      expect(result.status).toBe("ok");
      expect(result.message).toContain("No graph found");
    });

    it("returns graph paths when built", async () => {
      mockBuildableProvider.status.mockReturnValue({
        exists: true,
        outputPath: "/ws/graphwiki-out/graph.json",
        reportPath: "/ws/graphwiki-out/GRAPH_REPORT.md",
      });
      const { activate } = await import("../../src/skills/graph-provider.mjs");
      const result = await activate({ trigger: "graph:", args: ["status"] });
      expect(result.message).toContain("graph.json");
    });
  });

  describe("clean", () => {
    it("delegates to active provider's clean()", async () => {
      const { activate } = await import("../../src/skills/graph-provider.mjs");
      const result = await activate({ trigger: "graph:", args: ["clean"] });
      expect(result.status).toBe("ok");
      expect(mockBuildableProvider.clean).toHaveBeenCalled();
    });
  });

  describe("query", () => {
    it("delegates query to wiki-capable provider", async () => {
      mockBuildableProvider.query.mockReturnValue("X is a module");
      const { activate } = await import("../../src/skills/graph-provider.mjs");
      const result = await activate({ trigger: "graph:", args: ["query", "what is X?"] });
      expect(result.status).toBe("ok");
      expect(result.message).toContain("X is a module");
    });

    it("returns error when provider does not support query", async () => {
      mockGetProvider.mockReturnValue(mockGraphifyProvider as any);
      const { activate } = await import("../../src/skills/graph-provider.mjs");
      const result = await activate({ trigger: "graph:", args: ["query", "anything"] });
      expect(result.status).toBe("error");
      expect(result.message).toContain("does not support query");
    });

    it("returns error when no question provided", async () => {
      const { activate } = await import("../../src/skills/graph-provider.mjs");
      const result = await activate({ trigger: "graph:", args: ["query"] });
      expect(result.status).toBe("error");
    });
  });

  describe("unknown action", () => {
    it("returns usage error", async () => {
      const { activate } = await import("../../src/skills/graph-provider.mjs");
      const result = await activate({ trigger: "graph:", args: ["unknown"] });
      expect(result.status).toBe("error");
      expect(result.message).toContain("Usage");
    });
  });

  describe("deactivate", () => {
    it("does not throw", async () => {
      const { deactivate } = await import("../../src/skills/graph-provider.mjs");
      expect(() => deactivate()).not.toThrow();
    });
  });
});
