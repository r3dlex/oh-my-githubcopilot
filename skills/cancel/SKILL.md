---
name: cancel
description: Ends active execution modes and clears .omp/state/
trigger: "cancel:, /cancel, /omp:cancel"
autoinvoke: false
---
# Skill: Cancel

## Metadata

| Field | Value |
|-------|-------|
| **ID** | `cancel` |
| **Keywords** | `cancel:`, `/cancel` |
| **Tier** | Execution Mode |
| **Source** | `src/skills/cancel.mts` |

## Description

Ends any active execution mode (autopilot, ralph, team, ultrawork, etc.) and clears the `.omp/state/` directory so the next session starts clean. Safe to call at any time — if no session is active the command is a no-op.

## Interface

```typescript
interface SkillInput { trigger: string; args: string[]; }
interface SkillOutput { status: "ok" | "error"; message: string; }
export async function activate(input: SkillInput): Promise<SkillOutput>
export function deactivate(): void
```

## Implementation

Activates the `cancel` mode by spawning `bin/omp.mjs cancel [args]`. The CLI handler removes `.omp/state/` using `fs.rmSync` and prints a confirmation message. No persistent resources are maintained.
