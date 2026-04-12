/**
 * Graphify adapter — wraps the graphify Python CLI.
 * Implements GraphBuildable using spawnSync (synchronous, consistent with
 * the existing graphify skill pattern).
 *
 * GraphifyBuildResult extends BuildResult with provider-specific graph data
 * (nodeCount, edgeCount, communityCount) so callers can format rich output.
 */

import { existsSync, statSync, rmSync, readFileSync } from "fs";
import { join } from "path";
import { spawnSync } from "child_process";
import type { GraphBuildable, BuildResult, StatusResult } from "./types.mjs";

export interface GraphifyBuildResult extends BuildResult {
  nodeCount: number;
  edgeCount: number;
  communityCount: number;
}

export interface GraphifyStatusResult {
  exists: boolean;
  path?: string;
  sizeBytes?: number;
  lastModified?: Date;
}

function findGraphify(): string | null {
  const which = spawnSync("which", ["graphify"], { encoding: "utf8" });
  if (which.status === 0 && which.stdout.trim()) {
    return which.stdout.trim();
  }
  const pyCheck = spawnSync("python3", ["-m", "graphify", "--version"], { encoding: "utf8" });
  if (pyCheck.status === 0) {
    return "python3 -m graphify";
  }
  return null;
}

export class GraphifyAdapter implements GraphBuildable {
  readonly id = "graphify";
  readonly name = "Graphify";
  readonly outputDir = "graphify-out";

  build(workspacePath: string, incremental = false): GraphifyBuildResult {
    const cli = findGraphify();
    if (!cli) {
      throw new Error("graphify CLI not found. Install it with: pip install graphify");
    }

    const args = cli.startsWith("python3")
      ? ["-m", "graphify", "build", workspacePath]
      : ["build", workspacePath];
    if (incremental) args.push("--incremental");

    const cmd = cli.startsWith("python3") ? "python3" : cli;
    const result = spawnSync(cmd, args, {
      encoding: "utf8",
      cwd: workspacePath,
    });

    if (result.status !== 0) {
      throw new Error(
        `graphify build failed: ${result.stderr || result.stdout || "unknown error"}`
      );
    }

    const outputPath = join(workspacePath, "graphify-out", "graph.json");
    if (!existsSync(outputPath)) {
      throw new Error(`graphify ran but output not found at ${outputPath}`);
    }

    const raw = JSON.parse(readFileSync(outputPath, "utf8"));
    const nodeCount = Array.isArray(raw.nodes) ? raw.nodes.length : (raw.nodeCount ?? 0);
    const edgeCount = Array.isArray(raw.edges) ? raw.edges.length : (raw.edgeCount ?? 0);
    const communityCount = Array.isArray(raw.communities) ? raw.communities.length : (raw.communityCount ?? 0);

    return {
      success: true,
      outputPath,
      nodeCount,
      edgeCount,
      communityCount,
      data: { nodeCount, edgeCount, communityCount },
    };
  }

  exists(workspacePath: string): boolean {
    return existsSync(join(workspacePath, "graphify-out", "graph.json"));
  }

  getReportPath(workspacePath: string): string {
    return join(workspacePath, "graphify-out", "GRAPH_REPORT.md");
  }

  getGraphPath(workspacePath: string): string {
    return join(workspacePath, "graphify-out", "graph.json");
  }

  clean(workspacePath: string): void {
    rmSync(join(workspacePath, "graphify-out"), { recursive: true, force: true });
  }

  status(workspacePath: string): StatusResult {
    const outputPath = join(workspacePath, "graphify-out", "graph.json");
    const reportPath = this.getReportPath(workspacePath);
    return {
      exists: existsSync(outputPath),
      outputPath,
      reportPath,
    };
  }

  /**
   * Legacy status — returns richer graphify-specific data for the skill's
   * activate() formatting (size, lastModified).
   */
  detailedStatus(workspacePath: string): GraphifyStatusResult {
    const graphPath = join(workspacePath, "graphify-out", "graph.json");
    if (!existsSync(graphPath)) {
      return { exists: false };
    }
    const stat = statSync(graphPath);
    return {
      exists: true,
      path: graphPath,
      sizeBytes: stat.size,
      lastModified: stat.mtime,
    };
  }
}
