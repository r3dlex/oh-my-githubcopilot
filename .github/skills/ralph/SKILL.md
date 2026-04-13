# Skill: Ralph

## Metadata

| Field | Value |
|-------|-------|
| **ID** | `ralph` |
| **Keywords** | `ralph:`, `/ralph` |
| **Tier** | Execution Mode |
| **Source** | `src/skills/ralph.mts` |

## Description

Self-referential loop: plan → execute → verify → repeat until task marked done. Configurable verification reviewer.

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

Activates the `ralph` self-verification loop by spawning `bin/omp.mjs ralph [args]`. No persistent resources are maintained.
