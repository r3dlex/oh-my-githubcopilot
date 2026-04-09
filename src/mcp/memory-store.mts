/**
 * MCP Memory Store
 * Key-value memory with categories and TTL.
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

export interface MemoryEntry {
  key: string;
  value: string;
  category: string | null;
  session_id: string | null;
  created_at: number;
  updated_at: number;
}

/**
 * Get a memory entry by key.
 */
export function get(key: string): string | null {
  const db = getDb();
  const row = db.prepare("SELECT value FROM memory WHERE key = ?").get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

/**
 * Set a memory entry.
 */
export function set(
  key: string,
  value: string,
  category?: string,
  sessionId?: string
): void {
  const db = getDb();
  const now = Date.now();
  db.prepare(`
    INSERT INTO memory (key, value, category, session_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      category = COALESCE(excluded.category, category),
      session_id = COALESCE(excluded.session_id, session_id),
      updated_at = excluded.updated_at
  `).run(key, value, category ?? null, sessionId ?? null, now, now);
}

/**
 * Delete a memory entry.
 */
export function del(key: string): void {
  const db = getDb();
  db.prepare("DELETE FROM memory WHERE key = ?").run(key);
}

/**
 * List memory entries by category.
 */
export function listByCategory(category: string): MemoryEntry[] {
  const db = getDb();
  return db.prepare("SELECT * FROM memory WHERE category = ? ORDER BY updated_at DESC").all(category) as MemoryEntry[];
}

/**
 * List memory entries by session.
 */
export function listBySession(sessionId: string): MemoryEntry[] {
  const db = getDb();
  return db.prepare("SELECT * FROM memory WHERE session_id = ? ORDER BY updated_at DESC").all(sessionId) as MemoryEntry[];
}

/**
 * List all memory entries.
 */
export function listAll(): MemoryEntry[] {
  const db = getDb();
  return db.prepare("SELECT * FROM memory ORDER BY updated_at DESC").all() as MemoryEntry[];
}

/**
 * Clear all memory entries.
 */
export function clearAll(): void {
  const db = getDb();
  db.prepare("DELETE FROM memory").run();
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