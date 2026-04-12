/**
 * Config loader for OMP.
 * Reads from .omp/config.json (local) and ~/.omp/config.json (global).
 * Malformed JSON → log warning + return {} (never throw)
 * Missing file → return {}
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { homedir } from "os";

export type ConfigScope = "local" | "global";

function getConfigPath(scope: ConfigScope): string {
  if (scope === "global") return join(homedir(), ".omp", "config.json");
  return join(process.cwd(), ".omp", "config.json");
}

function readConfigFile<T>(path: string): Partial<T> {
  try {
    const raw = readFileSync(path, "utf-8");
    return JSON.parse(raw) as Partial<T>;
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return {};
    console.warn(`[OMP] config: malformed JSON at ${path}, using defaults`);
    return {};
  }
}

export function loadConfig<T>(name: string, scope?: ConfigScope): Partial<T> {
  if (scope === "local") return readConfigFile<T>(getConfigPath("local"));
  if (scope === "global") return readConfigFile<T>(getConfigPath("global"));
  // Merge: local wins
  const global = readConfigFile<T>(getConfigPath("global"));
  const local = readConfigFile<T>(getConfigPath("local"));
  return { ...global, ...local };
}

export function writeConfig<T>(name: string, scope: ConfigScope, patch: Partial<T>): void {
  const path = getConfigPath(scope);
  const existing = readConfigFile<T>(path);
  const merged = { ...existing, ...patch };
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(merged, null, 2), "utf-8");
}
