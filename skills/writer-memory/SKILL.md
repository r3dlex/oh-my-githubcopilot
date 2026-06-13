---
name: writer-memory
description: Writing style memory — stores voice/tone preferences
trigger: "writer-memory:, /writer-memory, /omp:writer-memory"
autoinvoke: false
---
# Skill: Writer Memory

## Metadata

| Field | Value |
|-------|-------|
| **ID** | `writer-memory` |
| **Keywords** | `writer-memory:`, `/writer-memory` |
| **Tier** | Memory Tool |
| **Source** | `src/skills/writer-memory.mts` |

## Description

Stores and retrieves writing style preferences, voice, and tone guidelines in `.omp/writer-memory.md`. Use `omp writer-memory <style-note>` to append a new style note, or `omp writer-memory` (no args) to print the current style guide. These preferences persist across sessions and are available to writer and document-specialist agents.

## Interface

```typescript
interface SkillInput { trigger: string; args: string[]; }
interface SkillOutput { status: "ok" | "error"; message: string; }
export async function activate(input: SkillInput): Promise<SkillOutput>
export function deactivate(): void
```

## Implementation

Real CLI logic: `omp writer-memory <style-note>` appends the note to `.omp/writer-memory.md`. `omp writer-memory` prints the current file content. Extension-side reads and injects the style guide into the agent context.

> **Note:** Concurrent appends from multiple Copilot sessions are safe for entries ≤ 4KB (POSIX `O_APPEND` atomicity), but may interleave for larger entries. Single-session usage is fully safe.

> **P3 scope:** Full character/relationship/scene/theme tracking (as specified in SPEC-omp-2.0 §3) is deferred to P3. The current implementation provides voice/tone preference storage only.
