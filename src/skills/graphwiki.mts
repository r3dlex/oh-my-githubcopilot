/**
 * graphwiki skill
 *
 * ID:       graphwiki
 * Keywords: graphwiki:, /graphwiki
 * Tier:     developer tool
 *
 * Direct access to graphwiki CLI features: query, path, lint, refine, build, status, clean.
 * graphwiki is a TypeScript/npm tool: npm install -g graphwiki
 */

import { GraphwikiAdapter } from "../graph/graphwiki-adapter.mjs";

export interface SkillInput {
  trigger: string;
  args: string[];
}

export interface SkillOutput {
  status: "ok" | "error";
  message: string;
}

export async function activate(input: SkillInput): Promise<SkillOutput> {
  const [action, ...rest] = input.args;
  const ws = process.cwd();

  try {
    const adapter = new GraphwikiAdapter();

    switch (action) {
      case "query": {
        const question = rest.join(" ");
        if (!question) {
          return { status: "error", message: "Usage: graphwiki: query <question>" };
        }
        const answer = adapter.query(ws, question);
        return { status: "ok", message: answer || "(no output)" };
      }

      case "path": {
        const [from, to] = rest;
        if (!from || !to) {
          return { status: "error", message: "Usage: graphwiki: path <from> <to>" };
        }
        const result = adapter.path(ws, from, to);
        return { status: "ok", message: result || "(no path found)" };
      }

      case "lint": {
        const result = adapter.lint(ws);
        if (result.clean) {
          return { status: "ok", message: "No lint issues found." };
        }
        return {
          status: "ok",
          message: `Lint issues (${result.issues.length}):\n${result.issues.join("\n")}`,
        };
      }

      case "refine": {
        const review = rest.includes("--review");
        const result = adapter.refine(ws, review);
        return { status: "ok", message: result || "(no output)" };
      }

      case "build": {
        const incremental = rest.includes("--update");
        const result = adapter.build(ws, incremental);
        if (!result.success) {
          return { status: "error", message: `graphwiki build failed: ${result.error}` };
        }
        return { status: "ok", message: `Graph built. Output: ${result.outputPath}` };
      }

      case "status": {
        const result = adapter.status(ws);
        if (!result.exists) {
          return { status: "ok", message: "No graph found. Run: graphwiki: build" };
        }
        return {
          status: "ok",
          message: `Graph exists at ${result.outputPath}\nReport: ${result.reportPath}`,
        };
      }

      case "clean": {
        adapter.clean(ws);
        return { status: "ok", message: "graphwiki-out/ directory removed." };
      }

      default:
        return {
          status: "error",
          message: "Usage: graphwiki: <query|path|lint|refine|build|status|clean>",
        };
    }
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
