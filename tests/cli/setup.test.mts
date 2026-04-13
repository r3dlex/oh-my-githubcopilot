import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { promises as fs } from "fs";
import os from "os";
import { join } from "path";

vi.mock("../../src/setup/mcp-config-wizard.js", () => ({
  runMcpSetup: vi.fn(async () => ({
    success: true,
    configured: [],
    failed: [],
    warnings: [],
  })),
}));

const REQUIRED_EXPERIMENTAL_FEATURES = [
  "STATUS_LINE",
  "SHOW_FILE",
  "EXTENSIONS",
  "BACKGROUND_SESSIONS",
  "CONFIGURE_COPILOT_AGENT",
  "MULTI_TURN_AGENTS",
  "SESSION_STORE",
];

let tempDir: string;

async function readCopilotConfig() {
  const raw = await fs.readFile(join(tempDir, ".copilot", "config.json"), "utf-8");
  return JSON.parse(raw) as Record<string, unknown>;
}

beforeEach(async () => {
  tempDir = await fs.mkdtemp(join(os.tmpdir(), "omp-setup-cli-"));
  vi.stubEnv("HOME", tempDir);
  delete process.env["OMP_COPILOT_REQUIRED_EXPERIMENTAL_FEATURES"];
  delete process.env["OMP_COPILOT_STATUS_LINE_COMMAND"];
});

afterEach(async () => {
  vi.unstubAllEnvs();
  await fs.rm(tempDir, { recursive: true, force: true });
});

describe("runSetupCli", () => {
  it("merges Copilot experimental features and statusLine defaults", async () => {
    const { runSetupCli } = await import("../../src/cli/setup.ts");

    await runSetupCli(tempDir, {
      mcpOnly: false,
      skipMcp: true,
      nonInteractive: true,
      workspace: false,
    });

    const config = await readCopilotConfig();
    expect(config.experimental).toBe(true);
    expect(config.experimentalFeatures).toEqual(
      expect.arrayContaining(REQUIRED_EXPERIMENTAL_FEATURES)
    );
    expect(config.statusLine).toMatchObject({ type: "command" });
    expect(config.statusLine.command).toContain("bin/omp-statusline.sh");
  });

  it("preserves existing custom statusLine command while appending missing OMP flags", async () => {
    await fs.mkdir(join(tempDir, ".copilot"), { recursive: true });
    await fs.writeFile(
      join(tempDir, ".copilot", "config.json"),
      JSON.stringify(
        {
          experimental: false,
          experimentalFeatures: ["SHOW_FILE", "CUSTOM_FLAG"],
          statusLine: {
            command: "/tmp/custom-statusline.sh",
          },
          trusted_folders: ["/tmp/project"],
        },
        null,
        2
      )
    );

    const { runSetupCli } = await import("../../src/cli/setup.ts");

    await runSetupCli(tempDir, {
      mcpOnly: false,
      skipMcp: true,
      nonInteractive: true,
      workspace: false,
    });

    const config = await readCopilotConfig();
    expect(config.experimental).toBe(true);
    expect(config.experimentalFeatures).toEqual(
      expect.arrayContaining(["CUSTOM_FLAG", ...REQUIRED_EXPERIMENTAL_FEATURES])
    );
    expect(config.statusLine).toEqual({
      type: "command",
      command: "/tmp/custom-statusline.sh",
    });
    expect(config.trusted_folders).toEqual(["/tmp/project"]);
  });
});
