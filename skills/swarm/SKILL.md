---
name: swarm
description: Parallel agent swarm for independent subtasks
trigger: "swarm:, /swarm, /omp:swarm"
autoinvoke: false
---
# Skill: Swarm

## Metadata

| Field | Value |
|-------|-------|
| **ID** | `swarm` |
| **Keywords** | `swarm:`, `/swarm` |
| **Tier** | Execution Mode |
| **Source** | `src/skills/swarm.mts` |

## Description

Swarm orchestration with shared state. Multiple agents work on sub-problems simultaneously.

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

Activates the `swarm` shared-state orchestration by spawning `bin/omp.mjs swarm [args]`. No persistent resources are maintained.
