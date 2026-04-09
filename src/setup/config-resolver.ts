/**
 * MCP Config Resolver
 *
 * Loads user (~/.omp/) and workspace (./.omp/) config files, merges them
 * field-by-field per server (ADR-001), expands $VAR environment variable
 * references (ADR-002), and returns a fully resolved config.
 *
 * Windows (Win32) handling:
 * - User config path: %USERPROFILE%\.omp\mcp-config.json
 * - chmod is a no-op on Win32 — no fs.chmod() call is made here
 *   (callers must print the icacls advisory at their call site per ADR-002)
 * - File permission warnings are skipped on Win32
 */

import { readFileSync, statSync } from "fs";
import { dirname } from "path";
import { mkdirSync } from "fs";
import type {
  McpServerEntry,
  RawUserConfig,
  RawWorkspaceConfig,
  ResolvedMcpConfig,
} from "./mcp-schema.js";
import {
  getUserConfigPath,
  getWorkspaceConfigPath,
} from "./mcp-schema.js";

// ---------------------------------------------------------------------------
// Env var expansion
// ---------------------------------------------------------------------------

/**
 * Recursively expand $VAR patterns in string values using process.env.
 * - $FOO -> process.env.FOO
 * - ${FOO} -> process.env.FOO
 * - Non-string values are returned as-is
 */
export function expandEnvVars<T>(value: T): T {
  if (typeof value === "string") {
    return value.replace(/\$(\{([A-Za-z_][A-Za-z0-9_]*)\}|([A-Za-z_][A-Za-z0-9_]*))/g,
      (_match, _braced, bracedName, flatName) => {
        const varName = bracedName ?? flatName;
        return process.env[varName] ?? _match;
      }) as T;
  }
  if (Array.isArray(value)) {
    return value.map((v) => expandEnvVars(v)) as T;
  }
  if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      result[k] = expandEnvVars(v);
    }
    return result as T;
  }
  return value;
}

// ---------------------------------------------------------------------------
// Field-level merge
// ---------------------------------------------------------------------------

/**
 * Merge two server entries field-by-field.
 * `workspace` overrides any fields present in `workspace`; all other
 * fields fall back to `user`.
 *
 * Returns undefined if the resulting entry has no usable fields.
 */
function mergeServerEntry(
  _id: string,
  userEntry: McpServerEntry | undefined,
  workspaceEntry: McpServerEntry | undefined,
): McpServerEntry | undefined {
  if (!userEntry && !workspaceEntry) return undefined;

  // If only one is present, return it (with env var expansion)
  if (!userEntry) {
    return workspaceEntry ? expandEnvVars(workspaceEntry) : undefined;
  }
  if (!workspaceEntry) {
    return expandEnvVars(userEntry);
  }

  // Both present — field-level merge: workspace overrides specific fields
  const merged = { ...userEntry, ...workspaceEntry };
  return expandEnvVars(merged);
}

// ---------------------------------------------------------------------------
// Config loading
// ---------------------------------------------------------------------------

function loadJsonConfig(path: string): RawUserConfig | RawWorkspaceConfig | null {
  try {
    const content = readFileSync(path, "utf-8");
    return JSON.parse(content) as RawUserConfig | RawWorkspaceConfig;
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
}

// ---------------------------------------------------------------------------
// World-readable permission warning
// ---------------------------------------------------------------------------

/** Logs a warning if the config file is world-readable on Unix */
function checkWorldReadable(path: string): void {
  if (process.platform === "win32") return; // chmod is meaningless on Win32
  try {
    const stat = statSync(path);
    const mode = stat.mode & 0o777;
    if ((mode & 0o007) !== 0) {
      console.warn(
        `[omp] Warning: config file '${path}' is world-readable (mode ${mode.toString(8)}). ` +
        `Run: chmod 600 '${path}' to restrict access.`
      );
    }
  } catch {
    // Ignore — file may not exist yet
  }
}

// ---------------------------------------------------------------------------
// Main resolver
// ---------------------------------------------------------------------------

/**
 * resolveMcpConfig
 *
 * Reads user config (~/.omp/mcp-config.json) and workspace config
 * ({cwd}/.omp/mcp-config.json), merges them field-by-field per server,
 * expands $VAR environment variable references, and returns a fully
 * resolved config.
 *
 * Missing config files are treated as empty (not errors).
 * Servers with zero usable fields after merging emit a warning and are
 * omitted from the resolved config.
 */
export function resolveMcpConfig(cwd?: string): ResolvedMcpConfig {
  const userConfigPath = getUserConfigPath();
  const workspacePath = getWorkspaceConfigPath(cwd ?? process.cwd());

  const rawUser = loadJsonConfig(userConfigPath) ?? { servers: {} };
  const rawWorkspace = loadJsonConfig(workspacePath) ?? { servers: {} };

  // Check world-readable permissions on user config (Unix only)
  checkWorldReadable(userConfigPath);

  const userServers = rawUser.servers ?? {};
  const workspaceServers = rawWorkspace.servers ?? {};

  // Collect all unique server IDs from both configs
  const allIds = new Set([
    ...Object.keys(userServers),
    ...Object.keys(workspaceServers),
  ]);

  const resolvedServers: Record<string, McpServerEntry> = {};

  for (const id of allIds) {
    const userEntry = userServers[id] as McpServerEntry | undefined;
    const workspaceEntry = workspaceServers[id] as McpServerEntry | undefined;

    const merged = mergeServerEntry(id, userEntry, workspaceEntry);

    if (!merged) {
      console.warn(
        `[omp] Warning: server '${id}' has no token after merging workspace and user configs — server will be skipped.`
      );
      continue;
    }

    // Check for zero usable fields (only repos or other non-credential fields)
    const hasCredential =
      "token" in merged ||
      "apiKey" in merged ||
      "personalAccessToken" in merged ||
      "cloudId" in merged;

    if (!hasCredential) {
      console.warn(
        `[omp] Warning: server '${id}' has no credential after merging — server will be skipped.`
      );
      continue;
    }

    resolvedServers[id] = merged;
  }

  return { servers: resolvedServers };
}

// ---------------------------------------------------------------------------
// Convenience helpers
// ---------------------------------------------------------------------------

/** Ensures the ~/.omp/ directory exists */
export function ensureUserConfigDir(): void {
  const configPath = getUserConfigPath();
  const dir = dirname(configPath);
  mkdirSync(dir, { recursive: true });
}
