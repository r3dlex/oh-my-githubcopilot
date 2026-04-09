/**
 * OMP Setup CLI Module
 *
 * Orchestrates the two-phase OMP setup:
 *   Phase 1 — Base install:  create ~/.omp/, init SQLite DB, print first-run guidance
 *   Phase 2 — MCP config:    run the MCP config wizard (mcp-config-wizard.ts)
 *
 * Flags:
 *   --mcp-only          Skip Phase 1, run only MCP config wizard
 *   --skip-mcp          Run Phase 1 only, skip MCP configuration
 *   --non-interactive   Use env vars for all MCP credentials (no readline prompts)
 *   --workspace         Write MCP config to {cwd}/.omp/ instead of ~/.omp/
 */

import { promises as fs } from "fs";
import { join } from "path";
import { homedir } from "os";
import { runMcpSetup, type SetupScope } from "../setup/mcp-config-wizard.js";

// ---------------------------------------------------------------------------
// Phase 1: Base install
// ---------------------------------------------------------------------------

async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

async function runBaseSetup(): Promise<void> {
  const baseDir = join(homedir(), ".omp");
  const dbPath = join(baseDir, "omp.db");
  const logsDir = join(baseDir, "logs");

  await ensureDir(baseDir);
  await ensureDir(logsDir);

  // Touch the DB file to ensure it exists (actual init is done by the PSM module)
  try {
    await fs.writeFile(dbPath, "", { flag: "ax" });
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code !== "EEXIST") throw err;
  }

  console.log("OMP base setup complete.");
  console.log(`  Config directory: ${baseDir}`);
  console.log(`  Database: ${dbPath}`);
  console.log("\nFirst-run guidance:");
  console.log("  Run 'omp hud' to check the HUD display.");
  console.log("  Run 'omp setup --mcp-only' to configure external MCP servers.");
  console.log("  Or run '/oh-my-copilot:setup' from within a Copilot session.");
}

// ---------------------------------------------------------------------------
// Phase 2: MCP config (delegated to wizard)
// ---------------------------------------------------------------------------

async function runMcpConfiguration(
  interactive: boolean,
  scope: SetupScope
): Promise<void> {
  const result = await runMcpSetup(interactive, scope);
  if (!result.success) {
    console.warn(`\nMCP setup completed with errors. Check warnings above.`);
  }
}

// ---------------------------------------------------------------------------
// Main CLI handler
// ---------------------------------------------------------------------------

export interface SetupCliOptions {
  mcpOnly: boolean;
  skipMcp: boolean;
  nonInteractive: boolean;
  workspace: boolean;
}

export async function runSetupCli(
  _cwd: string,
  options: SetupCliOptions
): Promise<void> {
  const { mcpOnly, skipMcp, nonInteractive, workspace } = options;
  const scope: SetupScope = workspace ? "workspace" : "user";

  if (mcpOnly && skipMcp) {
    console.error("Error: --mcp-only and --skip-mcp cannot be used together.");
    process.exit(1);
  }

  // Phase 1: base setup
  if (!mcpOnly) {
    await runBaseSetup();
  } else {
    console.log("OMP MCP Configuration");
  }

  // Phase 2: MCP config
  if (!skipMcp) {
    if (!mcpOnly) console.log("\n--- MCP Server Configuration ---\n");
    await runMcpConfiguration(!nonInteractive, scope);
  }
}
