# Skill: Ecomode

## Metadata

| Field | Value |
|-------|-------|
| **ID** | `ecomode` |
| **Keywords** | `eco:`, `/eco`, `ecomode:` |
| **Tier** | Execution Mode |
| **Source** | `src/skills/ecomode.mts` |

## Description

Token budget mode. Prioritizes task completion over exploration. Suppresses verbose output.

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

Activates the `ecomode` token-budget mode by spawning `bin/omp.mjs ecomode [args]`. No persistent resources are maintained.
