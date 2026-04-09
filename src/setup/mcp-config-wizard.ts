/**
 * MCP Config Setup Wizard
 *
 * Orchestrates interactive and non-interactive MCP server configuration.
 * Writes to ~/.omp/mcp-config.json (user) or {cwd}/.omp/mcp-config.json (workspace).
 *
 * Uses the schema types from mcp-schema.ts and server definitions from mcp-servers.ts.
 */

import { createInterface } from "readline";
import { promises as fs } from "fs";
import { dirname } from "path";
import { spawn } from "child_process";
import { MCP_SERVERS, type McpServerDefinition } from "./mcp-servers.js";
import { getUserConfigPath, getWorkspaceConfigPath } from "./mcp-schema.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SetupScope = "user" | "workspace";

export interface SetupResult {
  success: boolean;
  configured: Array<{ serverId: string; scope: SetupScope }>;
  failed: Array<{ serverId: string; error: string }>;
  warnings: string[];
}

interface ServerConfig {
  token?: string;
  apiKey?: string;
  personalAccessToken?: string;
  repos?: string[];
  apiUrl?: string;
  orgUrl?: string;
  project?: string;
  baseUrl?: string;
  workspaceGid?: string;
  cloudId?: string;
}

// ---------------------------------------------------------------------------
// Config file paths (re-exported from schema for convenience)
// ---------------------------------------------------------------------------

function getConfigPath(scope: SetupScope, cwd: string): string {
  if (scope === "user") {
    return getUserConfigPath();
  }
  return getWorkspaceConfigPath(cwd);
}

// ---------------------------------------------------------------------------
// Permissions (Win32 advisory)
// ---------------------------------------------------------------------------

async function applyFilePermissions(configPath: string): Promise<void> {
  if (process.platform === "win32") {
    // On Win32, fs.chmod() silently no-ops — print advisory at call site
    console.warn(
      `Windows: ensure your user account is the only owner of ${configPath}.\n` +
        `Run: icacls ${configPath} /remove:d Everyone`
    );
    return;
  }
  // Unix/macOS: chmod 0600
  await fs.chmod(configPath, 0o600);
}

// ---------------------------------------------------------------------------
// Readline helper
// ---------------------------------------------------------------------------

