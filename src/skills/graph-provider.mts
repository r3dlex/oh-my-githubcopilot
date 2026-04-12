/**
 * graph-provider skill
 *
 * ID:       graph-provider
 * Keywords: graph:, /graph-provider
 * Tier:     developer tool
 *
 * Manage and use the active graph provider (graphify or graphwiki).
 * Delegates to whichever adapter is active in the registry.
 */

import { getProvider, setProvider, listProviders } from "../graph/registry.mjs";
import { loadConfig } from "../utils/config.mjs";

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
    switch (action) {
      case "get": {
        // Read from shared .omp/config.json under the "graph.provider" key
        const configId =
          loadConfig<{ graph: { provider: string } }>("graph")?.graph?.provider ?? "graphwiki";
        return { status: "ok", message: `Active graph provider: ${configId}` };
      }

      case "set": {
        const id = rest[0];
        if (!id) {
          return {
            status: "error",
            message: `Usage: graph: set <provider>\nAvailable: ${listProviders().join(", ")}`,
          };
        }
        setProvider(id);
        return { status: "ok", message: `Graph provider set to: ${id}` };
      }

      case "list": {
        return { status: "ok", message: `Available providers: ${listProviders().join(", ")}` };
      }

      case "build": {
        const incremental = rest.includes("--incremental");
        const provider = getProvider();
        const result = provider.build(ws, incremental);
        if (!result.success) {
          return { status: "error", message: `Build failed: ${result.error}` };
        }
        return { status: "ok", message: `Graph built via ${provider.id}. Output: ${result.outputPath}` };
      }

      case "status": {
        const provider = getProvider();
        const result = provider.status(ws);
        if (!result.exists) {
          return { status: "ok", message: `No graph found (provider: ${provider.id}). Run: graph: build` };
        }
        return {
          status: "ok",
          message: `Graph exists (provider: ${provider.id})\nOutput: ${result.outputPath}\nReport: ${result.reportPath}`,
        };
      }

      case "clean": {
        const provider = getProvider();
        provider.clean(ws);
        return { status: "ok", message: `${provider.outputDir}/ directory removed.` };
      }

      case "query": {
        const question = rest.join(" ");
        if (!question) {
          return { status: "error", message: "Usage: graph: query <question>" };
        }
        const provider = getProvider();
        // Duck-type guard — GraphWikiClient has a query method; interfaces don't exist at runtime
        if (!("query" in provider)) {
          return {
            status: "error",
            message: `Provider "${provider.id}" does not support query. Switch to graphwiki: graph: set graphwiki`,
          };
        }
        const wikiClient = provider as { query: (ws: string, q: string) => string };
        const answer = wikiClient.query(ws, question);
        return { status: "ok", message: answer || "(no output)" };
      }

      default:
        return {
          status: "error",
          message: "Usage: graph: <get|set <id>|list|build|status|clean|query <question>>",
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
