---
name: omp-plan
description: OMP-aware strategic planning
trigger: "plan:, /plan, /omp:plan, /omp-plan"
autoinvoke: false
---
# Skill: OMP-Plan

## Metadata

| Field | Value |
|-------|-------|
| **ID** | `omp-plan` |
| **Keywords** | `plan:`, `/plan` |
| **Tier** | Execution Mode |
| **Source** | `src/skills/omp-plan.mts` |

## Description

Strategic planning mode with optional interview workflow. Delays implementation until plan is approved.

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

Activates the `plan` strategic planning mode by spawning `bin/omp.mjs plan [args]`. No persistent resources are maintained.
