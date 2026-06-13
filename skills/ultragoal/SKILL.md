---
name: ultragoal
description: Durable goal ledger in .omp/ultragoal/ with fail-closed checkpoints
trigger: "ultragoal:, /ultragoal, /omp:ultragoal"
autoinvoke: false
---
# Skill: UltraGoal

## Metadata

| Field | Value |
|-------|-------|
| **ID** | `ultragoal` |
| **Keywords** | `ultragoal:`, `/ultragoal` |
| **Tier** | Planning Tool |
| **Source** | `src/skills/ultragoal.mts` |

## Description

Durable goal ledger that persists goals in `.omp/ultragoal/goals.json` with fail-closed checkpoints. Goals survive session restarts and context resets. Each goal is assigned an ID, status, and creation timestamp. Supports adding new goals, listing current goals, and marking goals complete or failed.

## Interface

```typescript
interface SkillInput { trigger: string; args: string[]; }
interface SkillOutput { status: "ok" | "error"; message: string; }
export async function activate(input: SkillInput): Promise<SkillOutput>
export function deactivate(): void
```

## Implementation

Activates the `ultragoal` mode by spawning `bin/omp.mjs ultragoal [args]`. The CLI handler creates or reads `.omp/ultragoal/goals.json`, adds new goals from args, and prints the current goal list. No persistent resources are maintained by the skill itself.
