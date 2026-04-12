/**
 * GraphifyAdapter unit tests.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("fs", () => ({
  existsSync: vi.fn(),
  statSync: vi.fn(),
  rmSync: vi.fn(),
  readFileSync: vi.fn(),
}));

vi.mock("child_process", () => ({
  spawnSync: vi.fn(),
}));

import { existsSync, statSync, rmSync, readFileSync } from "fs";
import { spawnSync } from "child_process";

const mockExistsSync = vi.mocked(existsSync);
const mockStatSync = vi.mocked(statSync);
const mockRmSync = vi.mocked(rmSync);
const mockReadFileSync = vi.mocked(readFileSync);
const mockSpawnSync = vi.mocked(spawnSync);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GraphifyAdapter.build", () => {
  it("throws when graphify CLI not found", async () => {
    mockSpawnSync.mockReturnValue({ status: 1, stdout: "", stderr: "" } as any);
    const { GraphifyAdapter } = await import("../../src/graph/graphify-adapter.mjs");
    const adapter = new GraphifyAdapter();
    expect(() => adapter.build("/workspace")).toThrow("graphify CLI not found");
  });

  it("throws when build exits with non-zero", async () => {
    mockSpawnSync
      .mockReturnValueOnce({ status: 0, stdout: "/usr/bin/graphify\n", stderr: "" } as any)
      .mockReturnValueOnce({ status: 1, stdout: "", stderr: "build failed" } as any);
    const { GraphifyAdapter } = await import("../../src/graph/graphify-adapter.mjs");
    const adapter = new GraphifyAdapter();
    expect(() => adapter.build("/workspace")).toThrow("graphify build failed");
  });

  it("throws when output not found after successful build", async () => {
    mockSpawnSync
      .mockReturnValueOnce({ status: 0, stdout: "/usr/bin/graphify\n", stderr: "" } as any)
      .mockReturnValueOnce({ status: 0, stdout: "", stderr: "" } as any);
    mockExistsSync.mockReturnValue(false);
    const { GraphifyAdapter } = await import("../../src/graph/graphify-adapter.mjs");
    const adapter = new GraphifyAdapter();
    expect(() => adapter.build("/workspace")).toThrow("output not found");
  });

  it("returns rich result with nodeCount/edgeCount/communityCount", async () => {
    mockSpawnSync
      .mockReturnValueOnce({ status: 0, stdout: "/usr/bin/graphify\n", stderr: "" } as any)
      .mockReturnValueOnce({ status: 0, stdout: "", stderr: "" } as any);
    mockExistsSync.mockReturnValue(true);
    const graphData = { nodes: [1, 2, 3], edges: [1, 2], communities: [1] };
    mockReadFileSync.mockReturnValue(JSON.stringify(graphData) as any);
    const { GraphifyAdapter } = await import("../../src/graph/graphify-adapter.mjs");
    const adapter = new GraphifyAdapter();
    const result = adapter.build("/workspace");
    expect(result.success).toBe(true);
    expect(result.nodeCount).toBe(3);
    expect(result.edgeCount).toBe(2);
    expect(result.communityCount).toBe(1);
    expect(result.data?.["nodeCount"]).toBe(3);
  });

  it("uses python3 -m graphify when which fails", async () => {
    mockSpawnSync
      .mockReturnValueOnce({ status: 1, stdout: "", stderr: "" } as any)
      .mockReturnValueOnce({ status: 0, stdout: "", stderr: "" } as any)
      .mockReturnValueOnce({ status: 0, stdout: "", stderr: "" } as any);
    mockExistsSync.mockReturnValue(true);
    const graphData = { nodeCount: 5, edgeCount: 10, communityCount: 2 };
    mockReadFileSync.mockReturnValue(JSON.stringify(graphData) as any);
    const { GraphifyAdapter } = await import("../../src/graph/graphify-adapter.mjs");
    const adapter = new GraphifyAdapter();
    const result = adapter.build("/workspace");
    expect(result.nodeCount).toBe(5);
  });
});

describe("GraphifyAdapter.detailedStatus", () => {
  it("returns exists:false when graph file missing", async () => {
    mockExistsSync.mockReturnValue(false);
    const { GraphifyAdapter } = await import("../../src/graph/graphify-adapter.mjs");
    const result = new GraphifyAdapter().detailedStatus("/workspace");
    expect(result.exists).toBe(false);
  });

  it("returns file info when graph file exists", async () => {
    mockExistsSync.mockReturnValue(true);
    mockStatSync.mockReturnValue({ size: 2048, mtime: new Date("2024-01-01") } as any);
    const { GraphifyAdapter } = await import("../../src/graph/graphify-adapter.mjs");
    const result = new GraphifyAdapter().detailedStatus("/workspace");
    expect(result.exists).toBe(true);
    expect(result.sizeBytes).toBe(2048);
    expect(result.path).toContain("graph.json");
  });
});

describe("GraphifyAdapter.status", () => {
  it("returns StatusResult shape", async () => {
    mockExistsSync.mockReturnValue(true);
    const { GraphifyAdapter } = await import("../../src/graph/graphify-adapter.mjs");
    const result = new GraphifyAdapter().status("/workspace");
    expect(result.exists).toBe(true);
    expect(result.outputPath).toContain("graph.json");
    expect(result.reportPath).toContain("GRAPH_REPORT.md");
  });
});

describe("GraphifyAdapter.clean", () => {
  it("calls rmSync on graphify-out directory", async () => {
    const { GraphifyAdapter } = await import("../../src/graph/graphify-adapter.mjs");
    new GraphifyAdapter().clean("/workspace");
    expect(mockRmSync).toHaveBeenCalledWith(
      expect.stringContaining("graphify-out"),
      { recursive: true, force: true }
    );
  });
});

describe("GraphifyAdapter.exists", () => {
  it("returns true when graph.json exists", async () => {
    mockExistsSync.mockReturnValue(true);
    const { GraphifyAdapter } = await import("../../src/graph/graphify-adapter.mjs");
    expect(new GraphifyAdapter().exists("/workspace")).toBe(true);
  });

  it("returns false when graph.json missing", async () => {
    mockExistsSync.mockReturnValue(false);
    const { GraphifyAdapter } = await import("../../src/graph/graphify-adapter.mjs");
    expect(new GraphifyAdapter().exists("/workspace")).toBe(false);
  });
});
