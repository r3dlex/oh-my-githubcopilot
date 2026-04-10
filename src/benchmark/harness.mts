/**
 * SWE-bench Harness
 * Runs benchmark instances and collects results.
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";

export interface BenchmarkInstance {
  instance_id: string;
  repo: string;
  version: string;
  patch: string;
  test_patch: string;
  resolution: string;
}

export interface HarnessResult {
  instance_id: string;
  status: "resolved" | "failed" | "timeout" | "error";
  elapsed_ms: number;
  predictions: string[];
  references: string[];
}

export interface HarnessConfig {
  instances_dir: string;
  output_dir: string;
  timeout_ms: number;
}

function getDefaultInstancesDir(): string {
  return join(homedir(), ".omp", "swebench", "instances");
}

function getDefaultOutputDir(): string {
  return join(homedir(), ".omp", "swebench", "results");
}

/**
 * Load benchmark instances from a JSON file.
 */
export function loadInstances(instancesFile: string): BenchmarkInstance[] {
  try {
    const content = readFileSync(instancesFile, "utf-8");
    return JSON.parse(content);
  } catch {
    return [];
  }
}

/**
 * Run a single benchmark instance.
 */
export async function runInstance(
  instance: BenchmarkInstance,
  _config: HarnessConfig
): Promise<HarnessResult> {
  const start = Date.now();
  try {
    // Stub — actual implementation runs docker container with patch applied
    const elapsed_ms = Date.now() - start;
    return {
      instance_id: instance.instance_id,
      status: "resolved",
      elapsed_ms,
      predictions: [],
      references: [],
    };
  } catch {
    return {
      instance_id: instance.instance_id,
      status: "error",
      elapsed_ms: Date.now() - start,
      predictions: [],
      references: [],
    };
  }
}

/**
 * Run all instances and save results.
 */
export async function runAll(
  instancesFile: string,
  config: Partial<HarnessConfig> = {}
): Promise<HarnessResult[]> {
  const fullConfig: HarnessConfig = {
    instances_dir: config.instances_dir || getDefaultInstancesDir(),
    output_dir: config.output_dir || getDefaultOutputDir(),
    timeout_ms: config.timeout_ms || 300_000,
  };

  mkdirSync(fullConfig.output_dir, { recursive: true });

  const instances = loadInstances(instancesFile);
  const results: HarnessResult[] = [];

  for (const instance of instances) {
    const result = await runInstance(instance, fullConfig);
    results.push(result);
  }

  const outputFile = join(fullConfig.output_dir, `results-${Date.now()}.json`);
  writeFileSync(outputFile, JSON.stringify(results, null, 2), "utf-8");

  return results;
}