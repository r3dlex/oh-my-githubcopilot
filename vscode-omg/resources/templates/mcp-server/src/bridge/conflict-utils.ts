import * as fs from "node:fs";
import * as path from "node:path";
import { ensureDir, safeReadFile, safeJsonParse } from "../utils.js";

export type SourceOrigin =
  | "native"
  | "bridged-from-omc"
  | "bridged-from-claude-code"
  | "bridged-from-omg";

export interface ConflictDecision {
  skip: boolean;
  reason?: "dst-newer-mtime" | "dst-newer-embedded" | "no-source";
}

interface SkipForConflictArgs {
  srcPath: string;
  dstPath: string;
  force: boolean;
  /**
   * For session-checkpoint.json comparisons we prefer the embedded `timestamp`
   * field when the destination originated from a bridge write — mtime is unreliable
   * because git/tar/checkout mutate it.
   *
   * Per principle 3: applies ONLY to session-checkpoint.json. Other files use mtime.
   */
  useEmbeddedTimestamp?: boolean;
}

function readEmbeddedTimestamp(filePath: string): { ts: number; sourceOrigin: SourceOrigin } | null {
  const raw = safeReadFile(filePath);
  if (!raw) return null;
  const parsed = safeJsonParse(raw);
  if (!parsed.ok) return null;
  const data = parsed.data as Record<string, unknown>;
  const tsRaw = data.timestamp;
  const ts = typeof tsRaw === "string" ? Date.parse(tsRaw) : NaN;
  if (Number.isNaN(ts)) return null;
  const so = (typeof data.source_origin === "string" ? data.source_origin : "native") as SourceOrigin;
  return { ts, sourceOrigin: so };
}

/**
 * Decide whether to skip overwriting `dstPath` with `srcPath`.
 *
 * - If destination doesn't exist → never skip.
 * - If `force === true` → never skip.
 * - For session-checkpoint comparisons (`useEmbeddedTimestamp`), if the destination is
 *   a bridged checkpoint (`source_origin !== "native"`), use embedded `timestamp` field.
 *   Otherwise fall back to mtime.
 * - For all other files, use mtime.
 */
export function shouldSkipForConflict(args: SkipForConflictArgs): ConflictDecision {
  const { srcPath, dstPath, force, useEmbeddedTimestamp } = args;

  if (force) return { skip: false };
  if (!fs.existsSync(dstPath)) return { skip: false };
  if (!fs.existsSync(srcPath)) return { skip: true, reason: "no-source" };

  if (useEmbeddedTimestamp) {
    const dstEmbedded = readEmbeddedTimestamp(dstPath);
    if (dstEmbedded && dstEmbedded.sourceOrigin !== "native") {
      const srcEmbedded = readEmbeddedTimestamp(srcPath);
      const srcTs = srcEmbedded?.ts ?? fs.statSync(srcPath).mtimeMs;
      return dstEmbedded.ts >= srcTs
        ? { skip: true, reason: "dst-newer-embedded" }
        : { skip: false };
    }
  }

  const srcMtime = fs.statSync(srcPath).mtimeMs;
  const dstMtime = fs.statSync(dstPath).mtimeMs;
  return dstMtime >= srcMtime
    ? { skip: true, reason: "dst-newer-mtime" }
    : { skip: false };
}

/**
 * Rotate a `.previous.{ISO}.json` backup at `dstPath`, keeping the most recent
 * `retainCount` snapshots. Returns the list of backup paths that exist after rotation.
 *
 * Example: dstPath = .omc/state/session-checkpoint.json → backup at
 *   .omc/state/session-checkpoint.previous.2026-05-10T12-00-00-000Z.json
 *
 * Colons are replaced with hyphens to keep paths cross-platform safe.
 */
export function rotateBackup(dstPath: string, retainCount: number = 3): string[] {
  if (!fs.existsSync(dstPath)) return [];

  const dir = path.dirname(dstPath);
  ensureDir(dir);

  const base = path.basename(dstPath);
  const ext = path.extname(base);
  const stem = base.slice(0, -ext.length);

  const stamp = new Date().toISOString().replace(/[:]/g, "-");
  const backupName = `${stem}.previous.${stamp}${ext}`;
  const backupPath = path.join(dir, backupName);

  fs.copyFileSync(dstPath, backupPath);

  const prefix = `${stem}.previous.`;
  const all = fs
    .readdirSync(dir)
    .filter((f) => f.startsWith(prefix) && f.endsWith(ext))
    .map((f) => path.join(dir, f));

  all.sort((a, b) => fs.statSync(a).mtimeMs - fs.statSync(b).mtimeMs);

  while (all.length > retainCount) {
    const oldest = all.shift();
    if (oldest) {
      try {
        fs.unlinkSync(oldest);
      } catch {
        /* skip if locked */
      }
    }
  }

  return all;
}
