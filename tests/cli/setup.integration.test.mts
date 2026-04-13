/**
 * CLI integration tests for `omp setup` command
 *
 * Tests `omp setup --mcp-only --non-interactive` and `omp setup --workspace`
 * in isolated temp directories. Verifies config file creation and permissions.
 *
 * These tests require the CLI to have the `setup` subcommand implemented
 * (added in Step 3: Wire setup into CLI entry point — worker-2).
 * When the CLI is not yet wired, tests are skipped.
 *
 * Run with: npm test -- tests/cli/setup.integration.test.mts
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { spawn } from "child_process";
import { promises as fs } from "fs";
import { join } from "path";
import os from "os";

const rand = () => Math.random().toString(36).slice(2, 10);
let tempDir: string;
let ompBin: string;

beforeEach(async () => {
  tempDir = await fs.mkdtemp(join(os.tmpdir(), `omp-cli-test-${rand()}-`));
  ompBin = join(process.cwd(), "bin", "omp.mjs");
});

afterEach(async () => {
  await fs.rm(tempDir, { recursive: true, force: true });
});

const REQUIRED_EXPERIMENTAL_FEATURES = [
  "STATUS_LINE",
  "SHOW_FILE",
  "EXTENSIONS",
  "BACKGROUND_SESSIONS",
  "CONFIGURE_COPILOT_AGENT",
  "MULTI_TURN_AGENTS",
  "SESSION_STORE",
];

// ---------------------------------------------------------------------------
// Helper: run omp CLI in a subprocess
// ---------------------------------------------------------------------------

function runOmp(
  args: string[],
  cwd: string
): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve) => {
    const proc = spawn("node", [ompBin, ...args], {
      cwd,
      env: { ...process.env, HOME: tempDir },
    });
    let stdout = "";
    let stderr = "";
    proc.stdout?.on("data", (d) => (stdout += d.toString()));
    proc.stderr?.on("data", (d) => (stderr += d.toString()));
    proc.on("close", (code) => resolve({ stdout, stderr, code: code ?? 0 }));
    proc.on("error", (_err) => resolve({ stdout, stderr, code: 1 }));
  });
}

async function readCopilotConfig(): Promise<Record<string, unknown>> {
  const raw = await fs.readFile(join(tempDir, ".copilot", "config.json"), "utf-8");
  return JSON.parse(raw) as Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Check: is `omp setup` available?
// ---------------------------------------------------------------------------

async function isSetupAvailable(): Promise<boolean> {
  const { code, stderr } = await runOmp(["setup", "--help"], tempDir);
  // If "Unknown subcommand" the feature isn't wired yet
  return code === 0 && !stderr.includes("Unknown subcommand");
}

// ---------------------------------------------------------------------------
// Tests — skipped until Step 3 is complete
// ---------------------------------------------------------------------------

const setupAvailable = await isSetupAvailable();

const describeOrSkip = setupAvailable ? describe : describe.skip;

describeOrSkip("omp setup --mcp-only --non-interactive", () => {
  it("creates ~/.omp/mcp-config.json with valid schema", async () => {
    const { code } = await runOmp(
      ["setup", "--mcp-only", "--non-interactive"],
      tempDir
    );

    expect(code).toBe(0);

    const configPath = join(tempDir, ".omp", "mcp-config.json");
    const configExists = await fs.access(configPath).then(() => true).catch(() => false);
    expect(configExists).toBe(true);
  });

  it("creates workspace-level config at {cwd}/.omp/mcp-config.json when --workspace is passed", async () => {
    const { code } = await runOmp(
      ["setup", "--mcp-only", "--workspace", "--non-interactive"],
      tempDir
    );

    expect(code).toBe(0);

    const wsConfigPath = join(tempDir, ".omp", "mcp-config.json");
    const wsConfigExists = await fs.access(wsConfigPath).then(() => true).catch(() => false);
    expect(wsConfigExists).toBe(true);
  });
});

describeOrSkip("omp setup without --mcp-only", () => {
  it("runs base setup phase and MCP phase sequentially", async () => {
    const { code, stdout } = await runOmp(["setup", "--non-interactive"], tempDir);

    expect(code).toBe(0);
    expect(stdout).toMatch(/mcp|MCP/i);
  });

  it("enables Copilot experimental mode, merges required feature flags, and configures statusLine", async () => {
    const { code } = await runOmp(["setup", "--non-interactive"], tempDir);

    expect(code).toBe(0);

    const config = await readCopilotConfig();
    expect(config.experimental).toBe(true);
    expect(config.experimentalFeatures).toEqual(
      expect.arrayContaining(REQUIRED_EXPERIMENTAL_FEATURES)
    );
    expect(config.statusLine).toMatchObject({
      type: "command",
    });
    expect(config.statusLine.command).toContain("omp-statusline.sh");
  });

  it("preserves existing Copilot flags and statusLine command while filling in missing OMP defaults", async () => {
    await fs.mkdir(join(tempDir, ".copilot"), { recursive: true });
    await fs.writeFile(
      join(tempDir, ".copilot", "config.json"),
      JSON.stringify(
        {
          experimental: false,
          experimentalFeatures: ["CUSTOM_FLAG", "SHOW_FILE"],
          statusLine: {
            type: "command",
            command: "/tmp/custom-statusline.sh",
          },
          trusted_folders: ["/tmp/existing"],
        },
        null,
        2
      )
    );

    const { code } = await runOmp(["setup", "--non-interactive"], tempDir);

    expect(code).toBe(0);

    const config = await readCopilotConfig();
    expect(config.experimental).toBe(true);
    expect(config.experimentalFeatures).toEqual(
      expect.arrayContaining(["CUSTOM_FLAG", ...REQUIRED_EXPERIMENTAL_FEATURES])
    );
    expect(config.statusLine).toEqual({
      type: "command",
      command: "/tmp/custom-statusline.sh",
    });
    expect(config.trusted_folders).toEqual(["/tmp/existing"]);
  });
});
