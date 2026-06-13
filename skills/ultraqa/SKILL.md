---
name: ultraqa
description: QA cycle loop with qa-tester agent; runs until all checks pass
trigger: "ultraqa:, /ultraqa, /omp:ultraqa"
autoinvoke: false
---
# Skill: UltraQA

## Metadata

| Field | Value |
|-------|-------|
| **ID** | `ultraqa` |
| **Keywords** | `ultraqa:`, `/ultraqa` |
| **Tier** | Execution Mode |
| **Source** | `src/skills/ultraqa.mts` |

## Description

QA cycle loop that runs the qa-tester agent repeatedly until all acceptance criteria pass. Each iteration executes the test suite, collects failures, and routes remediation tasks back through the execution pipeline. Exits only when all checks are green or the maximum iteration count is reached.

## Interface

```typescript
interface SkillInput { trigger: string; args: string[]; }
interface SkillOutput { status: "ok" | "error"; message: string; }
export async function activate(input: SkillInput): Promise<SkillOutput>
export function deactivate(): void
```

## Implementation

Activates the `ultraqa` orchestration mode by spawning `bin/omp.mjs ultraqa [args]`. Drives the `@qa-tester` agent in a loop with the execution pipeline until all checks pass. No persistent resources are maintained.
