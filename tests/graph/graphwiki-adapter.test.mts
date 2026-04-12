/**
 * GraphwikiAdapter unit tests.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("fs", () => ({
  existsSync: vi.fn(),
  rmSync: vi.fn(),
}));

vi.mock("child_process", () => ({
  spawnSync: vi.fn(),
}));

import { existsSync, rmSync } from "fs";
import { spawnSync } from "child_process";

const mockExistsSync = vi.mocked(existsSync);
const mockRmSync = vi.mocked(rmSync);
const mockSpawnSync = vi.mocked(spawnSync);

// Helper: configure "which graphwiki" to succeed
function cliFound() {
  mockSpawnSync.mockReturnValueOnce({ status: 0, stdout: "/usr/bin/graphwiki\n", stderr: "" } as any);
}
// Helper: configure "which graphwiki" to fail
function cliMissing() {
  mockSpawnSync.mockReturnValueOnce({ status: 1, stdout: "", stderr: "" } as any);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GraphwikiAdapter.build", () => {
  it("throws when graphwiki CLI not found", async () => {
    cliMissing();
    const { GraphwikiAdapter } = await import("../../src/graph/graphwiki-adapter.mjs");
    expect(() => new GraphwikiAdapter().build("/workspace")).toThrow("graphwiki CLI not found");
  });

  it("returns success result when build succeeds", async () => {
    cliFound();
    mockSpawnSync.mockReturnValueOnce({ status: 0, stdout: "", stderr: "" } as any);
    const { GraphwikiAdapter } = await import("../../src/graph/graphwiki-adapter.mjs");
    const result = new GraphwikiAdapter().build("/workspace");
    expect(result.success).toBe(true);
    expect(result.outputPath).toContain("graph.json");
  });

  it("returns failure result when build exits non-zero", async () => {
    cliFound();
    mockSpawnSync.mockReturnValueOnce({ status: 1, stdout: "", stderr: "syntax error" } as any);
    const { GraphwikiAdapter } = await import("../../src/graph/graphwiki-adapter.mjs");
    const result = new GraphwikiAdapter().build("/workspace");
    expect(result.success).toBe(false);
    expect(result.error).toContain("syntax error");
  });

  it("passes --update flag for incremental build", async () => {
    cliFound();
    mockSpawnSync.mockReturnValueOnce({ status: 0, stdout: "", stderr: "" } as any);
    const { GraphwikiAdapter } = await import("../../src/graph/graphwiki-adapter.mjs");
    new GraphwikiAdapter().build("/workspace", true);
    const buildCall = mockSpawnSync.mock.calls[1];
    expect(buildCall?.[1]).toContain("--update");
  });
});

describe("GraphwikiAdapter.query", () => {
  it("throws when CLI not found", async () => {
    cliMissing();
    const { GraphwikiAdapter } = await import("../../src/graph/graphwiki-adapter.mjs");
    expect(() => new GraphwikiAdapter().query("/workspace", "what is X?")).toThrow("graphwiki CLI not found");
  });

  it("returns stdout from graphwiki query", async () => {
    cliFound();
    mockSpawnSync.mockReturnValueOnce({ status: 0, stdout: "X is a component\n", stderr: "" } as any);
    const { GraphwikiAdapter } = await import("../../src/graph/graphwiki-adapter.mjs");
    const result = new GraphwikiAdapter().query("/workspace", "what is X?");
    expect(result).toContain("X is a component");
  });
});

describe("GraphwikiAdapter.path", () => {
  it("returns stdout from graphwiki path", async () => {
    cliFound();
    mockSpawnSync.mockReturnValueOnce({ status: 0, stdout: "A -> B -> C\n", stderr: "" } as any);
    const { GraphwikiAdapter } = await import("../../src/graph/graphwiki-adapter.mjs");
    const result = new GraphwikiAdapter().path("/workspace", "A", "C");
    expect(result).toContain("A -> B -> C");
  });
});

describe("GraphwikiAdapter.lint", () => {
  it("returns clean result when lint passes", async () => {
    cliFound();
    mockSpawnSync.mockReturnValueOnce({ status: 0, stdout: "", stderr: "" } as any);
    const { GraphwikiAdapter } = await import("../../src/graph/graphwiki-adapter.mjs");
    const result = new GraphwikiAdapter().lint("/workspace");
    expect(result.clean).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it("returns issues when lint fails", async () => {
    cliFound();
    mockSpawnSync.mockReturnValueOnce({ status: 1, stdout: "line 3: orphan node\nline 7: missing edge", stderr: "" } as any);
    const { GraphwikiAdapter } = await import("../../src/graph/graphwiki-adapter.mjs");
    const result = new GraphwikiAdapter().lint("/workspace");
    expect(result.clean).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
  });
});

describe("GraphwikiAdapter.refine", () => {
  it("calls graphwiki refine without --review by default", async () => {
    cliFound();
    mockSpawnSync.mockReturnValueOnce({ status: 0, stdout: "refined output\n", stderr: "" } as any);
    const { GraphwikiAdapter } = await import("../../src/graph/graphwiki-adapter.mjs");
    const result = new GraphwikiAdapter().refine("/workspace");
    expect(result).toContain("refined output");
    const refineCall = mockSpawnSync.mock.calls[1];
    expect(refineCall?.[1]).not.toContain("--review");
  });

  it("passes --review flag when review=true", async () => {
    cliFound();
    mockSpawnSync.mockReturnValueOnce({ status: 0, stdout: "", stderr: "" } as any);
    const { GraphwikiAdapter } = await import("../../src/graph/graphwiki-adapter.mjs");
    new GraphwikiAdapter().refine("/workspace", true);
    const refineCall = mockSpawnSync.mock.calls[1];
    expect(refineCall?.[1]).toContain("--review");
  });
});

describe("GraphwikiAdapter.clean", () => {
  it("calls rmSync on graphwiki-out directory", async () => {
    const { GraphwikiAdapter } = await import("../../src/graph/graphwiki-adapter.mjs");
    new GraphwikiAdapter().clean("/workspace");
    expect(mockRmSync).toHaveBeenCalledWith(
      expect.stringContaining("graphwiki-out"),
      { recursive: true, force: true }
    );
  });
});

describe("GraphwikiAdapter.exists", () => {
  it("returns true when graph.json exists", async () => {
    mockExistsSync.mockReturnValue(true);
    const { GraphwikiAdapter } = await import("../../src/graph/graphwiki-adapter.mjs");
    expect(new GraphwikiAdapter().exists("/workspace")).toBe(true);
  });

  it("returns false when graph.json missing", async () => {
    mockExistsSync.mockReturnValue(false);
    const { GraphwikiAdapter } = await import("../../src/graph/graphwiki-adapter.mjs");
    expect(new GraphwikiAdapter().exists("/workspace")).toBe(false);
  });
});

describe("GraphwikiAdapter duck-type guard", () => {
  it("satisfies both GraphBuildable and GraphWikiClient", async () => {
    const { GraphwikiAdapter } = await import("../../src/graph/graphwiki-adapter.mjs");
    const adapter = new GraphwikiAdapter();
    // GraphBuildable shape
    expect(typeof adapter.build).toBe("function");
    expect(typeof adapter.exists).toBe("function");
    expect(typeof adapter.clean).toBe("function");
    expect(typeof adapter.status).toBe("function");
    // GraphWikiClient shape (duck-type check)
    expect("query" in adapter).toBe(true);
    expect("path" in adapter).toBe(true);
    expect("lint" in adapter).toBe(true);
    expect("refine" in adapter).toBe(true);
  });
});
