---
name: mcp-setup
description: MCP server configuration wizard
trigger: "mcp:, mcp-setup:, /mcp, /mcp-setup, /omp:mcp-setup"
autoinvoke: false
---
# Skill: MCP-Setup

## Metadata

| Field | Value |
|-------|-------|
| **ID** | `mcp-setup` |
| **Keywords** | `mcp-setup:`, `/mcp` |
| **Tier** | Developer Tool |
| **Source** | `src/skills/mcp-setup.mts` |

## Description

MCP Setup Skill — configure MCP servers for OMP. Uses --mcp-only --non-interactive for programmatic invocation.

## Interface

```typescript
interface McpSetupSkillInput {
  args?: string[];
}

interface McpSetupSkillOutput {
  status: "ok" | "error";
  message: string;
  hud?: string;
}

export async function activateMcpSetupSkill(input?: McpSetupSkillInput): Promise<McpSetupSkillOutput>
```

## Implementation

Spawns `omp setup --mcp-only [args]` for MCP configuration. No persistent resources are maintained.
