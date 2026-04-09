/**
 * PSM — Project Session Manager
 * Session lifecycle management.
 */

import { readFileSync, writeFileSync, mkdirSync, rmSync } from "fs";
import { homedir } from "os";
import { join, dirname } from "path";

export interface SessionRecord {
  id: string;
  name: string;
  worktreePath: string;
  branch: string;
  createdAt: number;
  lastActivityAt: number;
  status: "active" | "archived" | "destroyed";
}

const SESSIONS_DIR = () => join(homedir(), ".omp", "state", "sessions");
const SESSIONS_INDEX = () => join(homedir(), ".omp", "state", "sessions.json");

function ensureDir(path: string): void {
  mkdirSync(path, { recursive: true });
}

function readSessionsIndex(): SessionRecord[] {
  try {
    return JSON.parse(readFileSync(SESSIONS_INDEX(), "utf-8"));
  } catch {
    return [];
  }
}

function writeSessionsIndex(sessions: SessionRecord[]): void {
  ensureDir(dirname(SESSIONS_INDEX()));
  writeFileSync(SESSIONS_INDEX(), JSON.stringify(sessions, null, 2), "utf-8");
}

/**
 * Create a new PSM session.
 */
export function createSession(name: string): SessionRecord {
  const id = `psm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const worktreePath = join(homedir(), ".omp-sessions", name);
  const branch = `omp/${name}`;

  const record: SessionRecord = {
    id,
    name,
    worktreePath,
    branch,
    createdAt: Date.now(),
    lastActivityAt: Date.now(),
    status: "active",
  };

  const sessions = readSessionsIndex();
  sessions.push(record);
  writeSessionsIndex(sessions);

  // Create session state directory
  const sessionDir = join(SESSIONS_DIR(), id);
  ensureDir(sessionDir);
  writeFileSync(join(sessionDir, "session.json"), JSON.stringify({ id, name, branch, createdAt: record.createdAt }), "utf-8");

  return record;
}

/**
 * List all PSM sessions.
 */
export function listSessions(): SessionRecord[] {
  return readSessionsIndex();
}

/**
 * Switch to a PSM session (returns the session record).
 */
export function switchSession(name: string): SessionRecord | null {
  const sessions = readSessionsIndex();
  const session = sessions.find((s) => s.name === name && s.status === "active");
  if (!session) return null;
  session.lastActivityAt = Date.now();
  writeSessionsIndex(sessions);
  return session;
}

/**
 * Destroy a PSM session and optionally remove its worktree.
 */
export function destroySession(name: string, removeWorktree = false): boolean {
  const sessions = readSessionsIndex();
  const idx = sessions.findIndex((s) => s.name === name);
  if (idx === -1) return false;

  const session = sessions[idx];
  session.status = "destroyed";
  sessions.splice(idx, 1);
  writeSessionsIndex(sessions);

  // Remove session state directory
  const sessionDir = join(SESSIONS_DIR(), session.id);
  try {
    rmSync(sessionDir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }

  if (removeWorktree) {
    try {
      rmSync(session.worktreePath, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  }

  return true;
}
