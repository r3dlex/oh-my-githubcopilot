/**
 * SWE-bench Harness Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";

// Mock fs and path before importing the module
vi.mock("fs", () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

vi.mock("path", () => ({
  join: vi.fn((...args: string[]) => args.join("/")),
}));

vi.mock("os", () => ({
  homedir: () => "/home/testuser",
}));

// Use dynamic import to apply mocks
let loadInstances: (instancesFile: string) => any[];
let runInstance: (instance: any, config: any) => Promise<any>;
let runAll: (instancesFile: string, config?: any) => Promise<any[]>;

beforeEach(async () => {
  vi.clearAllMocks();
  vi.resetModules();

  // Re-import to get fresh functions with mocks applied
  const harness = await import("../../src/benchmark/harness.mts");
  loadInstances = harness.loadInstances;
  runInstance = harness.runInstance;
  runAll = harness.runAll;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("loadInstances", () => {
  it("should load valid JSON instances", () => {
    const mockInstances = [
      {
        instance_id: "repo-A-1",
        repo: "repo-A",
        version: "v1.0.0",
        patch: "diff --git",
        test_patch: "diff --git",
        resolution: "resolved",
      },
      {
        instance_id: "repo-A-2",
        repo: "repo-A",
        version: "v1.1.0",
        patch: "diff --git",
        test_patch: "diff --git",
        resolution: "resolved",
      },
    ];

    (readFileSync as ReturnType<typeof vi.fn>).mockReturnValueOnce(
      JSON.stringify(mockInstances)
    );

    const result = loadInstances("/fake/path/instances.json");

    expect(result).toEqual(mockInstances);
    expect(readFileSync).toHaveBeenCalledWith("/fake/path/instances.json", "utf-8");
  });

  it("should return empty array when file cannot be read", () => {
    (readFileSync as ReturnType<typeof vi.fn>).mockImplementationOnce(() => {
      throw new Error("ENOENT");
    });

    const result = loadInstances("/nonexistent/instances.json");

    expect(result).toEqual([]);
  });

  it("should return empty array on invalid JSON", () => {
    (readFileSync as ReturnType<typeof vi.fn>).mockReturnValueOnce("not valid json");

    const result = loadInstances("/fake/path/bad.json");

    expect(result).toEqual([]);
  });

  it("should parse empty array as valid JSON", () => {
    (readFileSync as ReturnType<typeof vi.fn>).mockReturnValueOnce("[]");

    const result = loadInstances("/fake/path/empty.json");

    expect(result).toEqual([]);
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("runInstance", () => {
  it("should return resolved status for stub implementation", async () => {
    const instance = {
      instance_id: "test-1",
      repo: "test-repo",
      version: "v1.0.0",
      patch: "diff --git",
      test_patch: "diff --git",
      resolution: "resolved",
    };

    const config = {
      instances_dir: "/tmp/instances",
      output_dir: "/tmp/output",
      timeout_ms: 300_000,
    };

    const result = await runInstance(instance, config);

    expect(result.instance_id).toBe("test-1");
    expect(result.status).toBe("resolved");
    expect(result.elapsed_ms).toBeGreaterThanOrEqual(0);
    expect(result.predictions).toEqual([]);
    expect(result.references).toEqual([]);
  });

  it("should preserve instance_id in result", async () => {
    const instance = {
      instance_id: "django__django-12345",
      repo: "django__django",
      version: "stable-5.0",
      patch: "diff --git a/file.py b/file.py",
      test_patch: "diff --git a/test_file.py b/test_file.py",
      resolution: "fixed",
    };

    const result = await runInstance(instance, { timeout_ms: 60_000, output_dir: "/tmp", instances_dir: "/tmp" });

    expect(result.instance_id).toBe("django__django-12345");
  });

  it("should handle missing resolution field gracefully", async () => {
    const instance = {
      instance_id: "no-resolution",
      repo: "some-repo",
      version: "v0.1.0",
      patch: "diff",
      test_patch: "diff",
    };

    const result = await runInstance(instance, { timeout_ms: 60_000, output_dir: "/tmp", instances_dir: "/tmp" });

    expect(result.status).toBe("resolved");
    expect(result.instance_id).toBe("no-resolution");
  });
});

describe("runAll", () => {
  it("should aggregate results from loadInstances", async () => {
    const mockInstances = [
      {
        instance_id: "aggregate-1",
        repo: "aggregate-repo",
        version: "v1.0.0",
        patch: "diff",
        test_patch: "diff",
        resolution: "resolved",
      },
      {
        instance_id: "aggregate-2",
        repo: "aggregate-repo",
        version: "v1.1.0",
        patch: "diff",
        test_patch: "diff",
        resolution: "resolved",
      },
    ];

    // Mock loadInstances by controlling readFileSync
    (readFileSync as ReturnType<typeof vi.fn>).mockReturnValueOnce(
      JSON.stringify(mockInstances)
    );
    (mkdirSync as ReturnType<typeof vi.fn>).mockReturnValue(undefined);

    const result = await runAll("/tmp/instances.json", {
      output_dir: "/tmp/results",
      timeout_ms: 60_000,
    });

    expect(result).toHaveLength(2);
    expect(result[0].instance_id).toBe("aggregate-1");
    expect(result[1].instance_id).toBe("aggregate-2");
  });

  it("should write results to output file", async () => {
    const mockInstances = [
      {
        instance_id: "write-test",
        repo: "write-repo",
        version: "v1.0.0",
        patch: "diff",
        test_patch: "diff",
        resolution: "resolved",
      },
    ];

    (readFileSync as ReturnType<typeof vi.fn>).mockReturnValueOnce(
      JSON.stringify(mockInstances)
    );
    (mkdirSync as ReturnType<typeof vi.fn>).mockReturnValue(undefined);

    await runAll("/tmp/instances.json", { output_dir: "/tmp/results" });

    expect(mkdirSync).toHaveBeenCalledWith("/tmp/results", { recursive: true });
    expect(writeFileSync).toHaveBeenCalled();
    const writtenCall = (writeFileSync as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(writtenCall[0]).toContain("/tmp/results/results-");
    expect(JSON.parse(writtenCall[1] as string)).toHaveLength(1);
  });

  it("should use default directories when not provided", async () => {
    const mockInstances: any[] = [];

    (readFileSync as ReturnType<typeof vi.fn>).mockReturnValueOnce(
      JSON.stringify(mockInstances)
    );
    (mkdirSync as ReturnType<typeof vi.fn>).mockReturnValue(undefined);

    await runAll("/tmp/instances.json");

    expect(mkdirSync).toHaveBeenCalledWith(
      "/home/testuser/.omp/swebench/results",
      { recursive: true }
    );
  });

  it("should handle empty instances file", async () => {
    (readFileSync as ReturnType<typeof vi.fn>).mockReturnValueOnce("[]");
    (mkdirSync as ReturnType<typeof vi.fn>).mockReturnValue(undefined);

    const result = await runAll("/tmp/empty.json", { output_dir: "/tmp/out" });

    expect(result).toHaveLength(0);
  });
});
