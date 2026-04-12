/**
 * Graph provider registry for OMP.
 *
 * Resolves the active GraphBuildable provider from config.
 *
 * IMPORTANT: loadConfig(_name) reads from a single shared config file
 * (.omp/config.json locally, ~/.omp/config.json globally). The `_name`
 * parameter is currently unused (underscore-prefixed). Domain separation
 * is achieved by nesting config under keys:
 *   { "graph": { "provider": "graphwiki" }, "spending": { ... } }
 * within the single shared config.json — NOT separate per-domain files.
 */

import { loadConfig, writeConfig } from "../utils/config.mjs";
import { GraphifyAdapter } from "./graphify-adapter.mjs";
import { GraphwikiAdapter } from "./graphwiki-adapter.mjs";
import type { GraphBuildable } from "./types.mjs";

let _adapters: Map<string, GraphBuildable> | null = null;

function getAdapters(): Map<string, GraphBuildable> {
  if (!_adapters) {
    _adapters = new Map<string, GraphBuildable>([
      ["graphify", new GraphifyAdapter()],
      ["graphwiki", new GraphwikiAdapter()],
    ]);
  }
  return _adapters;
}

/** For testing: replace the adapter map */
export function _setAdaptersForTest(adapters: Map<string, GraphBuildable>): void {
  _adapters = adapters;
}

export function listProviders(): string[] {
  return Array.from(getAdapters().keys());
}

export function getProvider(id?: string): GraphBuildable {
  const adapters = getAdapters();
  // Read from shared .omp/config.json under the "graph.provider" key
  const configId = id ?? (loadConfig<{ graph: { provider: string } }>("graph")?.graph?.provider ?? "graphwiki");
  const adapter = adapters.get(configId);
  if (!adapter) {
    throw new Error(
      `Unknown graph provider: "${configId}". Available: ${listProviders().join(", ")}`
    );
  }
  return adapter;
}

export function setProvider(id: string): void {
  if (!listProviders().includes(id)) {
    throw new Error(
      `Unknown graph provider: "${id}". Available: ${listProviders().join(", ")}`
    );
  }
  // Writes to local .omp/config.json under the "graph" key
  writeConfig<{ graph: { provider: string } }>("graph", "local", { graph: { provider: id } });
}
