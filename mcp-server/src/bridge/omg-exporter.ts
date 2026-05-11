import * as fs from "node:fs";
import * as path from "node:path";
import { ensureDir, safeReadFile, safeJsonParse, safeWriteFile } from "../utils.js";
import { rotateBackup, shouldSkipForConflict, type SourceOrigin } from "./conflict-utils.js";

export interface ExportResult {
  target: "omc";
  exported_files: string[];
  conflicts: string[];
  summary: string;
  session_id: string | null;
  source_origin: SourceOrigin;
  workspace_root: string;
  timestamp: string;
  success: boolean;
  reason?: "workspace_mismatch" | "no-source-checkpoint" | "ok";
  expected?: string;
  actual?: string;
}

interface ActiveMode {
  mode: string;
  state: Record<string, unknown>;
}

interface OmgCheckpoint {
  timestamp?: string;
  summary?: string | null;
  key_decisions?: string[];
  active_modes?: ActiveMode[];
  recent_memory?: Array<{ key: string; value: string; category: string }>;
  modified_files?: string[];
  context_bytes_estimate?: number;
  estimated_tokens?: number;
  source_tool?: string;
  source_origin?: SourceOrigin;
  source_session_id?: string | null;
  imported_at?: string | null;
  imported_summary?: string | null;
  workspace_root?: string;
}

function readCheckpoint(filePath: string): OmgCheckpoint | null {
  const raw = safeReadFile(filePath);
  if (!raw) return null;
  const parsed = safeJsonParse(raw);
  if (!parsed.ok) return null;
  return parsed.data as OmgCheckpoint;
}

function summarizePrd(prdPath: string): string {
  const raw = safeReadFile(prdPath);
  if (!raw) return "";
  const parsed = safeJsonParse(raw);
  if (!parsed.ok) return "";
  const data = parsed.data as Record<string, unknown>;
  const title = data.title;
  const stories = data.stories;
  let s = "";
  if (typeof title === "string") s += ` — PRD: ${title}`;
  if (Array.isArray(stories)) {
    const done = stories.filter((x) => (x as Record<string, unknown>).passes).length;
    s += ` (${done}/${stories.length} stories done)`;
  }
  return s;
}

/**
 * Detect if an OMG workspace exists and has exportable state.
 */
export function detectOmgSession(workspaceRoot: string): {
  exists: boolean;
  mtime: string | null;
  details: string;
  has_checkpoint: boolean;
} {
  const omgDir = path.join(workspaceRoot, ".omg");
  if (!fs.existsSync(omgDir)) {
    return { exists: false, mtime: null, details: "", has_checkpoint: false };
  }

  const items: string[] = [];
  let latestMtime = 0;
  let hasCheckpoint = false;

  for (const candidate of ["prd.json", "project-memory.json"]) {
    const p = path.join(omgDir, candidate);
    if (fs.existsSync(p)) {
      items.push(candidate);
      latestMtime = Math.max(latestMtime, fs.statSync(p).mtimeMs);
    }
  }

  const stateDir = path.join(omgDir, "state");
  if (fs.existsSync(stateDir)) {
    const stateFiles = fs.readdirSync(stateDir).filter((f) => f.endsWith(".json"));
    for (const f of stateFiles) {
      items.push(`state/${f}`);
      latestMtime = Math.max(latestMtime, fs.statSync(path.join(stateDir, f)).mtimeMs);
      if (f === "session-checkpoint.json") hasCheckpoint = true;
    }
  }

  if (items.length === 0) {
    return { exists: false, mtime: null, details: "", has_checkpoint: false };
  }

  return {
    exists: true,
    mtime: new Date(latestMtime).toISOString(),
    details: `Found OMG state: ${items.join(", ")}`,
    has_checkpoint: hasCheckpoint,
  };
}

