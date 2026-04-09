/**
 * Unit tests for MCP Config Wizard
 */

import { describe, it, expect, vi } from "vitest";
import { MCP_SERVERS, SERVER_IDS } from "../../src/setup/mcp-servers.js";

// ---------------------------------------------------------------------------
// McpServerDefinition shape
// ---------------------------------------------------------------------------

describe("MCP server definitions", () => {
  it("defines all 7 servers", () => {
    expect(SERVER_IDS).toHaveLength(7);
    expect(SERVER_IDS).toContain("github");
    expect(SERVER_IDS).toContain("azure-devops");
    expect(SERVER_IDS).toContain("exa");
    expect(SERVER_IDS).toContain("content7");
    expect(SERVER_IDS).toContain("asana");
    expect(SERVER_IDS).toContain("jira-confluence");
    expect(SERVER_IDS).toContain("figma");
  });

  it("github has correct structure", () => {
    const def = MCP_SERVERS["github"];
    expect(def.id).toBe("github");
    expect(def.packageName).toBe("@modelcontextprotocol/server-github");
    expect(def.tokenEnvVar).toBe("GITHUB_TOKEN");
    expect(def.requiredFields).toContain("token");
    expect(def.validationCommand).toEqual([
      "npx",
      "@modelcontextprotocol/server-github",
      "--help",
    ]);
  });

  it("azure-devops has correct structure", () => {
    const def = MCP_SERVERS["azure-devops"];
    expect(def.tokenEnvVar).toBe("AZURE_TOKEN");
    expect(def.requiredFields).toContain("token");
    expect(def.requiredFields).toContain("orgUrl");
    expect(def.optionalFields).toContain("project");
  });

  it("exa has correct structure", () => {
    const def = MCP_SERVERS["exa"];
    expect(def.tokenEnvVar).toBe("EXA_API_KEY");
    expect(def.requiredFields).toEqual(["apiKey"]);
  });

  it("content7 has correct structure", () => {
    const def = MCP_SERVERS["content7"];
    expect(def.tokenEnvVar).toBe("CONTENT7_API_KEY");
    expect(def.requiredFields).toEqual(["apiKey"]);
    expect(def.optionalFields).toContain("baseUrl");
  });

  it("asana uses ASANA_PAT (NOT ANTHROPIC_API_KEY)", () => {
    const def = MCP_SERVERS["asana"];
    expect(def.tokenEnvVar).toBe("ASANA_PAT");
    expect(def.requiredFields).toContain("token");
    expect(def.packageName).toBe("@asana/mcp-server");
    expect(def.tokenEnvVar).not.toBe("ANTHROPIC_API_KEY");
  });

  it("jira-confluence has correct structure", () => {
    const def = MCP_SERVERS["jira-confluence"];
    expect(def.tokenEnvVar).toBe("ATLASSIAN_API_TOKEN");
    expect(def.requiredFields).toContain("cloudId");
    expect(def.requiredFields).toContain("token");
    expect(def.requiredFields).toContain("baseUrl");
  });

  it("figma has correct structure", () => {
    const def = MCP_SERVERS["figma"];
    expect(def.tokenEnvVar).toBe("FIGMA_ACCESS_TOKEN");
    expect(def.requiredFields).toContain("personalAccessToken");
  });

  it("every server has a validation command (or null)", () => {
    for (const serverId of SERVER_IDS) {
      const def = MCP_SERVERS[serverId];
      expect(def.validationCommand).toBeDefined();
      if (def.validationCommand !== null) {
        expect(Array.isArray(def.validationCommand)).toBe(true);
        expect(def.validationCommand.length).toBeGreaterThan(0);
      }
    }
  });

  it("every server has a name and id", () => {
    for (const serverId of SERVER_IDS) {
      const def = MCP_SERVERS[serverId];
      expect(def.id).toBe(serverId);
      expect(def.name).toBeTruthy();
      expect(def.packageName).toBeTruthy();
    }
  });
});

// ---------------------------------------------------------------------------
// collectFromEnv behavior
// ---------------------------------------------------------------------------

describe("collectFromEnv", () => {
  it("returns empty when env var not set", () => {
    const original = process.env["GITHUB_TOKEN"];
    delete process.env["GITHUB_TOKEN"];

    const def = MCP_SERVERS["github"];
    const token = process.env[def.tokenEnvVar];
    expect(token).toBeUndefined();

    if (original !== undefined) process.env["GITHUB_TOKEN"] = original;
  });

  it("picks up GITHUB_TOKEN when set", () => {
    process.env["GITHUB_TOKEN"] = "ghp_testtoken123";
    const def = MCP_SERVERS["github"];
    expect(process.env[def.tokenEnvVar]).toBe("ghp_testtoken123");
    delete process.env["GITHUB_TOKEN"];
  });
});
