---
name: ultrawork
description: Parallel multi-agent high-throughput implementation
trigger: "ulw:, ultrawork:, /ulw, /ultrawork, /omp:ulw, /omp:ultrawork"
autoinvoke: false
---
# Skill: Ultrawork

## Metadata

| Field | Value |
|-------|-------|
| **ID** | `ultrawork` |
| **Keywords** | `ulw:`, `/ulw`, `ultrawork:` |
| **Tier** | Execution Mode |
| **Source** | `src/skills/ultrawork.mts` |

## Description

Parallel execution engine. Spawns multiple agents simultaneously for high-throughput task completion.

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

Activates the `ultrawork` parallel execution mode by spawning `bin/omp.mjs ultrawork [args]`. No persistent resources are maintained.
