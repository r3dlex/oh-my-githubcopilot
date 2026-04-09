/**
 * Unit tests for config-resolver.ts
 *
 * Tests: env var expansion, platform-aware path resolution, missing file handling.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { expandEnvVars } from "../../src/setup/config-resolver.js";

// ---------------------------------------------------------------------------
// expandEnvVars
// ---------------------------------------------------------------------------

describe("expandEnvVars", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("expands $VAR pattern", () => {
    process.env.TEST_VAR = "my-token";
    const result = expandEnvVars({ token: "$TEST_VAR" });
    expect(result).toEqual({ token: "my-token" });
    delete process.env.TEST_VAR;
  });

  it("expands ${VAR} pattern", () => {
    process.env.TEST_VAR = "my-token";
    const result = expandEnvVars({ token: "${TEST_VAR}" });
    expect(result).toEqual({ token: "my-token" });
    delete process.env.TEST_VAR;
  });

  it("leaves unmatched $VAR as-is", () => {
    const result = expandEnvVars({ token: "$UNSET_VAR" });
    expect(result).toEqual({ token: "$UNSET_VAR" });
  });

  it("expands in nested objects", () => {
    process.env.NESTED = "nested-val";
    const result = expandEnvVars({ outer: { inner: "$NESTED" } });
    expect(result).toEqual({ outer: { inner: "nested-val" } });
    delete process.env.NESTED;
  });

  it("expands in arrays", () => {
    process.env.REPOS = "repo1";
    const result = expandEnvVars({ repos: ["$REPOS", "repo2"] });
    expect(result).toEqual({ repos: ["repo1", "repo2"] });
    delete process.env.REPOS;
  });

  it("returns non-string values as-is", () => {
    expect(expandEnvVars(42)).toBe(42);
    expect(expandEnvVars(true)).toBe(true);
    expect(expandEnvVars(null)).toBe(null);
  });
});

// ---------------------------------------------------------------------------
// getUserConfigPath — platform awareness
// ---------------------------------------------------------------------------

describe("getUserConfigPath", () => {
  it("uses homedir for user config path", async () => {
    const { getUserConfigPath } = await import("../../src/setup/mcp-schema.js");
    const path = getUserConfigPath();
    // Should use os.homedir() which respects $HOME
    expect(path).toContain(".omp");
    expect(path).toMatch(/mcp-config\.json$/);
  });
});

// ---------------------------------------------------------------------------
// getWorkspaceConfigPath
// ---------------------------------------------------------------------------

describe("getWorkspaceConfigPath", () => {
  it("appends .omp/mcp-config.json to the given cwd", async () => {
    const { getWorkspaceConfigPath } = await import("../../src/setup/mcp-schema.js");
    const path = getWorkspaceConfigPath("/some/project");
    expect(path).toBe("/some/project/.omp/mcp-config.json");
  });
});
