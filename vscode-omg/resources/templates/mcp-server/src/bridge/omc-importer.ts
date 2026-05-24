import * as fs from "node:fs";
import * as path from "node:path";
import { safeReadFile, safeJsonParse, ensureDir } from "../utils.js";
import { rotateBackup, shouldSkipForConflict, type SourceOrigin } from "./conflict-utils.js";
import { readExportToken } from "./omg-exporter.js";

export interface ImportResult {
  source: "omc" | "claude-code";
  imported_files: string[];
  conflicts: string[];
  summary: string;
  session_id: string | null;
  timestamp: string;
  loop_blocked?: boolean;
  workspace_mismatch?: { expected: string; actual: string };
}

interface OmcCheckpoint {
  timestamp?: string;
  source_tool?: string;
  source_origin?: SourceOrigin;
  source_session_id?: string | null;
  workspace_root?: string;
}

function readCheckpoint(filePath: string): OmcCheckpoint | null {
  const raw = safeReadFile(filePath);
  if (!raw) return null;
  const parsed = safeJsonParse(raw);
  if (!parsed.ok) return null;
  return parsed.data as OmcCheckpoint;
}

/**
 * Loop-guard check (principle 4, AC-22, AC-23):
 * Returns true when the OMC source checkpoint represents a write that originated from
 * THIS OMG instance via the bridge — re-importing it would be a no-op ping-pong.
 *
 * Treats the OMC checkpoint as authoritative on collision (AC-22 final sentence).
 * Token without matching session_id is stale and ignored.
 */
function isLoopback(workspaceRoot: string, omcCheckpointPath: string): boolean {
  const dst = readCheckpoint(omcCheckpointPath);
  if (!dst) return false;

  if (dst.source_origin !== "bridged-from-omg") return false;
  if (typeof dst.source_session_id !== "string") return false;

  const token = readExportToken(workspaceRoot);
  if (!token) {
    // No token but checkpoint claims bridged-from-omg — still a loopback signal.
    return true;
  }

  return token.session_id === dst.source_session_id;
}

/**
 * Import OMC (.omc/) state into OMG (.omg/) format.
 * Schemas are nearly identical — direct file-level mapping with rotating-backup
 * conflict resolution.
 *
 * Round-trip safety (AC-22): if the OMC checkpoint is a bridged-from-omg artifact
 * matching our local export token, returns `loop_blocked: true` without mutating .omg/.
 *
 * Project-identity guard (AC-28): if the source checkpoint's `workspace_root` ≠ current,
 * abort with `workspace_mismatch` before any file mutation.
 */