function createReadline(): ReturnType<typeof createInterface> {
  return createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

async function promptSecret(
  rl: ReturnType<typeof createInterface>,
  label: string
): Promise<string> {
  return new Promise((resolve) => {
    rl.question(`${label} (press Enter for none): `, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function promptOptional(
  rl: ReturnType<typeof createInterface>,
  label: string,
  defaultValue: string
): Promise<string> {
  return new Promise((resolve) => {
    rl.question(`${label} [${defaultValue}]: `, (answer) => {
      resolve(answer.trim() || defaultValue);
    });
  });
}

// ---------------------------------------------------------------------------
// Interactive config collection
// ---------------------------------------------------------------------------

async function collectServerConfig(
  rl: ReturnType<typeof createInterface>,
  def: McpServerDefinition
): Promise<ServerConfig> {
  const config: ServerConfig = {};

  // Token / API key (required)
  const secret = await promptSecret(rl, `  ${def.name} (${def.tokenEnvVar}):`);
  if (!secret) {
    return config;
  }

  // Map secret to the correct field based on server type
  switch (def.id) {
    case "github":
      config.token = secret;
      config.repos = (
        await promptOptional(rl, "  GitHub repos (comma-separated, default: ['*'])", "*")
      )
        .split(",")
        .map((r) => r.trim())
        .filter(Boolean);
      config.apiUrl = await promptOptional(
        rl,
        "  GitHub API URL (default: https://api.github.com)",
        "https://api.github.com"
      );
      break;
    case "azure-devops":
      config.token = secret;
      config.orgUrl = await promptOptional(
        rl,
        "  Azure DevOps org URL (e.g. https://dev.azure.com/myorg):",
        ""
      );
      config.project = await promptOptional(rl, "  Azure DevOps project (optional):", "");
      break;
    case "exa":
      config.apiKey = secret;
      break;
    case "content7":
      config.apiKey = secret;
      config.baseUrl = await promptOptional(
        rl,
        "  Content7 base URL (default: https://api.content.ai):",
        "https://api.content.ai"
      );
      break;
    case "asana":
      config.token = secret;
      config.workspaceGid = await promptOptional(
        rl,
        "  Asana workspace GID (optional):",
        ""
      );
      break;
    case "jira-confluence":
      config.token = secret;
      config.cloudId = await promptOptional(rl, "  Atlassian cloud ID:", "");
      config.baseUrl = await promptOptional(
        rl,
        "  Jira/Confluence base URL (e.g. https://mycompany.atlassian.net):",
        ""
      );
      break;
    case "figma":
      config.personalAccessToken = secret;
      break;
  }

  return config;
}

// ---------------------------------------------------------------------------
// Non-interactive env-var collection
// ---------------------------------------------------------------------------

function collectFromEnv(def: McpServerDefinition): ServerConfig {
  const config: ServerConfig = {};
  const token = process.env[def.tokenEnvVar];

  if (!token) return config;

  switch (def.id) {
    case "github":
      config.token = token;
      config.repos = ["*"];
      config.apiUrl = "https://api.github.com";
      break;
    case "azure-devops":
      config.token = token;
      break;
    case "exa":
      config.apiKey = token;
      break;
    case "content7":
      config.apiKey = token;
      config.baseUrl = "https://api.content.ai";
      break;
    case "asana":
      config.token = token;
      break;
    case "jira-confluence":
      config.token = token;
      break;
    case "figma":
      config.personalAccessToken = token;
      break;
  }

  return config;
}

// ---------------------------------------------------------------------------
// Config file I/O
// ---------------------------------------------------------------------------

async function ensureDir(filePath: string): Promise<void> {
  await fs.mkdir(dirname(filePath), { recursive: true });
}

interface RawConfig {
  version?: number;
  servers?: Record<string, Record<string, unknown>>;
}

async function readConfig(path: string): Promise<RawConfig> {
  try {
    const content = await fs.readFile(path, "utf-8");
    return JSON.parse(content) as RawConfig;
  } catch {
    return {};
  }
}

async function writeConfig(
  path: string,
  scope: SetupScope,
  configs: Array<{ serverId: string; config: ServerConfig }>
): Promise<void> {
  const existing = await readConfig(path);
  const servers: Record<string, Record<string, unknown>> = existing.servers ?? {};

  for (const { serverId, config } of configs) {
    servers[serverId] = {
      ...(servers[serverId] ?? {}),
      ...config,
      _scope: scope,
    };
  }

  const output: RawConfig = { ...existing, servers };
  await ensureDir(path);
  await fs.writeFile(path, JSON.stringify(output, null, 2), "utf-8");
  await applyFilePermissions(path);
}

// ---------------------------------------------------------------------------
// Server validation (spawn-with-timeout)
// ---------------------------------------------------------------------------

async function spawnWithTimeout(
  cmd: string,
  args: string[],
  timeoutMs = 5000
): Promise<{ ok: boolean; error?: string }> {
  return new Promise((resolve) => {
    const proc = spawn(cmd, args, { stdio: "pipe" });
    let stderr = "";

    const timer = setTimeout(() => {
      proc.kill("SIGTERM");
      resolve({ ok: false, error: "spawn-with-timeout: process timed out" });
    }, timeoutMs);

    proc.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    proc.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve({ ok: true });
      } else {
        resolve({ ok: false, error: stderr.slice(0, 200) || `exit code ${code}` });
      }
    });

    proc.on("error", (err) => {
      clearTimeout(timer);
      resolve({ ok: false, error: err.message });
    });
  });
}

async function validateServer(
  def: McpServerDefinition
): Promise<{ ok: boolean; error?: string }> {
  if (!def.validationCommand) return { ok: true };
  const [cmd, ...args] = def.validationCommand;
  return spawnWithTimeout(cmd, args);
}

// ---------------------------------------------------------------------------
// Summary table
// ---------------------------------------------------------------------------

function printSummary(
  configured: Array<{ serverId: string; scope: SetupScope }>,
  failed: Array<{ serverId: string; error: string }>
): void {
  console.log("\n=== MCP Setup Summary ===\n");
  if (configured.length > 0) {
    console.log("Configured servers:");
    const table = configured.map(({ serverId, scope }) => {
      const def = MCP_SERVERS[serverId];
      return `  ${def?.name ?? serverId} (${scope})`;
    });
    console.log(table.join("\n"));
  }
  if (failed.length > 0) {
    console.log("\nFailed servers:");
    for (const { serverId, error } of failed) {
      const def = MCP_SERVERS[serverId];
      console.log(`  ${def?.name ?? serverId}: ${error}`);
    }
  }
  if (configured.length === 0 && failed.length === 0) {
    console.log("No servers configured.");
  }
}

// ---------------------------------------------------------------------------
// Main orchestrator
// ---------------------------------------------------------------------------

/**
 * Run the MCP setup wizard.
 *
 * @param interactive  Use readline prompts (true) or environment variables (false)
 * @param scope        'user' writes to ~/.omp/; 'workspace' writes to {cwd}/.omp/
 * @param cwd          Current working directory (default: process.cwd())
 * @param serverIds    Optional list of server IDs to configure; defaults to all 7
 */
export async function runMcpSetup(
  interactive: boolean,
  scope: SetupScope,
  cwd = process.cwd(),
  serverIds?: string[]
): Promise<SetupResult> {
  const configured: SetupResult["configured"] = [];
  const failed: SetupResult["failed"] = [];
  const warnings: SetupResult["warnings"] = [];

  const targets = serverIds ?? Object.keys(MCP_SERVERS);

  if (!interactive) {
    // Non-interactive: collect from env vars only
    for (const serverId of targets) {
      const def = MCP_SERVERS[serverId];
      if (!def) continue;

      const config = collectFromEnv(def);
      const hasToken =
        config.token || config.apiKey || config.personalAccessToken;
      if (!hasToken) continue; // skip — env var not set

      const configPath = getConfigPath(scope, cwd);
      await writeConfig(configPath, scope, [{ serverId, config }]);

      const validation = await validateServer(def);
      if (validation.ok) {
        configured.push({ serverId, scope });
      } else {
        failed.push({ serverId, error: validation.error ?? "validation failed" });
        warnings.push(
          `Warning: server '${serverId}' configured but validation failed: ${validation.error}`
        );
      }
    }
  } else {
    // Interactive
    const rl = createReadline();

    console.log(
      `\nOMP MCP Setup Wizard\n` +
        `Scope: ${scope}\n` +
        `Config file: ${getConfigPath(scope, cwd)}\n` +
        `Press Ctrl+C to abort.\n`
    );

    for (const serverId of targets) {
      const def = MCP_SERVERS[serverId];
      if (!def) continue;

      console.log(`\n--- ${def.name} ---`);

      const config = await collectServerConfig(rl, def);
      const hasToken =
        config.token || config.apiKey || config.personalAccessToken;
      if (!hasToken) {
        console.log("  Skipped (no credentials provided).");
        continue;
      }

      const configPath = getConfigPath(scope, cwd);
      await writeConfig(configPath, scope, [{ serverId, config }]);

      const validation = await validateServer(def);
      if (validation.ok) {
        configured.push({ serverId, scope });
        console.log(`  ${def.name} configured successfully.`);
      } else {
        failed.push({ serverId, error: validation.error ?? "validation failed" });
        warnings.push(
          `Warning: server '${serverId}' configured but validation failed: ${validation.error}`
        );
        console.warn(
          `  ${def.name} configured but validation failed: ${validation.error}`
        );
      }
    }

    rl.close();
  }

  printSummary(configured, failed);

  return {
    success: failed.length === 0,
    configured,
    failed,
    warnings,
  };
}
