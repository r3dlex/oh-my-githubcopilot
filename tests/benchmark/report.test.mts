/**
 * SWE-bench Report Tests
 */

import { describe, it, expect } from "vitest";
import {
  generateReport,
  formatMarkdown,
  type FullReport,
  type BenchmarkInstance,
  type HarnessResult,
} from "../../src/benchmark/report.mts";

describe("generateReport", () => {
  it("should generate report with correct summary from results", () => {
    const instances: BenchmarkInstance[] = [
      {
        instance_id: "django__django-123",
        repo: "django__django",
        version: "stable-5.0",
        patch: "diff",
        test_patch: "diff",
        resolution: "fixed",
      },
      {
        instance_id: "flask-456",
        repo: "pallets__flask",
        version: "v3.0.0",
        patch: "diff",
        test_patch: "diff",
        resolution: "resolved",
      },
      {
        instance_id: "requests-789",
        repo: "psf__requests",
        version: "v2.31.0",
        patch: "diff",
        test_patch: "diff",
        resolution: "resolved",
      },
    ];

    const results: HarnessResult[] = [
      {
        instance_id: "django__django-123",
        status: "resolved",
        elapsed_ms: 5000,
        predictions: [],
        references: [],
      },
      {
        instance_id: "flask-456",
        status: "resolved",
        elapsed_ms: 3000,
        predictions: [],
        references: [],
      },
      {
        instance_id: "requests-789",
        status: "failed",
        elapsed_ms: 4000,
        predictions: [],
        references: [],
      },
    ];

    const report = generateReport(instances, results);

    expect(report.generated_at).toBeDefined();
    expect(report.instances).toEqual(instances);
    expect(report.results).toEqual(results);
    expect(report.summary.total).toBe(3);
    expect(report.summary.resolved).toBe(2);
    expect(report.summary.resolved_rate).toBeCloseTo(2 / 3, 5);
    expect(report.summary.avg_elapsed_ms).toBeCloseTo(4000, 0);
  });

  it("should aggregate stats by repository", () => {
    const instances: BenchmarkInstance[] = [
      { instance_id: "django-1", repo: "django__django", version: "v1", patch: "", test_patch: "", resolution: "fixed" },
      { instance_id: "django-2", repo: "django__django", version: "v2", patch: "", test_patch: "", resolution: "fixed" },
      { instance_id: "django-3", repo: "django__django", version: "v3", patch: "", test_patch: "", resolution: "fixed" },
      { instance_id: "flask-1", repo: "pallets__flask", version: "v1", patch: "", test_patch: "", resolution: "fixed" },
    ];

    const results: HarnessResult[] = [
      { instance_id: "django-1", status: "resolved", elapsed_ms: 1000, predictions: [], references: [] },
      { instance_id: "django-2", status: "resolved", elapsed_ms: 2000, predictions: [], references: [] },
      { instance_id: "django-3", status: "failed", elapsed_ms: 3000, predictions: [], references: [] },
      { instance_id: "flask-1", status: "resolved", elapsed_ms: 5000, predictions: [], references: [] },
    ];

    const report = generateReport(instances, results);

    expect(report.summary.by_repo["django__django"]).toEqual({
      total: 3,
      resolved: 2,
      resolved_rate: 2 / 3,
    });
    expect(report.summary.by_repo["pallets__flask"]).toEqual({
      total: 1,
      resolved: 1,
      resolved_rate: 1,
    });
  });

  it("should handle empty results array", () => {
    const report = generateReport([], []);

    expect(report.summary.total).toBe(0);
    expect(report.summary.resolved).toBe(0);
    expect(report.summary.resolved_rate).toBe(0);
    expect(report.summary.avg_elapsed_ms).toBe(0);
    expect(report.summary.by_repo).toEqual({});
  });

  it("should use 'unknown' repo when instance not found", () => {
    const instances: BenchmarkInstance[] = [
      { instance_id: "known-1", repo: "my-repo", version: "v1", patch: "", test_patch: "", resolution: "fixed" },
    ];

    const results: HarnessResult[] = [
      { instance_id: "known-1", status: "resolved", elapsed_ms: 1000, predictions: [], references: [] },
      { instance_id: "unknown-1", status: "failed", elapsed_ms: 1000, predictions: [], references: [] },
    ];

    const report = generateReport(instances, results);

    expect(report.summary.by_repo["my-repo"]).toBeDefined();
    expect(report.summary.by_repo["unknown"]).toBeDefined();
    expect(report.summary.by_repo["unknown"]!.total).toBe(1);
  });

  it("should handle all resolved results", () => {
    const instances: BenchmarkInstance[] = [
      { instance_id: "r-1", repo: "x", version: "v1", patch: "", test_patch: "", resolution: "fixed" },
      { instance_id: "r-2", repo: "x", version: "v1", patch: "", test_patch: "", resolution: "fixed" },
    ];

    const results: HarnessResult[] = [
      { instance_id: "r-1", status: "resolved", elapsed_ms: 1000, predictions: [], references: [] },
      { instance_id: "r-2", status: "resolved", elapsed_ms: 2000, predictions: [], references: [] },
    ];

    const report = generateReport(instances, results);

    expect(report.summary.resolved_rate).toBe(1);
    expect(report.summary.by_repo["x"]!.resolved_rate).toBe(1);
  });

  it("should handle all failed results", () => {
    const instances: BenchmarkInstance[] = [
      { instance_id: "f-1", repo: "y", version: "v1", patch: "", test_patch: "", resolution: "fixed" },
      { instance_id: "f-2", repo: "y", version: "v1", patch: "", test_patch: "", resolution: "fixed" },
    ];

    const results: HarnessResult[] = [
      { instance_id: "f-1", status: "failed", elapsed_ms: 1000, predictions: [], references: [] },
      { instance_id: "f-2", status: "failed", elapsed_ms: 2000, predictions: [], references: [] },
    ];

    const report = generateReport(instances, results);

    expect(report.summary.resolved_rate).toBe(0);
    expect(report.summary.by_repo["y"]!.resolved_rate).toBe(0);
  });
});

