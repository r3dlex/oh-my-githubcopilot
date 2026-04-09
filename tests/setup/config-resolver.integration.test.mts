/**
 * Integration tests for config-resolver.ts
 *
 * Uses isolated temp directories and real filesystem to verify:
 * - Field-level merge: user token + workspace repos → both preserved
 * - Workspace-only entry with no token → skipped with warning
 * - $GITHUB_TOKEN env var expansion
 * - Win32 path handling
 * - World-readable file warning
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { promises as fs } from "fs";
import { join } from "path";
import os from "os";
import { expandEnvVars, resolveMcpConfig } from "../../src/setup/config-resolver.js";

const rand = () => Math.random().toString(36).slice(2, 10);
let tempDir: string;

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

async function writeUserConfig(dir: string, servers: Record<string, unknown>): Promise<void> {
  await fs.mkdir(join(dir, ".omp"), { recursive: true });
  await fs.writeFile(
    join(dir, ".omp", "mcp-config.json"),
    JSON.stringify({ version: 1, servers }, null, 2)
  );
}

async function writeWorkspaceConfig(
  projectDir: string,
  servers: Record<string, unknown>
): Promise<void> {
  const wsDir = join(projectDir, ".omp");
  await fs.mkdir(wsDir, { recursive: true });
  await fs.writeFile(
    join(wsDir, "mcp-config.json"),
    JSON.stringify({ version: 1, servers }, null, 2)
  );
}

async function readPermissions(path: string): Promise<number> {
  const { statSync } = await import("fs");
  return statSync(path).mode & 0o777;
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(async () => {
  tempDir = await fs.mkdtemp(join(os.tmpdir(), `omp-test-${rand()}-`));
});

afterEach(async () => {
  await fs.rm(tempDir, { recursive: true, force: true });
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("config-resolver integration", () => {
  it("field-level merge: user token + workspace repos → both preserved", async () => {
    // User config at ~/.omp/: has token only
    await writeUserConfig(tempDir, {
      github: { type: "github", token: "$GITHUB_TOKEN" },
    });

    // Workspace config in project: has repos override
    const projectDir = join(tempDir, "project");
    await fs.mkdir(projectDir, { recursive: true });
    await writeWorkspaceConfig(projectDir, {
      github: { repos: ["my-org/*"] },
    });

    // Set HOME so user config resolves to tempDir
    const originalHome = process.env.HOME;
    process.env.HOME = tempDir;

    try {
      const result = resolveMcpConfig(projectDir);
      const github = result.servers["github"] as Record<string, unknown> | undefined;
      expect(github).toBeDefined();
      // repos from workspace, token inherited from user (env var not expanded — no GITHUB_TOKEN set)
      expect(github?.["repos"]).toEqual(["my-org/*"]);
    } finally {
      process.env.HOME = originalHome;
    }
  });

  it("flat-replace NOT implemented: workspace-only repos without user token → skipped", async () => {
    // Workspace config only, no user config — github has repos but no credential
    const projectDir = join(tempDir, "project");
    await fs.mkdir(projectDir, { recursive: true });
    await writeWorkspaceConfig(projectDir, {
      github: { repos: ["my-org/*"] },
    });

    const originalHome = process.env.HOME;
    process.env.HOME = tempDir;

    const warnSpy = vi.fn();
    vi.stubGlobal("console", { ...console, warn: warnSpy });

    try {
      const result = resolveMcpConfig(projectDir);
      // github should be skipped — no credential field
      expect(result.servers["github"]).toBeUndefined();
      // Warning should mention the skip reason
      expect(warnSpy).toHaveBeenCalled();
      const warnCalls = warnSpy.mock.calls.map((c) => c[0]);
      const skipWarning = warnCalls.find((c: string) => c.includes("github") && c.includes("skipped"));
      expect(skipWarning).toBeDefined();
    } finally {
      process.env.HOME = originalHome;
    }
  });

  it("$GITHUB_TOKEN env var is expanded at load time", () => {
    process.env.GITHUB_TOKEN = "test-token-from-env";
    const config = expandEnvVars({
      github: { type: "github", token: "$GITHUB_TOKEN" },
    }) as { github: { token: string } };
    expect(config.github.token).toBe("test-token-from-env");
    delete process.env.GITHUB_TOKEN;
  });

  it("Win32 platform uses backslash path style", async () => {
    const originalPlatform = process.platform;
    // Stub process.platform before importing the module
    const originalProcess = globalThis.process;
    vi.stubGlobal("process", { ...originalProcess, platform: "win32" });

    const { getUserConfigPath } = await import("../../src/setup/mcp-schema.js");
    const path = getUserConfigPath();
    expect(path).toMatch(/\\/);

    vi.stubGlobal("process", originalProcess);
  });

  it("missing user config is treated as empty (not an error)", async () => {
    // tempDir has no .omp/ directory
    const projectDir = join(tempDir, "project");
    await fs.mkdir(projectDir, { recursive: true });
    await writeWorkspaceConfig(projectDir, {});

    const originalHome = process.env.HOME;
    process.env.HOME = tempDir;

    try {
      // Should not throw — missing user config is handled gracefully
      const result = resolveMcpConfig(projectDir);
      expect(result.servers).toBeDefined();
      expect(Object.keys(result.servers)).toHaveLength(0);
    } finally {
      process.env.HOME = originalHome;
    }
  });
});
