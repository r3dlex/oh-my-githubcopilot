# Skill: Pipeline

## Metadata

| Field | Value |
|-------|-------|
| **ID** | `pipeline` |
| **Keywords** | `pipeline:`, `/pipeline` |
| **Tier** | Execution Mode |
| **Source** | `src/skills/pipeline.mts` |

## Description

Sequential pipeline mode. Strict phase ordering enforced: plan → build → test → deploy.

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

Activates the `pipeline` sequential mode by spawning `bin/omp.mjs pipeline [args]`. No persistent resources are maintained.
