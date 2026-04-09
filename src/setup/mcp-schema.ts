/**
 * MCP Server Configuration Schema
 *
 * Defines the union type for all supported MCP server entries and the
 * resolved merged configuration shape.
 *
 * ADR-001: Field-level per-server merge (user config provides defaults,
 * workspace config overrides specific fields per server).
 * ADR-002: Credentials stored in JSON with chmod 0600 on Unix;
 * env var expansion supported via $VAR pattern.
 */

import { homedir } from "os";

// ---------------------------------------------------------------------------
// Server entry union
// ---------------------------------------------------------------------------

export type McpServerEntry =
  | GitHubEntry
  | AzureDevOpsEntry
  | ExaEntry
  | Content7Entry
  | AsanaEntry
  | JiraConfluenceEntry
  | FigmaEntry;

export interface GitHubEntry {
  id: "github";
  type: "github";
  /** Bearer token for github.com */
  token: string;
  /** Repo scope filter (default ["*] = all repos) */
  repos?: string[];
  /** GitHub Enterprise API URL (optional) */
  apiUrl?: string;
}

export interface AzureDevOpsEntry {
  id: "azure-devops";
  type: "azure-devops";
  /** Personal Access Token */
  token: string;
  /** Azure DevOps organization URL */
  orgUrl: string;
  /** Specific project name (optional) */
  project?: string;
}

export interface ExaEntry {
  id: "exa";
  type: "exa";
  /** Exa API key */
  apiKey: string;
}

export interface Content7Entry {
  id: "content7";
  type: "content7";
  /** Content7 API key */
  apiKey: string;
  /** Base URL (defaults to public API) */
  baseUrl?: string;
}

export interface AsanaEntry {
  id: "asana";
  type: "asana";
  /** Asana Personal Access Token */
  token: string;
  /** Workspace GID to operate in (optional) */
  workspaceGid?: string;
}

export interface JiraConfluenceEntry {
  id: "jira-confluence";
  type: "jira-confluence";
  /** Atlassian cloud ID */
  cloudId: string;
  /** API token */
  token: string;
  /** Base URL (e.g. https://your-domain.atlassian.net) */
  baseUrl: string;
}

export interface FigmaEntry {
  id: "figma";
  type: "figma";
  /** Figma personal access token */
  personalAccessToken: string;
}

// ---------------------------------------------------------------------------
// Raw config shapes (before env var expansion)
// ---------------------------------------------------------------------------

export interface RawUserConfig {
  version?: number;
  servers?: Partial<Record<string, McpServerEntry>>;
}

export interface RawWorkspaceConfig {
  version?: number;
  servers?: Partial<Record<string, McpServerEntry>>;
}

// ---------------------------------------------------------------------------
// Resolved config (after merge + env var expansion)
// ---------------------------------------------------------------------------

export type ResolvedMcpConfig = {
  servers: Record<string, McpServerEntry>;
};

// ---------------------------------------------------------------------------
// Platform-aware config file paths
// ---------------------------------------------------------------------------

/** User-level config path: ~/.omp/mcp-config.json (Unix) or %USERPROFILE%\.omp\ (Win32) */
export function getUserConfigPath(): string {
  const home = homedir();
  if (process.platform === "win32") {
    return `${home}\\.omp\\mcp-config.json`;
  }
  return `${home}/.omp/mcp-config.json`;
}

/** Workspace-level config path: {cwd}/.omp/mcp-config.json */
export function getWorkspaceConfigPath(cwd: string): string {
  return `${cwd}/.omp/mcp-config.json`;
}

// ---------------------------------------------------------------------------
// JSON schema (for documentation / validation)
// ---------------------------------------------------------------------------

/** JSON schema for mcp-config.json — use this to validate configs */
export const MCP_CONFIG_JSON_SCHEMA = {
  type: "object",
  additionalProperties: true,
  properties: {
    version: { type: "number", description: "Config format version (currently 1)" },
    servers: {
      type: "object",
      additionalProperties: true,
      description: "MCP server entries keyed by server id",
    },
  },
} as const;
