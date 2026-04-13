---
name: setup
description: OMP setup and onboarding wizard
trigger: "setup:, /setup, /omp:setup"
autoinvoke: false
---
# Skill: Setup

## Metadata

| Field | Value |
|-------|-------|
| **ID** | `setup` |
| **Keywords** | `setup:`, `/setup` |
| **Tier** | Developer Tool |
| **Source** | `src/skills/setup.mts` |

## Description

Orchestrates both phases of the OMP setup wizard:
- Phase 1: Base OMP setup (SQLite DB, directory structure, first-run guidance)
- Phase 2: MCP server configuration (via `mcp-setup` skill)

For MCP-only setup, use the `mcp-setup` skill instead.

## Interface

```typescript
interface SkillInput {
  trigger: string;
  args: string[];
}

interface SkillOutput {
  status: "ok" | "error";
  message: string;
}

export async function activate(input: SkillInput): Promise<SkillOutput>
```

## Implementation

Spawns `node bin/omp.mjs setup [args]` with optional flags:
- `--mcp-only`: Skip to MCP configuration only
- `--skip-mcp`: Skip MCP configuration
- `--non-interactive`: Run without user prompts

No persistent resources are maintained.
