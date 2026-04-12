/**
 * graphify skill
 *
 * ID:       graphify
 * Keywords: graph:, /omp:graphify, graph build, build graph
 * Tier:     developer tool
 *
 * Build and manage a knowledge graph of the codebase using the graphify CLI.
 * Delegates CLI logic to GraphifyAdapter in src/graph/graphify-adapter.mts.
 */

import { GraphifyAdapter } from "../graph/graphify-adapter.mjs";
import type { GraphifyBuildResult, GraphifyStatusResult } from "../graph/graphify-adapter.mjs";

export interface SkillInput {
  trigger: string;
  args: string[];
}

export interface SkillOutput {
  status: "ok" | "error";
  message: string;
}

// Re-export types for backward compatibility
export type BuildResult = GraphifyBuildResult;
export type StatusResult = GraphifyStatusResult;

const _adapter = new GraphifyAdapter();

export function build(workspacePath: string, incremental = false): GraphifyBuildResult {
  return _adapter.build(workspacePath, incremental);
}

export function status(workspacePath: string): GraphifyStatusResult {
  return _adapter.detailedStatus(workspacePath);
}

export function clean(workspacePath: string): void {
  return _adapter.clean(workspacePath);
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
