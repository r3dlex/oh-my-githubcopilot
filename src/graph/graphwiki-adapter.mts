/**
 * GraphWiki adapter — wraps the graphwiki TypeScript/npm CLI.
 * Implements GraphBuildable and GraphWikiClient using spawnSync.
 *
 * graphwiki is an npm package: npm install -g graphwiki
 * CLI commands: build, query, path, lint, status, refine
 */

import { existsSync, rmSync } from "fs";
import { join } from "path";
import { spawnSync } from "child_process";
import type { GraphBuildable, GraphWikiClient, BuildResult, StatusResult, LintResult } from "./types.mjs";

function requireGraphwikiCli(): void {
  const which = spawnSync("which", ["graphwiki"], { encoding: "utf8" });
  if (which.status !== 0 || !which.stdout.trim()) {
    throw new Error(
      "graphwiki CLI not found. Install with: npm install -g graphwiki"
    );
  }
}

export class GraphwikiAdapter implements GraphBuildable, GraphWikiClient {
  readonly id = "graphwiki";
  readonly name = "GraphWiki";
  readonly outputDir = "graphwiki-out";

  build(workspacePath: string, incremental = false): BuildResult {
    requireGraphwikiCli();
    const args = ["build", workspacePath];
    if (incremental) args.push("--update");
    const result = spawnSync("graphwiki", args, {
      cwd: workspacePath,
      encoding: "utf8",
    });
    if (result.status !== 0) {
      return {
        success: false,
        outputPath: this.getGraphPath(workspacePath),
        error: result.stderr || result.stdout || "graphwiki build failed",
      };
    }
    return {
      success: true,
      outputPath: this.getGraphPath(workspacePath),
    };
  }

  exists(workspacePath: string): boolean {
    return existsSync(join(workspacePath, "graphwiki-out", "graph.json"));
  }

  getReportPath(workspacePath: string): string {
    return join(workspacePath, "graphwiki-out", "GRAPH_REPORT.md");
  }

  getGraphPath(workspacePath: string): string {
    return join(workspacePath, "graphwiki-out", "graph.json");
  }

  clean(workspacePath: string): void {
    rmSync(join(workspacePath, "graphwiki-out"), { recursive: true, force: true });
  }

  status(workspacePath: string): StatusResult {
    const outputPath = this.getGraphPath(workspacePath);
    return {
      exists: this.exists(workspacePath),
      outputPath,
      reportPath: this.getReportPath(workspacePath),
    };
  }

  // GraphWikiClient methods

  query(workspacePath: string, question: string): string {
    requireGraphwikiCli();
    const result = spawnSync("graphwiki", ["query", question], {
      cwd: workspacePath,
      encoding: "utf8",
    });
    return result.stdout ?? "";
  }

  path(workspacePath: string, from: string, to: string): string {
    requireGraphwikiCli();
    const result = spawnSync("graphwiki", ["path", from, to], {
      cwd: workspacePath,
      encoding: "utf8",
    });
    return result.stdout ?? "";
  }

  lint(workspacePath: string): LintResult {
    requireGraphwikiCli();
    const result = spawnSync("graphwiki", ["lint"], {
      cwd: workspacePath,
      encoding: "utf8",
    });
    const output = result.stdout ?? "";
    const issues = output
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    return {
      issues,
      clean: result.status === 0 && issues.length === 0,
    };
  }

  refine(workspacePath: string, review = false): string {
    requireGraphwikiCli();
    const args = ["refine", ...(review ? ["--review"] : [])];
    const result = spawnSync("graphwiki", args, {
      cwd: workspacePath,
      encoding: "utf8",
    });
    return result.stdout ?? "";
  }
}
