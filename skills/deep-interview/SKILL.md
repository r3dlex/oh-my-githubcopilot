---
name: deep-interview
description: Deep requirements interview workflow
trigger: "deep interview:, /deep-interview, /omp:deep-interview"
autoinvoke: false
---
# Skill: Deep-Interview

## Metadata

| Field | Value |
|-------|-------|
| **ID** | `deep-interview` |
| **Keywords** | `deep interview:`, `/deep-interview` |
| **Tier** | Planning Tool |
| **Source** | `src/skills/deep-interview.mts` |

## Description

Socratic deep interview with mathematical ambiguity gating before autonomous execution.

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

Spawns `bin/omp.mjs deep-interview [args]`. No persistent resources are maintained.
