import * as fs from "node:fs";
import * as path from "node:path";
import { getWorkspaceRoot, ensureDir, safeReadFile, safeWriteFile } from "../utils.js";
import { getStateDir } from "../state-tools.js";
import { detectOmcSession, importOmcSession, type ImportResult } from "./omc-importer.js";
import { detectClaudeSession, importClaudeSession } from "./claude-jsonl-importer.js";

export type { ImportResult } from "./omc-importer.js";

export interface DetectedSession {
  source: "omc" | "claude-code";
  exists: boolean;
  mtime: string | null;
  session_id: string | null;
  details: string;
}

/**
 * Detect all external sessions (OMC + Claude Code) for the current workspace.
 */
export function detectExternalSessions(workspaceRoot?: string): DetectedSession[] {
  const root = workspaceRoot ?? getWorkspaceRoot();
  const sessions: DetectedSession[] = [];

  // Check OMC
  const omc = detectOmcSession(root);
  if (omc.exists) {
    sessions.push({
      source: "omc",
      exists: true,
      mtime: omc.mtime,
      session_id: null,
      details: omc.details,
    });
  }

  // Check Claude Code
  const claude = detectClaudeSession(root);
  if (claude.exists) {
    sessions.push({
      source: "claude-code",
      exists: true,
      mtime: claude.mtime,
      session_id: claude.session_id,
      details: claude.details,
    });
  }

  return sessions;
}

/**
 * Import an external session and write to OMG checkpoint format.
 * Backs up existing checkpoint before overwriting.
 */
export function importExternalSession(
  source: "omc" | "claude-code",
  options: { force?: boolean; workspaceRoot?: string } = {},
): ImportResult {
  const root = options.workspaceRoot ?? getWorkspaceRoot();
  const force = options.force ?? false;

  let result: ImportResult;

  if (source === "omc") {
    result = importOmcSession(root, force);
  } else {
    result = importClaudeSession(root);
  }

  // If import found anything, write checkpoint with source metadata
  if (result.imported_files.length > 0 || result.session_id) {
    const stateDir = getStateDir();
    ensureDir(stateDir);

    const checkpointPath = path.join(stateDir, "session-checkpoint.json");

    // Backup existing checkpoint
    if (fs.existsSync(checkpointPath)) {
      const backupPath = path.join(stateDir, "session-checkpoint.previous.json");
      fs.copyFileSync(checkpointPath, backupPath);
    }

    const checkpoint = {
      timestamp: new Date().toISOString(),
      summary: result.summary,
      key_decisions: [],
      active_modes: [] as Array<{ mode: string; state: Record<string, unknown> }>,
      recent_memory: [] as Array<{ key: string; value: string; category: string }>,
      modified_files: result.imported_files,
      context_bytes_estimate: 0,
      estimated_tokens: 0,
      source_tool: result.source,
      source_session_id: result.session_id,
      imported_at: new Date().toISOString(),
      imported_summary: result.summary,
    };

    // For OMC imports, also carry over active modes from imported state files
    if (source === "omc") {
      const importedStateDir = path.join(root, ".omg", "state");
      if (fs.existsSync(importedStateDir)) {
        const stateFiles = fs.readdirSync(importedStateDir).filter((f) =>
          f.endsWith("-state.json") && !f.includes("session-checkpoint"),
        );
        for (const sf of stateFiles) {
          const raw = safeReadFile(path.join(importedStateDir, sf));
          if (!raw) continue;
          try {
            const data = JSON.parse(raw);
            if (data.active) {
              checkpoint.active_modes.push({
                mode: sf.replace("-state.json", ""),
                state: data,
              });
            }
          } catch { /* skip malformed */ }
        }
      }
    }

    const content = JSON.stringify(checkpoint, null, 2);
    safeWriteFile(checkpointPath, content);

    // Set file permissions to 0600 (owner read/write only) for sensitive data
    try {
      fs.chmodSync(checkpointPath, 0o600);
    } catch { /* chmod may fail on some systems, non-critical */ }
  }

  return result;
}

/**
 * Compare current OMG checkpoint timestamp with external source timestamps.
 */
export function compareCheckpoints(workspaceRoot?: string): {
  omg: { exists: boolean; timestamp: string | null };
  external: Array<{ source: string; timestamp: string | null; newer_than_omg: boolean }>;
} {
  const root = workspaceRoot ?? getWorkspaceRoot();
  const stateDir = path.join(root, ".omg", "state");
  const checkpointPath = path.join(stateDir, "session-checkpoint.json");

  let omgTimestamp: string | null = null;
  if (fs.existsSync(checkpointPath)) {
    const raw = safeReadFile(checkpointPath);
    if (raw) {
      try {
        const data = JSON.parse(raw);
        omgTimestamp = data.timestamp ?? null;
      } catch { /* ignore */ }
    }
  }

  const sessions = detectExternalSessions(root);
  const external = sessions.map((s) => ({
    source: s.source,
    timestamp: s.mtime,
    newer_than_omg: !omgTimestamp || !s.mtime
      ? !!s.mtime
      : new Date(s.mtime).getTime() > new Date(omgTimestamp).getTime(),
  }));

  return {
    omg: { exists: !!omgTimestamp, timestamp: omgTimestamp },
    external,
  };
}
