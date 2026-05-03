import * as fs from "node:fs";
import * as path from "node:path";
import { safeReadFile, safeJsonParse, ensureDir, safeWriteFile } from "../utils.js";

export interface ImportResult {
  source: "omc" | "claude-code";
  imported_files: string[];
  conflicts: string[];
  summary: string;
  session_id: string | null;
  timestamp: string;
}

/**
 * Import OMC (.omc/) state into OMG (.omg/) format.
 * Schemas are nearly identical — direct file-level mapping with mtime conflict resolution.
 */
export function importOmcSession(workspaceRoot: string, force: boolean = false): ImportResult {
  const omcDir = path.join(workspaceRoot, ".omc");
  const omgDir = path.join(workspaceRoot, ".omg");
  const importedFiles: string[] = [];
  const conflicts: string[] = [];

  // Map of OMC paths → OMG paths (relative to their root dirs)
  const fileMappings = [
    { omc: "prd.json", omg: "prd.json" },
    { omc: "project-memory.json", omg: "project-memory.json" },
  ];

  // State files: .omc/state/*-state.json → .omg/state/*-state.json
  const omcStateDir = path.join(omcDir, "state");
  if (fs.existsSync(omcStateDir)) {
    const stateFiles = fs.readdirSync(omcStateDir).filter((f) => f.endsWith("-state.json"));
    for (const sf of stateFiles) {
      fileMappings.push({ omc: path.join("state", sf), omg: path.join("state", sf) });
    }

    // Session checkpoint
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

    // Conflict detection: if destination exists and is newer, skip unless forced
    if (fs.existsSync(dstPath) && !force) {
      const srcMtime = fs.statSync(srcPath).mtimeMs;
      const dstMtime = fs.statSync(dstPath).mtimeMs;
      if (dstMtime >= srcMtime) {
        conflicts.push(mapping.omg);
        continue;
      }
    }

    // If destination exists and we're overwriting, backup first
    if (fs.existsSync(dstPath)) {
      const backupPath = dstPath.replace(/\.json$/, ".previous.json");
      ensureDir(path.dirname(backupPath));
      fs.copyFileSync(dstPath, backupPath);
    }

    ensureDir(path.dirname(dstPath));
    fs.copyFileSync(srcPath, dstPath);
    importedFiles.push(mapping.omg);
  }

  // Build summary from PRD or checkpoint
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

  // Determine session ID from checkpoint if available
  let sessionId: string | null = null;
  const checkpointPath = path.join(omcDir, "state", "session-checkpoint.json");
  if (fs.existsSync(checkpointPath)) {
    const raw = safeReadFile(checkpointPath);
    if (raw) {
      const parsed = safeJsonParse(raw);
      if (parsed.ok && (parsed.data as Record<string, unknown>).timestamp) {
        sessionId = `omc-${(parsed.data as Record<string, unknown>).timestamp}`;
      }
    }
  }

  // Get the latest mtime from OMC files as timestamp
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

  // Find the most recently modified file
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
