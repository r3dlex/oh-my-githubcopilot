# Skill: Learner

## Metadata

| Field | Value |
|-------|-------|
| **ID** | `learner` |
| **Keywords** | `learner:`, `/learner` |
| **Tier** | Planning Tool |
| **Source** | `src/skills/learner.mts` |

## Description

Extract a learned skill from the current conversation.

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

Spawns `bin/omp.mjs learner [args]`. No persistent resources are maintained.
