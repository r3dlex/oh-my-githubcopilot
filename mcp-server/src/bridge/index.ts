import * as fs from "node:fs";
import * as path from "node:path";
import { getWorkspaceRoot, ensureDir, safeReadFile, safeWriteFile } from "../utils.js";
import { getStateDir } from "../state-tools.js";
import { detectOmcSession, importOmcSession, type ImportResult } from "./omc-importer.js";
import { detectClaudeSession, importClaudeSession } from "./claude-jsonl-importer.js";
import {
  detectOmgSession,
  exportOmgSession,
  recordExportToken,
  type ExportResult,
} from "./omg-exporter.js";
import { rotateBackup, type SourceOrigin } from "./conflict-utils.js";

export type { ImportResult } from "./omc-importer.js";
export type { ExportResult } from "./omg-exporter.js";

export interface DetectedSession {
  source: "omc" | "claude-code" | "omg";
  exists: boolean;
  mtime: string | null;
  session_id: string | null;
  details: string;
  has_checkpoint?: boolean;
}

/**
 * Detect all sessions for the current workspace — external (OMC + Claude Code) and
 * the local OMG itself (so the new /push-omc skill can show what would be exported).
 */
export function detectExternalSessions(workspaceRoot?: string): DetectedSession[] {
  const root = workspaceRoot ?? getWorkspaceRoot();
  const sessions: DetectedSession[] = [];

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

  const omg = detectOmgSession(root);
  if (omg.exists) {
    sessions.push({
      source: "omg",
      exists: true,
      mtime: omg.mtime,
      session_id: null,
      details: omg.details,
      has_checkpoint: omg.has_checkpoint,
    });
  }

  return sessions;
}

/**
 * Import an external session and write to OMG checkpoint format.
 * Backs up existing checkpoint via rotating snapshots before overwriting.
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

  // Skip downstream checkpoint composition if a guard fired.
  if (result.loop_blocked || result.workspace_mismatch) return result;

  if (result.imported_files.length > 0 || result.session_id) {
    const stateDir = getStateDir();
    ensureDir(stateDir);

    const checkpointPath = path.join(stateDir, "session-checkpoint.json");

    // AC-10b: OMG-side checkpoint backup uses rotateBackup (was single-slot prior to v1.4.3).
    if (fs.existsSync(checkpointPath)) {
      rotateBackup(checkpointPath, 3);
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
      source_tool: "copilot" as const,
      source_origin: (source === "omc" ? "bridged-from-omc" : "bridged-from-claude-code") as SourceOrigin,
      source_session_id: result.session_id,
      imported_at: new Date().toISOString(),
      imported_summary: result.summary,
      workspace_root: root,
    };

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

    try {
      fs.chmodSync(checkpointPath, 0o600);
    } catch { /* chmod may fail on some systems, non-critical */ }
  }

  return result;
}

/**
 * Export the local OMG session to an external target (currently `omc`).
 *
 * Atomicity (AC-22b): writes the export token AS THE LAST SIDE-EFFECT only when
 * `exportOmgSession` returns success. A partial-write failure leaves no token,
 * so subsequent operations correctly treat the transaction as uncommitted.
 */
export function exportExternalSession(
  target: "omc",
  options: { force?: boolean; workspaceRoot?: string } = {},
): ExportResult {
  const root = options.workspaceRoot ?? getWorkspaceRoot();
  const force = options.force ?? false;

  if (target !== "omc") {
    throw new Error(`Unsupported export target: ${target}`);
  }

  const result = exportOmgSession(root, force);

  if (result.success && result.session_id) {
    recordExportToken(root, result.session_id);
  }

  return result;
}

/**
 * Compare timestamps between the current OMG checkpoint and any external sessions.
 * Reports BOTH directions: external_newer_than_omg AND omg_newer_than_external.
 */
export function compareCheckpoints(workspaceRoot?: string): {
  omg: { exists: boolean; timestamp: string | null };
  external: Array<{
    source: string;
    timestamp: string | null;
    newer_than_omg: boolean;
    omg_newer_than_external: boolean;
  }>;
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

  const sessions = detectExternalSessions(root).filter((s) => s.source !== "omg");

  const external = sessions.map((s) => {
    const extTime = s.mtime ? new Date(s.mtime).getTime() : null;
    const omgTime = omgTimestamp ? new Date(omgTimestamp).getTime() : null;
    const newer_than_omg =
      extTime !== null && (omgTime === null || extTime > omgTime);
    const omg_newer_than_external =
      omgTime !== null && extTime !== null && omgTime > extTime;
    return {
      source: s.source,
      timestamp: s.mtime,
      newer_than_omg,
      omg_newer_than_external,
    };
  });

  return {
    omg: { exists: !!omgTimestamp, timestamp: omgTimestamp },
    external,
  };
}
