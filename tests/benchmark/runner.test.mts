/**
 * Benchmark Runner Integration Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { HarnessResult } from "../../src/benchmark/harness.mts";

// -------------------------------------------------------------------
// Module-level mock
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
  await vi.resetModules();

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

describe("runBenchmarks integration", () => {
  it("should return empty report when no instances", async () => {
    const fs = await import("fs");
    (fs.readFileSync as ReturnType<typeof vi.fn>).mockReturnValueOnce("[]");

    harnessRunAll.mockResolvedValueOnce([]);

    const result = await runBenchmarks({
      instances_file: "/tmp/instances.json",
      output_dir: "/tmp/results",
      timeout_ms: 60_000,
    });

    expect(result.total).toBe(0);
    expect(result.results).toHaveLength(0);
  });

  it("should handle malformed JSON gracefully", async () => {
    const fs = await import("fs");
    (fs.readFileSync as ReturnType<typeof vi.fn>).mockImplementationOnce(() => {
      throw new Error("Unexpected token");
    });

    const result = await runBenchmarks({
      instances_file: "/tmp/invalid.json",
      output_dir: "/tmp/results",
      timeout_ms: 60_000,
    });

    expect(result.total).toBe(0);
    expect(result.resolved).toBe(0);
  });

  it("should produce correct percentage calculation", async () => {
    const fs = await import("fs");
    (fs.readFileSync as ReturnType<typeof vi.fn>).mockReturnValueOnce(
      JSON.stringify([
        { instance_id: "a", repo: "x", version: "v1", patch: "", test_patch: "", resolution: "fixed" },
        { instance_id: "b", repo: "x", version: "v1", patch: "", test_patch: "", resolution: "fixed" },
        { instance_id: "c", repo: "x", version: "v1", patch: "", test_patch: "", resolution: "fixed" },
        { instance_id: "d", repo: "x", version: "v1", patch: "", test_patch: "", resolution: "fixed" },
      ])
    );

    harnessRunAll.mockResolvedValueOnce([
      { instance_id: "a", status: "resolved", elapsed_ms: 1000, predictions: [], references: [] },
      { instance_id: "b", status: "resolved", elapsed_ms: 2000, predictions: [], references: [] },
      { instance_id: "c", status: "failed", elapsed_ms: 3000, predictions: [], references: [] },
      { instance_id: "d", status: "resolved", elapsed_ms: 4000, predictions: [], references: [] },
    ]);

    const result = await runBenchmarks({
      instances_file: "/tmp/instances.json",
      output_dir: "/tmp/results",
      timeout_ms: 60_000,
    });

    expect(result.total).toBe(4);
    expect(result.resolved).toBe(3);
    expect(result.failed).toBe(1);
  });

  it("should call writeFileSync with report.json", async () => {
    const fs = await import("fs");
    (fs.readFileSync as ReturnType<typeof vi.fn>).mockReturnValueOnce("[]");

    harnessRunAll.mockResolvedValueOnce([]);

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
  });
});

describe("printReport integration", () => {
  it("should show time taken in summary", () => {
    const report = {
      total: 5,
      resolved: 2,
      failed: 1,
      timeout: 1,
      error: 1,
      total_time_ms: 125000,
      results: [] as HarnessResult[],
    };

    printReport(report);

    const output = stdoutWrite.mock.calls.map((c) => c[0]).join("");
    expect(output).toContain("Time:");
  });

  it("should format zero time correctly", () => {
    const report = {
      total: 0,
      resolved: 0,
      failed: 0,
      timeout: 0,
      error: 0,
      total_time_ms: 0,
      results: [] as HarnessResult[],
    };

    printReport(report);

    const output = stdoutWrite.mock.calls.map((c) => c[0]).join("");
    expect(output).toContain("Time:");
    expect(output).toContain("0ms");
  });

  it("should handle all results being errors", () => {
    const report = {
      total: 3,
      resolved: 0,
      failed: 0,
      timeout: 0,
      error: 3,
      total_time_ms: 3000,
      results: [] as HarnessResult[],
    };

    printReport(report);

    const output = stdoutWrite.mock.calls.map((c) => c[0]).join("");
    expect(output).toContain("Resolved:  0 (0.0%)");
    expect(output).toContain("Error:     3");
  });
});