/**
 * Export OMG (.omg/) state into OMC (.omc/) format.
 *
 * Composes (does not blindly copy):
 *  - prd.json, project-memory.json: file copy with rotating-backup conflict resolution.
 *  - state/session-checkpoint.json: composed with translated provenance
 *    (`source_origin: "bridged-from-omg"`, `source_tool: "copilot"` retained for back-compat).
 *  - active_modes[] from the OMG checkpoint: DECOMPOSED into per-mode
 *    `.omc/state/{mode}-state.json` files (inverse of bridge/index.ts:99-120).
 *
 * Project-identity guard (AC-27): if the source checkpoint's `workspace_root` field is
 * present and does not match the supplied `workspaceRoot`, abort BEFORE any file mutation.
 *
 * Atomicity (AC-22b): caller (`exportExternalSession`) writes the export token AFTER this
 * function returns success — ensuring partial-failure does not leave a stale token.
 */
export function exportOmgSession(
  workspaceRoot: string,
  force: boolean = false,
): ExportResult {
  const omgDir = path.join(workspaceRoot, ".omg");
  const omcDir = path.join(workspaceRoot, ".omc");
  const omgStateDir = path.join(omgDir, "state");
  const omcStateDir = path.join(omcDir, "state");

  const checkpointSrc = path.join(omgStateDir, "session-checkpoint.json");
  const exportedFiles: string[] = [];
  const conflicts: string[] = [];

  const sourceCheckpoint = readCheckpoint(checkpointSrc);

  // AC-27: project-identity guard. Pre-v1.4.3 checkpoints (no field) fall through.
  if (sourceCheckpoint?.workspace_root) {
    const expected = sourceCheckpoint.workspace_root;
    const actual = workspaceRoot;
    if (path.resolve(expected) !== path.resolve(actual)) {
      return {
        target: "omc",
        exported_files: [],
        conflicts: [],
        summary: "workspace_mismatch — refusing to mutate .omc/",
        session_id: null,
        source_origin: "bridged-from-omg",
        workspace_root: actual,
        timestamp: new Date().toISOString(),
        success: false,
        reason: "workspace_mismatch",
        expected,
        actual,
      };
    }
  }

  // Phase A — file-copy mappings (prd, project-memory). Mtime conflict primitive.
  const fileCopyMappings: Array<{ omg: string; omc: string }> = [
    { omg: "prd.json", omc: "prd.json" },
    { omg: "project-memory.json", omc: "project-memory.json" },
  ];

  for (const mapping of fileCopyMappings) {
    const src = path.join(omgDir, mapping.omg);
    const dst = path.join(omcDir, mapping.omc);
    if (!fs.existsSync(src)) continue;

    const decision = shouldSkipForConflict({
      srcPath: src,
      dstPath: dst,
      force,
      useEmbeddedTimestamp: false,
    });
    if (decision.skip) {
      conflicts.push(mapping.omc);
      continue;
    }

    if (fs.existsSync(dst)) rotateBackup(dst, 3);
    ensureDir(path.dirname(dst));
    fs.copyFileSync(src, dst);
    exportedFiles.push(mapping.omc);
  }

  // Phase B — DECOMPOSITION: extract active_modes[] from the OMG checkpoint into
  // per-mode .omc/state/{mode}-state.json files. Inverse of bridge/index.ts:99-120.
  if (sourceCheckpoint && Array.isArray(sourceCheckpoint.active_modes)) {
    for (const entry of sourceCheckpoint.active_modes) {
      if (!entry || typeof entry.mode !== "string") continue;
      if (!/^[a-zA-Z0-9_-]+$/.test(entry.mode)) continue;
      const dst = path.join(omcStateDir, `${entry.mode}-state.json`);
      const tempSrc = path.join(omgStateDir, `${entry.mode}-state.json`);

      // Decision: per-mode state files use mtime against an existing dst (if any).
      const decision = shouldSkipForConflict({
        srcPath: fs.existsSync(tempSrc) ? tempSrc : checkpointSrc,
        dstPath: dst,
        force,
        useEmbeddedTimestamp: false,
      });
      if (decision.skip) {
        conflicts.push(`state/${entry.mode}-state.json`);
        continue;
      }

      if (fs.existsSync(dst)) rotateBackup(dst, 3);
      ensureDir(path.dirname(dst));
      const decomposed = JSON.stringify(entry.state ?? {}, null, 2);
      safeWriteFile(dst, decomposed);
      exportedFiles.push(`state/${entry.mode}-state.json`);
    }
  }

  // Phase C — compose the destination .omc/state/session-checkpoint.json with
  // translated provenance. Embedded-timestamp primary applies here (principle 3).
  const sessionId = `omg-${sourceCheckpoint?.timestamp ?? new Date().toISOString()}`;
  const summary = `Exported from OMG${summarizePrd(path.join(omgDir, "prd.json"))}`;
  const nowIso = new Date().toISOString();

  const composed = {
    timestamp: sourceCheckpoint?.timestamp ?? nowIso,
    summary,
    key_decisions: sourceCheckpoint?.key_decisions ?? [],
    active_modes: sourceCheckpoint?.active_modes ?? [],
    recent_memory: sourceCheckpoint?.recent_memory ?? [],
    modified_files: sourceCheckpoint?.modified_files ?? [],
    context_bytes_estimate: sourceCheckpoint?.context_bytes_estimate ?? 0,
    estimated_tokens: sourceCheckpoint?.estimated_tokens ?? 0,
    source_tool: "copilot" as const,
    source_origin: "bridged-from-omg" as SourceOrigin,
    source_session_id: sessionId,
    imported_at: nowIso,
    imported_summary: summary,
    workspace_root: workspaceRoot,
  };

  const checkpointDst = path.join(omcStateDir, "session-checkpoint.json");

  const checkpointDecision = shouldSkipForConflict({
    srcPath: checkpointSrc,
    dstPath: checkpointDst,
    force,
    useEmbeddedTimestamp: true,
  });

  if (!checkpointDecision.skip) {
    if (fs.existsSync(checkpointDst)) rotateBackup(checkpointDst, 3);
    ensureDir(path.dirname(checkpointDst));
    safeWriteFile(checkpointDst, JSON.stringify(composed, null, 2));
    try {
      fs.chmodSync(checkpointDst, 0o600);
    } catch {
      /* chmod may fail on some filesystems, non-critical */
    }
    exportedFiles.push("state/session-checkpoint.json");
  } else {
    conflicts.push("state/session-checkpoint.json");
  }

  return {
    target: "omc",
    exported_files: exportedFiles,
    conflicts,
    summary: `Exported ${exportedFiles.length} file(s) to OMC` + summarizePrd(path.join(omgDir, "prd.json")),
    session_id: sessionId,
    source_origin: "bridged-from-omg",
    workspace_root: workspaceRoot,
    timestamp: nowIso,
    success: true,
    reason: "ok",
  };
}

