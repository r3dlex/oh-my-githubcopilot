# Skill: Team

## Metadata

| Field | Value |
|-------|-------|
| **ID** | `team` |
| **Keywords** | `team:`, `/team` |
| **Tier** | Execution Mode |
| **Source** | `src/skills/team.mts` |

## Description

Coordinated multi-agent session on a shared task list. Agents communicate via SendMessage.

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

Activates the `team` multi-agent coordination mode by spawning `bin/omp.mjs team [args]`. No persistent resources are maintained.