export function importOmcSession(workspaceRoot: string, force: boolean = false): ImportResult {
  const omcDir = path.join(workspaceRoot, ".omc");
  const omgDir = path.join(workspaceRoot, ".omg");
  const omcCheckpointPath = path.join(omcDir, "state", "session-checkpoint.json");
  const importedFiles: string[] = [];
  const conflicts: string[] = [];

  // AC-22: loop guard. force=true bypasses (user explicitly asked to re-import).
  if (!force && isLoopback(workspaceRoot, omcCheckpointPath)) {
    return {
      source: "omc",
      imported_files: [],
      conflicts: [],
      summary: "loop_blocked — OMC checkpoint originated from this OMG export",
      session_id: null,
      timestamp: new Date().toISOString(),
      loop_blocked: true,
    };
  }

  // AC-28: project-identity guard.
  const omcCheckpoint = readCheckpoint(omcCheckpointPath);
  if (omcCheckpoint?.workspace_root) {
    const expected = omcCheckpoint.workspace_root;
    if (path.resolve(expected) !== path.resolve(workspaceRoot)) {
      return {
        source: "omc",
        imported_files: [],
        conflicts: [],
        summary: "workspace_mismatch — refusing to mutate .omg/",
        session_id: null,
        timestamp: new Date().toISOString(),
        workspace_mismatch: { expected, actual: workspaceRoot },
      };
    }
  }

  const fileMappings = [
    { omc: "prd.json", omg: "prd.json" },
    { omc: "project-memory.json", omg: "project-memory.json" },
  ];

  const omcStateDir = path.join(omcDir, "state");
  if (fs.existsSync(omcStateDir)) {
    const stateFiles = fs.readdirSync(omcStateDir).filter((f) => f.endsWith("-state.json"));
    for (const sf of stateFiles) {
      fileMappings.push({ omc: path.join("state", sf), omg: path.join("state", sf) });
    }

    const checkpointFile = "session-checkpoint.json";
    if (fs.existsSync(path.join(omcStateDir, checkpointFile))) {
      fileMappings.push({
        omc: path.join("state", checkpointFile),
        omg: path.join("state", checkpointFile),
      });
    }
  }

  for (const mapping of fileMappings) {
    const srcPath = path.join(omcDir, mapping.omc);
    const dstPath = path.join(omgDir, mapping.omg);

    if (!fs.existsSync(srcPath)) continue;

    const isCheckpoint = mapping.omg.endsWith("session-checkpoint.json");
    const decision = shouldSkipForConflict({
      srcPath,
      dstPath,
      force,
      useEmbeddedTimestamp: isCheckpoint,
    });
    if (decision.skip) {
      conflicts.push(mapping.omg);
      continue;
    }

    if (fs.existsSync(dstPath)) rotateBackup(dstPath, 3);
    ensureDir(path.dirname(dstPath));
    fs.copyFileSync(srcPath, dstPath);
    importedFiles.push(mapping.omg);
  }

  let summary = `Imported ${importedFiles.length} file(s) from OMC`;
  const prdPath = path.join(omcDir, "prd.json");
  if (fs.existsSync(prdPath)) {
    const raw = safeReadFile(prdPath);
    if (raw) {
      const parsed = safeJsonParse(raw);
      if (parsed.ok) {
        const title = (parsed.data as Record<string, unknown>).title;
        const stories = (parsed.data as Record<string, unknown>).stories;
        if (title) summary += ` — PRD: ${title}`;
        if (Array.isArray(stories)) {
          const done = stories.filter((s: Record<string, unknown>) => s.passes).length;
          summary += ` (${done}/${stories.length} stories done)`;
        }
      }
    }
  }

  let sessionId: string | null = null;
  if (fs.existsSync(omcCheckpointPath)) {
    const raw = safeReadFile(omcCheckpointPath);
    if (raw) {
      const parsed = safeJsonParse(raw);
      if (parsed.ok && (parsed.data as Record<string, unknown>).timestamp) {
        sessionId = `omc-${(parsed.data as Record<string, unknown>).timestamp}`;
      }
    }
  }

  let latestMtime = 0;
  for (const mapping of fileMappings) {
    const srcPath = path.join(omcDir, mapping.omc);
    if (fs.existsSync(srcPath)) {
      latestMtime = Math.max(latestMtime, fs.statSync(srcPath).mtimeMs);
    }
  }

  return {
    source: "omc",
    imported_files: importedFiles,
    conflicts,
    summary,
    session_id: sessionId,
    timestamp: latestMtime > 0 ? new Date(latestMtime).toISOString() : new Date().toISOString(),
  };
}

/**
 * Detect if an OMC workspace exists.
 */
export function detectOmcSession(workspaceRoot: string): { exists: boolean; mtime: string | null; details: string } {
  const omcDir = path.join(workspaceRoot, ".omc");
  if (!fs.existsSync(omcDir)) return { exists: false, mtime: null, details: "" };

  let latestMtime = 0;
  const items: string[] = [];

  if (fs.existsSync(path.join(omcDir, "prd.json"))) items.push("prd.json");
  if (fs.existsSync(path.join(omcDir, "project-memory.json"))) items.push("project-memory.json");

  const stateDir = path.join(omcDir, "state");
  if (fs.existsSync(stateDir)) {
    const stateFiles = fs.readdirSync(stateDir).filter((f) => f.endsWith(".json"));
    items.push(...stateFiles.map((f) => `state/${f}`));
  }

  for (const item of items) {
    const p = path.join(omcDir, item);
    if (fs.existsSync(p)) {
      latestMtime = Math.max(latestMtime, fs.statSync(p).mtimeMs);
    }
  }

  if (items.length === 0) return { exists: false, mtime: null, details: "" };

  return {
    exists: true,
    mtime: new Date(latestMtime).toISOString(),
    details: `Found OMC state: ${items.join(", ")}`,
  };
}
