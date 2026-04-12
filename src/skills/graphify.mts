/**
 * graphify skill
 *
 * ID:       graphify
 * Keywords: graph:, /omp:graphify, graph build, build graph
 * Tier:     developer tool
 *
 * Build and manage a knowledge graph of the codebase using the graphify CLI.
 */

import { existsSync, statSync, rmSync, readFileSync } from "fs";
import { join } from "path";
import { spawnSync } from "child_process";

export interface SkillInput {
  trigger: string;
  args: string[];
}

export interface SkillOutput {
  status: "ok" | "error";
  message: string;
}

export interface BuildResult {
  nodeCount: number;
  edgeCount: number;
  communityCount: number;
  outputPath: string;
}

export interface StatusResult {
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

export function build(workspacePath: string, incremental = false): BuildResult {
  const cli = findGraphify();
  if (!cli) {
    throw new Error(
      "graphify CLI not found. Install it with: pip install graphify"
    );
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
  return {
    nodeCount: Array.isArray(raw.nodes) ? raw.nodes.length : (raw.nodeCount ?? 0),
    edgeCount: Array.isArray(raw.edges) ? raw.edges.length : (raw.edgeCount ?? 0),
    communityCount: Array.isArray(raw.communities) ? raw.communities.length : (raw.communityCount ?? 0),
    outputPath,
  };
}

export function status(workspacePath: string): StatusResult {
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

export function clean(workspacePath: string): void {
  const dir = join(workspacePath, "graphify-out");
  rmSync(dir, { recursive: true, force: true });
}

export async function activate(input: SkillInput): Promise<SkillOutput> {
  const [action, ...rest] = input.args;

  try {
    if (action === "status") {
      const result = status(process.cwd());
      if (!result.exists) {
        return { status: "ok", message: "No graph found. Run: /omp:graphify build" };
      }
      const kb = ((result.sizeBytes ?? 0) / 1024).toFixed(1);
      return {
        status: "ok",
        message: `Graph exists at ${result.path}\nSize: ${kb} KB\nLast modified: ${result.lastModified?.toISOString()}`,
      };
    }

    if (action === "clean") {
      clean(process.cwd());
      return { status: "ok", message: "graphify-out/ directory removed." };
    }

    // default: build
    const incremental = rest.includes("--incremental");
    const result = build(process.cwd(), incremental);
    return {
      status: "ok",
      message: `Graph built successfully.\nNodes: ${result.nodeCount}\nEdges: ${result.edgeCount}\nCommunities: ${result.communityCount}\nOutput: ${result.outputPath}`,
    };
  } catch (err) {
    return {
      status: "error",
      message: err instanceof Error ? err.message : String(err),
    };
  }
}

export function deactivate(): void {
  // No persistent resources to clean up
}
