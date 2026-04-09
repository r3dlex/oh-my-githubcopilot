/**
 * SWE-bench Runner
 * Orchestrates benchmark execution across instances.
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { runAll, type BenchmarkInstance, type HarnessResult } from "./harness.mjs";
import { formatDuration } from "../utils/timer.mjs";

export interface RunnerConfig {
  instances_file: string;
  output_dir: string;
  max_parallel: number;
  timeout_ms: number;
}

export interface RunnerReport {
  total: number;
  resolved: number;
  failed: number;
  timeout: number;
  error: number;
  total_time_ms: number;
  results: HarnessResult[];
}

/**
 * Run the benchmark suite.
 */
export async function runBenchmarks(config: RunnerConfig): Promise<RunnerReport> {
  const start = Date.now();
  let instances: BenchmarkInstance[] = [];

  try {
    const content = readFileSync(config.instances_file, "utf-8");
    instances = JSON.parse(content);
  } catch {
    return {
      total: 0,
      resolved: 0,
      failed: 0,
      timeout: 0,
      error: 0,
      total_time_ms: Date.now() - start,
      results: [],
    };
  }

  const results = await runAll(config.instances_file, {
    output_dir: config.output_dir,
    timeout_ms: config.timeout_ms,
  });

  const report: RunnerReport = {
    total: instances.length,
    resolved: results.filter((r) => r.status === "resolved").length,
    failed: results.filter((r) => r.status === "failed").length,
    timeout: results.filter((r) => r.status === "timeout").length,
    error: results.filter((r) => r.status === "error").length,
    total_time_ms: Date.now() - start,
    results,
  };

  const reportFile = join(config.output_dir, "report.json");
  writeFileSync(reportFile, JSON.stringify(report, null, 2), "utf-8");

  return report;
}

/**
 * Print a summary of the benchmark results.
 */
export function printReport(report: RunnerReport): void {
  const total_time = formatDuration(report.total_time_ms);
  const resolved_pct = report.total > 0
    ? ((report.resolved / report.total) * 100).toFixed(1)
    : "0.0";

  const lines = [
    `=== SWE-bench Results ===`,
    `Total:     ${report.total}`,
    `Resolved:  ${report.resolved} (${resolved_pct}%)`,
    `Failed:    ${report.failed}`,
    `Timeout:   ${report.timeout}`,
    `Error:     ${report.error}`,
    `Time:      ${total_time}`,
  ];

  process.stdout.write(`${lines.join("\n")}\n`);
}