---
name: remember
description: Persist key facts/decisions to .omp/memory/
trigger: "remember:, /omp:remember"
autoinvoke: false
---
# Skill: Remember

## Metadata

| Field | Value |
|-------|-------|
| **ID** | `remember` |
| **Keywords** | `remember:`, `/omp:remember` |
| **Tier** | Memory Tool |
| **Source** | `src/skills/remember.mts` |

## Description

Persists key facts, decisions, or context notes to `.omp/memory/<ISO-timestamp>.md`. Accumulated memories are available to future sessions and agents as durable project context. Use `omp remember <text>` to write a new memory, or `omp remember` (no args) to list existing memories.

Note: `/remember` is intentionally NOT registered as a bare keyword to avoid collision with common English usage. Use `remember:` or `/omp:remember` instead.

## Interface

```typescript
interface SkillInput { trigger: string; args: string[]; }
interface SkillOutput { status: "ok" | "error"; message: string; }
export async function activate(input: SkillInput): Promise<SkillOutput>
export function deactivate(): void
```

## Implementation

Real CLI logic: `omp remember <text>` writes `.omp/memory/<ISO-timestamp>.md` atomically (tmp+rename). `omp remember` lists existing memory files. Extension-side stores the memory and confirms to the agent.

> **Note:** Memory files are stored relative to `process.cwd()`. Run `omp remember` from the project root for consistent cross-session lookup.

> **P3 scope:** Automatic classification into project memory / notepad / durable docs (as specified in SPEC-omp-2.0 §3) is deferred to P3.
