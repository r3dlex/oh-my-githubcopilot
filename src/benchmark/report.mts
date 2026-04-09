/**
 * SWE-bench Report Generator
 * Formats benchmark results as reports.
 */

import type { HarnessResult, BenchmarkInstance } from "./harness.mjs";

export interface ReportSection {
  title: string;
  body: string;
}

export interface FullReport {
  generated_at: string;
  instances: BenchmarkInstance[];
  results: HarnessResult[];
  summary: ReportSummary;
}

export interface ReportSummary {
  total: number;
  resolved: number;
  resolved_rate: number;
  avg_elapsed_ms: number;
  by_repo: Record<string, RepoStats>;
}

export interface RepoStats {
  total: number;
  resolved: number;
  resolved_rate: number;
}

/**
 * Generate a full report from benchmark results.
 */
export function generateReport(
  instances: BenchmarkInstance[],
  results: HarnessResult[]
): FullReport {
  const now = new Date().toISOString();

  const by_repo: Record<string, RepoStats> = {};
  let total_elapsed = 0;

  for (const result of results) {
    total_elapsed += result.elapsed_ms;
    const instance = instances.find((i) => i.instance_id === result.instance_id);
    const repo = instance?.repo ?? "unknown";
    if (!by_repo[repo]) {
      by_repo[repo] = { total: 0, resolved: 0, resolved_rate: 0 };
    }
    by_repo[repo].total++;
    if (result.status === "resolved") {
      by_repo[repo].resolved++;
    }
  }

  for (const repo of Object.keys(by_repo)) {
    const stats = by_repo[repo];
    stats.resolved_rate = stats.total > 0 ? stats.resolved / stats.total : 0;
  }

  return {
    generated_at: now,
    instances,
    results,
    summary: {
      total: results.length,
      resolved: results.filter((r) => r.status === "resolved").length,
      resolved_rate: results.length > 0
        ? results.filter((r) => r.status === "resolved").length / results.length
        : 0,
      avg_elapsed_ms: results.length > 0 ? total_elapsed / results.length : 0,
      by_repo,
    },
  };
}

/**
 * Format a report as markdown.
 */
export function formatMarkdown(report: FullReport): string {
  const lines: string[] = [
    "# SWE-bench Results",
    "",
    `Generated: ${report.generated_at}`,
    "",
    "## Summary",
    "",
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Total instances | ${report.summary.total} |`,
    `| Resolved | ${report.summary.resolved} |`,
    `| Resolution rate | ${(report.summary.resolved_rate * 100).toFixed(1)}% |`,
    `| Avg elapsed | ${(report.summary.avg_elapsed_ms / 1000).toFixed(1)}s |`,
    "",
    "## By Repository",
    "",
  ];

  for (const [repo, stats] of Object.entries(report.summary.by_repo)) {
    lines.push(`- **${repo}**: ${stats.resolved}/${stats.total} (${(stats.resolved_rate * 100).toFixed(1)}%)`);
  }

  return lines.join("\n");
}