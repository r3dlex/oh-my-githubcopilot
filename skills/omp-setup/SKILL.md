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
- Phase 1.5: Merge required Copilot experimental features into `~/.copilot/config.json`
- Phase 1.5: Ensure Copilot `statusLine` points at OMP's packaged status-line script without overwriting an existing custom command
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

Spawns `bin/omp.mjs setup [args]` from the packaged plugin root so setup works from arbitrary workspaces.
The spawned process receives default OMP Copilot setup env values:

- `OMP_COPILOT_REQUIRED_EXPERIMENTAL_FEATURES`
- `OMP_COPILOT_STATUS_LINE_COMMAND`

No persistent resources are maintained by the skill wrapper itself.
