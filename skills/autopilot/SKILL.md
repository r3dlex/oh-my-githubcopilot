---
name: autopilot
description: Autonomous end-to-end execution from idea to working code
trigger: "autopilot:, /autopilot, /omp:autopilot"
autoinvoke: false
---
# Skill: Autopilot

## Metadata

| Field | Value |
|-------|-------|
| **ID** | `autopilot` |
| **Keywords** | `autopilot:`, `/autopilot` |
| **Tier** | Execution Mode |
| **Source** | `src/skills/autopilot.mts` |

## Description

Autonomous end-to-end execution from idea to working code. Handles routing, delegation, and verification internally.

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

Activates the `autopilot` orchestration mode by spawning `bin/omp.mjs autopilot [args]`. No persistent resources are maintained.
