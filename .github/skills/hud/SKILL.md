# Skill: HUD

## Metadata

| Field | Value |
|-------|-------|
| **ID** | `hud` |
| **Keywords** | `hud:`, `/hud` |
| **Tier** | Developer Tool |
| **Source** | `src/skills/hud.mts` |

## Description

Configure HUD display options: layout, presets, display elements.

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

Spawns `bin/omp.mjs hud [args]`. No persistent resources are maintained.
