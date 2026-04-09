/**
 * MCP State Manager
 * Session state persistence via SQLite.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const BetterSqlite3 = require("better-sqlite3") as typeof import("better-sqlite3");
import { homedir } from "os";
import { join } from "path";

type SqliteDatabase = InstanceType<typeof BetterSqlite3>;

let _db: SqliteDatabase | null = null;

function getDb(): SqliteDatabase {
  if (!_db) {
    const dbPath = join(homedir(), ".omp", "state", "omp.db");
    _db = new BetterSqlite3(dbPath);
    _db.pragma("journal_mode = WAL");
  }
  return _db;
}

export interface SessionState {
  id: string;
  worktree_id: string | null;
  state_json: string;
  created_at: number;
  updated_at: number;
}

/**
 * Get the latest session state.
 */
export function getLatestSession(): SessionState | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM sessions ORDER BY updated_at DESC LIMIT 1").get() as SessionState | undefined;
  return row ?? null;
}

/**
 * Save a session state.
 */
export function saveSession(id: string, worktreeId: string | null, state: Record<string, unknown>): void {
  const db = getDb();
  const now = Date.now();
  const stateJson = JSON.stringify(state);

  db.prepare(`
    INSERT INTO sessions (id, worktree_id, state_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      state_json = excluded.state_json,
      updated_at = excluded.updated_at
  `).run(id, worktreeId, stateJson, now, now);
}

/**
 * List all sessions.
 */
export function listSessions(): SessionState[] {
  const db = getDb();
  return db.prepare("SELECT * FROM sessions ORDER BY updated_at DESC").all() as SessionState[];
}

/**
 * Get a session by ID.
 */
export function getSession(id: string): SessionState | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM sessions WHERE id = ?").get(id) as SessionState | undefined;
  return row ?? null;
}

/**
 * Delete a session.
 */
export function deleteSession(id: string): void {
  const db = getDb();
  db.prepare("DELETE FROM sessions WHERE id = ?").run(id);
}

/**
 * Close the database connection.
 */
export function closeDb(): void {
  if (_db) {
    _db.close();
    _db = null;
  }
}