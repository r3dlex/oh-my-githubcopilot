# Skill: Release

## Metadata

| Field | Value |
|-------|-------|
| **ID** | `release` |
| **Keywords** | `release:`, `/release` |
| **Tier** | Developer Tool |
| **Source** | `src/skills/release.mts` |

## Description

Automated release workflow for OMP.

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

Spawns `bin/omp.mjs release [args]`. No persistent resources are maintained.
