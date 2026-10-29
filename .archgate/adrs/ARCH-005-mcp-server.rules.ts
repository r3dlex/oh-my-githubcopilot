/// <reference path="../rules.d.ts" />

/**
 * ARCH-005 — MCP Server via @modelcontextprotocol/sdk
 *
 * Enforces the ADR's Rules section:
 *   - the MCP server must be built on `@modelcontextprotocol/sdk`'s `Server`
 *   - `.mcp.json` must reference `dist/mcp/server.mjs` (never `.js`)
 */

const MCP_SERVER_SOURCE = "src/mcp/server.mts";
const MCP_CONFIG = ".mcp.json";

interface McpServerEntry {
  args?: string[];
}

function serverEntries(config: unknown): McpServerEntry[] {
  if (typeof config !== "object" || config === null) return [];
  const servers = (config as { mcpServers?: unknown }).mcpServers;
  if (typeof servers !== "object" || servers === null) return [];
  return Object.values(servers as Record<string, unknown>).filter(
    (entry): entry is McpServerEntry =>
      typeof entry === "object" && entry !== null
  );
}

export default {
  rules: {
    "mcp-server-uses-sdk-server": {
      description:
        "The MCP server must be built on @modelcontextprotocol/sdk's Server class",
      severity: "error",
      async check(ctx) {
        const sources = await ctx.glob(MCP_SERVER_SOURCE);
        if (sources.length === 0) {
          ctx.report.violation({
            message: `${MCP_SERVER_SOURCE} not found — ARCH-005 requires the MCP server entry point.`,
            file: MCP_SERVER_SOURCE,
          });
          return;
        }

        for (const source of sources) {
          const sdkImports = await ctx.grep(
            source,
            /from\s+["']@modelcontextprotocol\/sdk\/server\/index\.js["']/u
          );
          if (sdkImports.length === 0) {
            ctx.report.violation({
              message:
                "MCP server must import `Server` from @modelcontextprotocol/sdk/server/index.js",
              file: source,
            });
          }

          const constructions = await ctx.grep(source, /new\s+Server\s*\(/u);
          if (constructions.length === 0) {
            ctx.report.violation({
              message:
                "MCP server must construct a `Server` instance from @modelcontextprotocol/sdk",
              file: source,
            });
          }
        }
      },
    },

    "mcp-json-registers-dist-mjs": {
      description:
        ".mcp.json must register the MCP server as dist/mcp/server.mjs (the ESM build output), never dist/mcp/server.js",
      severity: "error",
      async check(ctx) {
        const configs = await ctx.glob(MCP_CONFIG);
        if (configs.length === 0) {
          ctx.report.violation({
            message: `${MCP_CONFIG} not found — ARCH-005 requires the MCP server to be registered.`,
            file: MCP_CONFIG,
          });
          return;
        }

        for (const config of configs) {
          const entries = serverEntries(await ctx.readJSON(config));

          for (const entry of entries) {
            for (const arg of entry.args ?? []) {
              if (/dist\/mcp\/server\.js$/u.test(arg)) {
                ctx.report.violation({
                  message:
                    "MCP server must be registered as dist/mcp/server.mjs (ESM), not dist/mcp/server.js",
                  file: config,
                  fix: "Point the args entry at ./dist/mcp/server.mjs",
                });
              }
            }
          }

          const registered = entries.some((entry) =>
            (entry.args ?? []).some((arg) =>
              /dist\/mcp\/server\.mjs$/u.test(arg)
            )
          );
          if (!registered) {
            ctx.report.violation({
              message:
                "No MCP server entry registers dist/mcp/server.mjs — ARCH-005 requires the built server to be registered.",
              file: config,
              fix: "Add an mcpServers entry whose args reference ./dist/mcp/server.mjs",
            });
          }
        }
      },
    },
  },
} satisfies RuleSet;
