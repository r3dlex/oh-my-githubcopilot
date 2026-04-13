# Skill: PSM

## Metadata

| Field | Value |
|-------|-------|
| **ID** | `psm` |
| **Keywords** | `psm:`, `/psm` |
| **Tier** | Developer Tool |
| **Source** | `src/skills/psm.mts` |

## Description

Plugin State Manager — inspect, update, and manage OMP session state.

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

Spawns `bin/omp.mjs psm [args]`. No persistent resources are maintained.
