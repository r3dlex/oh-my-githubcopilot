import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { errorResponse } from "../utils.js";
import { detectExternalSessions, importExternalSession, compareCheckpoints } from "./index.js";

export function registerBridgeTools(server: McpServer): void {
  server.tool(
    "omg_detect_external_session",
    "Detect Claude Code or OMC sessions in the current workspace. Returns metadata about available external sessions that can be imported. Use this at session start to check if work can be resumed from another tool.",
    {},
    async () => {
      try {
        const sessions = detectExternalSessions();
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                found: sessions.length,
                sessions,
              }),
            },
          ],
        };
      } catch (err) {
        return errorResponse((err as Error).message);
      }
    },
  );

  server.tool(
    "omg_import_external_session",
    "Import an external session (Claude Code or OMC) into OMG checkpoint format. Backs up existing checkpoint before overwriting. Use after omg_detect_external_session confirms an available session.",
    {
      source: z.enum(["omc", "claude-code"]).describe("Which external tool to import from"),
      force: z.boolean().optional().describe("Force import even if OMG checkpoint is newer (default: false)"),
    },
    async ({ source, force }) => {
      try {
        const result = importExternalSession(source, { force: force ?? false });
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                success: true,
                source: result.source,
                imported_files: result.imported_files.length,
                conflicts: result.conflicts.length,
                session_id: result.session_id,
                summary: result.summary,
              }),
            },
          ],
        };
      } catch (err) {
        return errorResponse((err as Error).message);
      }
    },
  );

  server.tool(
    "omg_compare_checkpoints",
    "Compare timestamps between the current OMG checkpoint and any external sessions (Claude Code, OMC). Helps decide whether to import.",
    {},
    async () => {
      try {
        const comparison = compareCheckpoints();
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(comparison),
            },
          ],
        };
      } catch (err) {
        return errorResponse((err as Error).message);
      }
    },
  );
}
