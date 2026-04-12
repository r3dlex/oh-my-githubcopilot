/**
 * Graphify Skill Unit Tests
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

describe("status", () => {
  it("should return exists:false when graph file missing", async () => {
    mockExistsSync.mockReturnValue(false);
    const { status } = await import("../../src/skills/graphify.mts");
    const result = status("/workspace");
    expect(result.exists).toBe(false);
  });

  it("should return file info when graph file exists", async () => {
    mockExistsSync.mockReturnValue(true);
    mockStatSync.mockReturnValue({ size: 2048, mtime: new Date("2024-01-01") } as any);
    const { status } = await import("../../src/skills/graphify.mts");
    const result = status("/workspace");
    expect(result.exists).toBe(true);
    expect(result.sizeBytes).toBe(2048);
    expect(result.path).toContain("graph.json");
  });
});

describe("clean", () => {
  it("should call rmSync on the graphify-out directory", async () => {
    const { clean } = await import("../../src/skills/graphify.mts");
    clean("/workspace");
    expect(mockRmSync).toHaveBeenCalledWith(
      expect.stringContaining("graphify-out"),
      { recursive: true, force: true }
    );
  });
});

describe("build", () => {
  it("should throw when graphify CLI is not found", async () => {
    // which returns non-zero, python3 also fails
    mockSpawnSync.mockReturnValue({ status: 1, stdout: "", stderr: "" } as any);
    const { build } = await import("../../src/skills/graphify.mts");
    expect(() => build("/workspace")).toThrow("graphify CLI not found");
  });

  it("should throw when graphify build exits with error", async () => {
    mockSpawnSync
      .mockReturnValueOnce({ status: 0, stdout: "/usr/bin/graphify\n", stderr: "" } as any) // which
      .mockReturnValueOnce({ status: 1, stdout: "", stderr: "build failed" } as any); // build
    const { build } = await import("../../src/skills/graphify.mts");
    expect(() => build("/workspace")).toThrow("graphify build failed");
  });

  it("should throw when output file not found after successful build", async () => {
    mockSpawnSync
      .mockReturnValueOnce({ status: 0, stdout: "/usr/bin/graphify\n", stderr: "" } as any)
      .mockReturnValueOnce({ status: 0, stdout: "", stderr: "" } as any);
    mockExistsSync.mockReturnValue(false);
    const { build } = await import("../../src/skills/graphify.mts");
    expect(() => build("/workspace")).toThrow("output not found");
  });

  it("should return build result with node/edge counts from arrays", async () => {
    mockSpawnSync
      .mockReturnValueOnce({ status: 0, stdout: "/usr/bin/graphify\n", stderr: "" } as any)
      .mockReturnValueOnce({ status: 0, stdout: "", stderr: "" } as any);
    mockExistsSync.mockReturnValue(true);
    const graphData = { nodes: [1, 2, 3], edges: [1, 2], communities: [1] };
    mockReadFileSync.mockReturnValue(JSON.stringify(graphData) as any);
    const { build } = await import("../../src/skills/graphify.mts");
    const result = build("/workspace");
    expect(result.nodeCount).toBe(3);
    expect(result.edgeCount).toBe(2);
    expect(result.communityCount).toBe(1);
  });

  it("should use python3 -m graphify when which fails but python3 works", async () => {
    mockSpawnSync
      .mockReturnValueOnce({ status: 1, stdout: "", stderr: "" } as any) // which fails
      .mockReturnValueOnce({ status: 0, stdout: "", stderr: "" } as any) // python3 check ok
      .mockReturnValueOnce({ status: 0, stdout: "", stderr: "" } as any); // actual build
    mockExistsSync.mockReturnValue(true);
    const graphData = { nodeCount: 5, edgeCount: 10, communityCount: 2 };
    mockReadFileSync.mockReturnValue(JSON.stringify(graphData) as any);
    const { build } = await import("../../src/skills/graphify.mts");
    const result = build("/workspace");
    expect(result.nodeCount).toBe(5);
    expect(result.edgeCount).toBe(10);
  });
});

describe("activate", () => {
  it("should return status message when graph does not exist", async () => {
    mockExistsSync.mockReturnValue(false);
    const { activate } = await import("../../src/skills/graphify.mts");
    const result = await activate({ trigger: "graphify", args: ["status"] });
    expect(result.status).toBe("ok");
    expect(result.message).toContain("No graph found");
  });

  it("should return status info when graph exists", async () => {
    mockExistsSync.mockReturnValue(true);
    mockStatSync.mockReturnValue({ size: 4096, mtime: new Date("2024-06-01T00:00:00Z") } as any);
    const { activate } = await import("../../src/skills/graphify.mts");
    const result = await activate({ trigger: "graphify", args: ["status"] });
    expect(result.status).toBe("ok");
    expect(result.message).toContain("Graph exists");
  });

  it("should clean when action is clean", async () => {
    const { activate } = await import("../../src/skills/graphify.mts");
    const result = await activate({ trigger: "graphify", args: ["clean"] });
    expect(result.status).toBe("ok");
    expect(result.message).toContain("removed");
    expect(mockRmSync).toHaveBeenCalled();
  });

  it("should return error when build fails", async () => {
    mockSpawnSync.mockReturnValue({ status: 1, stdout: "", stderr: "" } as any);
    const { activate } = await import("../../src/skills/graphify.mts");
    const result = await activate({ trigger: "graphify", args: ["build"] });
    expect(result.status).toBe("error");
    expect(result.message).toContain("graphify CLI not found");
  });

  it("should handle default build action (no args)", async () => {
    mockSpawnSync.mockReturnValue({ status: 1, stdout: "", stderr: "" } as any);
    const { activate } = await import("../../src/skills/graphify.mts");
    const result = await activate({ trigger: "graphify", args: [] });
    expect(result.status).toBe("error");
  });
});

describe("deactivate", () => {
  it("should not throw", async () => {
    const { deactivate } = await import("../../src/skills/graphify.mts");
    expect(() => deactivate()).not.toThrow();
  });
});