export interface ExportToken {
  session_id: string;
  exported_at: string;
}

/**
 * AC-22b: Atomicity — caller MUST invoke this AFTER `exportOmgSession` returns success.
 * If exporter throws or returns success: false, do NOT call this.
 */
export function recordExportToken(
  workspaceRoot: string,
  sessionId: string,
): ExportToken {
  const omgStateDir = path.join(workspaceRoot, ".omg", "state");
  ensureDir(omgStateDir);
  const tokenPath = path.join(omgStateDir, "last-export-token.json");
  const token: ExportToken = {
    session_id: sessionId,
    exported_at: new Date().toISOString(),
  };
  safeWriteFile(tokenPath, JSON.stringify(token, null, 2));
  return token;
}

/**
 * Read the persisted export token, or null if absent / unreadable.
 */
export function readExportToken(workspaceRoot: string): ExportToken | null {
  const tokenPath = path.join(workspaceRoot, ".omg", "state", "last-export-token.json");
  const raw = safeReadFile(tokenPath);
  if (!raw) return null;
  const parsed = safeJsonParse(raw);
  if (!parsed.ok) return null;
  const data = parsed.data as Record<string, unknown>;
  if (typeof data.session_id !== "string" || typeof data.exported_at !== "string") return null;
  return { session_id: data.session_id, exported_at: data.exported_at };
}
