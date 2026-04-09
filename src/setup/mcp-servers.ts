/**
 * MCP Server Definitions
 *
 * Defines the 7 external MCP servers managed by OMP's setup wizard.
 * Each server has a package name, required environment variable for credentials,
 * required/optional config fields, and a validation command.
 */

export interface McpServerDefinition {
  id: string;
  name: string;
  packageName: string;
  tokenEnvVar: string;
  requiredFields: string[];
  optionalFields: string[];
  /** Validation command run via spawnWithTimeout; null = skip validation */
  validationCommand: string[] | null;
}

export const MCP_SERVERS: Record<string, McpServerDefinition> = {
  github: {
    id: "github",
    name: "GitHub",
    packageName: "@modelcontextprotocol/server-github",
    tokenEnvVar: "GITHUB_TOKEN",
    requiredFields: ["token"],
    optionalFields: ["repos", "apiUrl"],
    validationCommand: ["npx", "@modelcontextprotocol/server-github", "--help"],
  },

  "azure-devops": {
    id: "azure-devops",
    name: "Azure DevOps",
    packageName: "@modelcontextprotocol/server-azure-devops",
    tokenEnvVar: "AZURE_TOKEN",
    requiredFields: ["token", "orgUrl"],
    optionalFields: ["project"],
    validationCommand: ["npx", "@modelcontextprotocol/server-azure-devops", "--help"],
  },

  exa: {
    id: "exa",
    name: "Exa",
    packageName: "@modelcontextprotocol/server-exa",
    tokenEnvVar: "EXA_API_KEY",
    requiredFields: ["apiKey"],
    optionalFields: [],
    validationCommand: ["npx", "@modelcontextprotocol/server-exa", "--help"],
  },

  content7: {
    id: "content7",
    name: "Content7",
    packageName: "@anthropic-ai/mcp-server-content7",
    tokenEnvVar: "CONTENT7_API_KEY",
    requiredFields: ["apiKey"],
    optionalFields: ["baseUrl"],
    validationCommand: ["npx", "@anthropic-ai/mcp-server-content7", "--help"],
  },

  asana: {
    id: "asana",
    name: "Asana",
    packageName: "@asana/mcp-server",
    tokenEnvVar: "ASANA_PAT",
    requiredFields: ["token"],
    optionalFields: ["workspaceGid"],
    validationCommand: ["npx", "@asana/mcp-server", "--help"],
  },

  "jira-confluence": {
    id: "jira-confluence",
    name: "Jira / Confluence",
    packageName: "@atlassian/mcp-server",
    tokenEnvVar: "ATLASSIAN_API_TOKEN",
    requiredFields: ["cloudId", "token", "baseUrl"],
    optionalFields: [],
    validationCommand: ["npx", "@atlassian/mcp-server", "--help"],
  },

  figma: {
    id: "figma",
    name: "Figma",
    packageName: "@modelcontextprotocol/server-figma",
    tokenEnvVar: "FIGMA_ACCESS_TOKEN",
    requiredFields: ["personalAccessToken"],
    optionalFields: [],
    validationCommand: ["npx", "@modelcontextprotocol/server-figma", "--help"],
  },
};

export const SERVER_IDS = Object.keys(MCP_SERVERS);
