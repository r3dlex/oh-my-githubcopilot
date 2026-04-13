/**
 * SQLite loader with graceful fallback.
 *
 * Uses createRequire so esbuild cannot hoist the dependency to a static ESM
 * import. When better-sqlite3 is unavailable (e.g., git-clone plugin installs
 * that have no node_modules), SqliteConstructor is null and callers degrade
 * gracefully.
 */

import { createRequire } from "module";

export type SqliteDatabaseConstructor = new (...args: unknown[]) => {
  pragma(sql: string): unknown;
};

let SqliteConstructor: SqliteDatabaseConstructor | null = null;
try {
  SqliteConstructor = createRequire(import.meta.url)("better-sqlite3") as SqliteDatabaseConstructor;
} catch {
  // SQLite not available
}

export { SqliteConstructor };
