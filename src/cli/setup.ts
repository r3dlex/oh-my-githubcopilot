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
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { homedir } from "os";
import { runMcpSetup, type SetupScope } from "../setup/mcp-config-wizard.js";

const REQUIRED_COPILOT_EXPERIMENTAL_FEATURES = [
  "STATUS_LINE",
  "SHOW_FILE",
  "EXTENSIONS",
  "BACKGROUND_SESSIONS",
  "CONFIGURE_COPILOT_AGENT",
  "MULTI_TURN_AGENTS",
  "SESSION_STORE",
] as const;

interface CopilotStatusLineConfig {
  type?: "command";
  command?: string;
  padding?: number;
}

interface CopilotConfig {
  experimental?: boolean;
  experimentalFeatures?: string[];
  statusLine?: CopilotStatusLineConfig;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Phase 1: Base install
// ---------------------------------------------------------------------------

async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

function getPackageRoot(): string {
  return join(dirname(fileURLToPath(import.meta.url)), "..", "..");
}

function getUserHomeDir(): string {
  return process.env["HOME"] || homedir();
}

function getCopilotConfigPath(): string {
  return join(getUserHomeDir(), ".copilot", "config.json");
}

function getRequiredExperimentalFeatures(): string[] {
  const raw = process.env["OMP_COPILOT_REQUIRED_EXPERIMENTAL_FEATURES"];
  if (!raw) return [...REQUIRED_COPILOT_EXPERIMENTAL_FEATURES];
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function getStatusLineCommand(): string {
  const configured = process.env["OMP_COPILOT_STATUS_LINE_COMMAND"];
  return configured || join(getPackageRoot(), "bin", "omp-statusline.sh");
}

async function readJsonFile<T>(path: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(path, "utf-8");
    return JSON.parse(raw) as T;
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return fallback;
    console.warn(`[omp] Warning: unable to parse ${path}; preserving no existing Copilot config.`);
    return fallback;
  }
}

async function maybeChmod0600(path: string): Promise<void> {
  if (process.platform === "win32") return;
  await fs.chmod(path, 0o600);
}

async function configureCopilotCli(): Promise<void> {
  const configPath = getCopilotConfigPath();
  const existing = await readJsonFile<CopilotConfig>(configPath, {});
  const existingFeatures = Array.isArray(existing.experimentalFeatures)
    ? existing.experimentalFeatures.filter((value): value is string => typeof value === "string")
    : [];
  const requiredFeatures = getRequiredExperimentalFeatures();
  const experimentalFeatures = [...existingFeatures];

  for (const feature of requiredFeatures) {
    if (!experimentalFeatures.includes(feature)) {
      experimentalFeatures.push(feature);
    }
  }

  const defaultStatusLine: CopilotStatusLineConfig = {
    type: "command",
    command: getStatusLineCommand(),
  };
  const existingStatusLine =
    existing.statusLine && typeof existing.statusLine === "object"
      ? existing.statusLine
      : undefined;

  const nextConfig: CopilotConfig = {
    ...existing,
    experimental: true,
    experimentalFeatures,
    statusLine: existingStatusLine
      ? { ...defaultStatusLine, ...existingStatusLine }
      : defaultStatusLine,
  };

  await ensureDir(dirname(configPath));
  await fs.writeFile(configPath, JSON.stringify(nextConfig, null, 2), "utf-8");
  await maybeChmod0600(configPath);

  console.log("Copilot CLI config updated.");
  console.log(`  Config file: ${configPath}`);
  console.log(`  Experimental features ensured: ${requiredFeatures.join(", ")}`);
  console.log(`  Status line command: ${nextConfig.statusLine?.command}`);
}

async function runBaseSetup(): Promise<void> {
  const baseDir = join(getUserHomeDir(), ".omp");
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

  await configureCopilotCli();

  console.log("OMP base setup complete.");
  console.log(`  Config directory: ${baseDir}`);
  console.log(`  Database: ${dbPath}`);
  console.log("\nFirst-run guidance:");
  console.log("  Run 'omp hud' to check the HUD display.");
  console.log("  Run 'omp setup --mcp-only' to configure external MCP servers.");
  console.log("  Copilot experimental mode and status line are now configured in ~/.copilot/config.json.");
  console.log("  Restart Copilot CLI after setup so the new config is loaded.");
  console.log("  Or run '/omp:setup' from within a Copilot session.");
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
