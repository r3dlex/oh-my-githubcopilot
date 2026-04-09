/**
 * SWE-bench Runner Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { HarnessResult } from "../../src/benchmark/harness.mts";

// -------------------------------------------------------------------
// Module-level mock function (hoisted by vitest)
// -------------------------------------------------------------------
const harnessRunAll = vi.fn<() => Promise<HarnessResult[]>>();

vi.mock("../../src/benchmark/harness.mjs", () => ({
  runAll: harnessRunAll,
  loadInstances: vi.fn().mockReturnValue([]),
}));

vi.mock("../../src/utils/timer.mts", () => ({
  formatDuration: vi.fn((ms: number): string => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
    const mins = Math.floor(ms / 60_000);
    const secs = Math.round((ms % 60_000) / 1000);
    return `${mins}m ${secs}s`;
  }),
}));

vi.mock("fs", () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

// -------------------------------------------------------------------
// Stubs
// -------------------------------------------------------------------

let runBenchmarks!: (config: any) => Promise<any>;
let printReport!: (report: any) => void;
const stdoutWrite = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

beforeEach(async () => {
  vi.clearAllMocks();
  // Reset the module cache so dynamic import gets fresh module-level mocks
  await vi.resetModules();

  // Re-apply hoisted mocks to the module cache
  vi.doMock("../../src/benchmark/harness.mjs", () => ({
    runAll: harnessRunAll,
    loadInstances: vi.fn().mockReturnValue([]),
  }));

  vi.doMock("../../src/utils/timer.mts", () => ({
    formatDuration: vi.fn((ms: number): string => {
      if (ms < 1000) return `${Math.round(ms)}ms`;
      if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
      const mins = Math.floor(ms / 60_000);
      const secs = Math.round((ms % 60_000) / 1000);
      return `${mins}m ${secs}s`;
    }),
  }));

  vi.doMock("fs", () => ({
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
  }));

  stdoutWrite.mockImplementation(() => true);

  const runner = await import("../../src/benchmark/runner.mts");
  runBenchmarks = runner.runBenchmarks;
  printReport = runner.printReport;
});

// -------------------------------------------------------------------
// Tests
// -------------------------------------------------------------------

describe("runBenchmarks", () => {
  it("should aggregate results by status", async () => {
    const fs = await import("fs");
    // Provide a valid instances JSON so runner.mts can read + parse it
    const mockInstances = [
      { instance_id: "swe-1", repo: "x", version: "v1", patch: "", test_patch: "", resolution: "fixed" },
      { instance_id: "swe-2", repo: "x", version: "v1", patch: "", test_patch: "", resolution: "fixed" },
      { instance_id: "swe-3", repo: "x", version: "v1", patch: "", test_patch: "", resolution: "fixed" },
      { instance_id: "swe-4", repo: "x", version: "v1", patch: "", test_patch: "", resolution: "fixed" },
    ];
    (fs.readFileSync as ReturnType<typeof vi.fn>).mockReturnValueOnce(
      JSON.stringify(mockInstances)
    );

    harnessRunAll.mockResolvedValueOnce([
      { instance_id: "swe-1", status: "resolved", elapsed_ms: 5000, predictions: [], references: [] },
      { instance_id: "swe-2", status: "failed", elapsed_ms: 3000, predictions: [], references: [] },
      { instance_id: "swe-3", status: "timeout", elapsed_ms: 8000, predictions: [], references: [] },
      { instance_id: "swe-4", status: "error", elapsed_ms: 1000, predictions: [], references: [] },
    ]);

    const result = await runBenchmarks({
      instances_file: "/tmp/instances.json",
      output_dir: "/tmp/results",
      max_parallel: 4,
      timeout_ms: 60_000,
    });

    expect(result.total).toBe(4);
    expect(result.resolved).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.timeout).toBe(1);
    expect(result.error).toBe(1);
  });

  it("should return empty report when instances file cannot be read", async () => {
    const fs = await import("fs");
    (fs.readFileSync as ReturnType<typeof vi.fn>).mockImplementationOnce(() => {
      throw new Error("ENOENT");
    });

    const result = await runBenchmarks({
      instances_file: "/nonexistent/instances.json",
      output_dir: "/tmp/results",
      timeout_ms: 60_000,
    });

    expect(result.total).toBe(0);
    expect(result.resolved).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.timeout).toBe(0);
    expect(result.error).toBe(0);
    expect(result.results).toEqual([]);
  });

  it("should write report.json to output directory", async () => {
    const fs = await import("fs");
    (fs.readFileSync as ReturnType<typeof vi.fn>).mockReturnValueOnce(
      JSON.stringify([{ instance_id: "x-1", repo: "x", version: "v1", patch: "", test_patch: "", resolution: "fixed" }])
    );

    harnessRunAll.mockResolvedValueOnce([
      { instance_id: "x-1", status: "resolved", elapsed_ms: 500, predictions: [], references: [] },
    ]);

    await runBenchmarks({
      instances_file: "/tmp/instances.json",
      output_dir: "/tmp/results",
      timeout_ms: 60_000,
    });

    const writeFileSync = fs.writeFileSync as ReturnType<typeof vi.fn>;
    const reportCall = writeFileSync.mock.calls.find(
      (call) => typeof call[0] === "string" && (call[0] as string).endsWith("report.json")
    );
    expect(reportCall).toBeDefined();
    const parsed = JSON.parse(reportCall![1] as string);
    expect(parsed.total).toBe(1);
  });

  it("should record total_time_ms", async () => {
    const fs = await import("fs");
    (fs.readFileSync as ReturnType<typeof vi.fn>).mockReturnValueOnce("[]");

    harnessRunAll.mockResolvedValueOnce([]);

    const before = Date.now();
    const result = await runBenchmarks({
      instances_file: "/tmp/instances.json",
      output_dir: "/tmp/results",
      timeout_ms: 60_000,
    });
    const after = Date.now();

    expect(result.total_time_ms).toBeGreaterThanOrEqual(0);
    expect(result.total_time_ms).toBeLessThanOrEqual(after - before + 50);
  });
});

describe("printReport", () => {
  it("should print formatted summary to stdout", () => {
    const report = {
      total: 10,
      resolved: 7,
      failed: 2,
      timeout: 1,
      error: 0,
      total_time_ms: 45000,
      results: [] as HarnessResult[],
    };

    printReport(report);

    const output = stdoutWrite.mock.calls.map((c) => c[0]).join("");

    expect(output).toContain("=== SWE-bench Results ===");
    expect(output).toContain("Total:     10");
    expect(output).toContain("Resolved:  7 (70.0%)");
    expect(output).toContain("Failed:    2");
    expect(output).toContain("Timeout:   1");
    expect(output).toContain("Error:     0");
  });

  it("should handle zero total gracefully", () => {
    const report = {
      total: 0,
      resolved: 0,
      failed: 0,
      timeout: 0,
      error: 0,
      total_time_ms: 10,
      results: [] as HarnessResult[],
    };

    printReport(report);

    const output = stdoutWrite.mock.calls.map((c) => c[0]).join("");
    expect(output).toContain("Resolved:  0 (0.0%)");
  });

  it("should include all result statuses", () => {
    const report = {
      total: 100,
      resolved: 50,
      failed: 25,
      timeout: 15,
      error: 10,
      total_time_ms: 60000,
      results: [] as HarnessResult[],
    };

    printReport(report);

    const output = stdoutWrite.mock.calls.map((c) => c[0]).join("");
    expect(output).toContain("Resolved:  50 (50.0%)");
    expect(output).toContain("Failed:    25");
    expect(output).toContain("Timeout:   15");
    expect(output).toContain("Error:     10");
  });
});
