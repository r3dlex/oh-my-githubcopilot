---
name: wiki
description: Project wiki operations and management
trigger: "wiki:, /wiki, /omp:wiki"
autoinvoke: false
---
# Skill: Wiki

## Metadata

| Field | Value |
|-------|-------|
| **ID** | `wiki` |
| **Keywords** | `wiki:`, `/wiki` |
| **Tier** | Planning Tool |
| **Source** | `src/skills/wiki.mts` |

## Description

LLM Wiki — persistent markdown knowledge base that compounds across sessions.

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

Spawns `bin/omp.mjs wiki [args]`. No persistent resources are maintained.