describe("formatMarkdown", () => {
  it("should render a complete markdown report", () => {
    const report: FullReport = {
      generated_at: "2026-04-09T12:00:00.000Z",
      instances: [
        { instance_id: "x-1", repo: "my-repo", version: "v1", patch: "", test_patch: "", resolution: "fixed" },
      ],
      results: [
        { instance_id: "x-1", status: "resolved", elapsed_ms: 5000, predictions: [], references: [] },
      ],
      summary: {
        total: 1,
        resolved: 1,
        resolved_rate: 1,
        avg_elapsed_ms: 5000,
        by_repo: {
          "my-repo": { total: 1, resolved: 1, resolved_rate: 1 },
        },
      },
    };

    const md = formatMarkdown(report);

    expect(md).toContain("# SWE-bench Results");
    expect(md).toContain("Generated: 2026-04-09T12:00:00.000Z");
    expect(md).toContain("## Summary");
    expect(md).toContain("| Total instances | 1 |");
    expect(md).toContain("| Resolved | 1 |");
    expect(md).toContain("| Resolution rate | 100.0% |");
    expect(md).toContain("| Avg elapsed | 5.0s |");
    expect(md).toContain("## By Repository");
    expect(md).toContain("**my-repo**: 1/1 (100.0%)");
  });

  it("should format avg_elapsed_ms in seconds", () => {
    const report: FullReport = {
      generated_at: "2026-04-09T00:00:00.000Z",
      instances: [],
      results: [
        { instance_id: "t-1", status: "resolved", elapsed_ms: 12500, predictions: [], references: [] },
      ],
      summary: {
        total: 1,
        resolved: 1,
        resolved_rate: 1,
        avg_elapsed_ms: 12500,
        by_repo: {},
      },
    };

    const md = formatMarkdown(report);

    expect(md).toContain("| Avg elapsed | 12.5s |");
  });

  it("should list all repositories in by_repo section", () => {
    const report: FullReport = {
      generated_at: "2026-04-09T00:00:00.000Z",
      instances: [],
      results: [],
      summary: {
        total: 3,
        resolved: 1,
        resolved_rate: 1 / 3,
        avg_elapsed_ms: 3000,
        by_repo: {
          "django__django": { total: 2, resolved: 1, resolved_rate: 0.5 },
          "pallets__flask": { total: 1, resolved: 0, resolved_rate: 0 },
        },
      },
    };

    const md = formatMarkdown(report);

    expect(md).toContain("**django__django**: 1/2 (50.0%)");
    expect(md).toContain("**pallets__flask**: 0/1 (0.0%)");
  });

  it("should handle zero total with no crash", () => {
    const report: FullReport = {
      generated_at: "2026-04-09T00:00:00.000Z",
      instances: [],
      results: [],
      summary: {
        total: 0,
        resolved: 0,
        resolved_rate: 0,
        avg_elapsed_ms: 0,
        by_repo: {},
      },
    };

    const md = formatMarkdown(report);

    expect(md).toContain("| Total instances | 0 |");
    expect(md).toContain("| Resolution rate | 0.0% |");
    expect(md).toContain("| Avg elapsed | 0.0s |");
  });
});
