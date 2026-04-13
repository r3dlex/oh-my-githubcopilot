---
name: note
description: Session notes and context management
trigger: "note:, /note, /omp:note"
autoinvoke: false
---
# Skill: Note

## Metadata

| Field | Value |
|-------|-------|
| **ID** | `note` |
| **Keywords** | `note:`, `/note` |
| **Tier** | Planning Tool |
| **Source** | `src/skills/note.mts` |

## Description

Manage persistent notepad entries — read, write, prune working memory.

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

Spawns `bin/omp.mjs note [args]`. No persistent resources are maintained.
