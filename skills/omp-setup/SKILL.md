---
name: omp-setup
description: OMP onboarding and configuration wizard
trigger: "setup:, /setup, /omp:setup, /omp-setup"
autoinvoke: false
---
# Skill: OMP-Setup

## Metadata

| Field | Value |
|-------|-------|
| **ID** | `omp-setup` |
| **Keywords** | `setup:`, `/setup` |
| **Tier** | Developer Tool |
| **Source** | `src/skills/omp-setup.mts` |

## Description

Orchestrates the OMP setup wizard:
- Phase 1: Base OMP setup (directory structure, first-run guidance)
- Phase 2: MCP server configuration

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
export function deactivate(): void
```

## Implementation

Spawns `bin/omp.mjs setup [args]`. No persistent resources are maintained.
