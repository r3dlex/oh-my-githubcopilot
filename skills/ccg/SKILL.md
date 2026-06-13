---
name: ccg
description: Concurrent code generation via multi-model picker
trigger: "ccg:, /ccg, /omp:ccg"
autoinvoke: false
---
# Skill: CCG (Concurrent Code Generation)

## Metadata

| Field | Value |
|-------|-------|
| **ID** | `ccg` |
| **Keywords** | `ccg:`, `/ccg` |
| **Tier** | Generation Tool |
| **Source** | `src/skills/ccg.mts` |

## Description

Runs concurrent code generation across multiple models via a multi-model picker. Dispatches the same prompt to N configured models in parallel, collects results, and presents a ranked selection for the user to choose from or merge.

## Interface

```typescript
interface SkillInput { trigger: string; args: string[]; }
interface SkillOutput { status: "ok" | "error"; message: string; }
export async function activate(input: SkillInput): Promise<SkillOutput>
export function deactivate(): void
```

## Implementation

Extension-only skill. Triggers concurrent code generation in Copilot. The CLI prints guidance directing users to the Copilot CLI slash command.

> **Constraint:** Uses Copilot's built-in multi-model picker **exclusively**. Does NOT invoke Claude CLI, GPT CLI, or Gemini CLI subprocesses. External CLI orchestration is out of scope for this skill.

> **P3 scope:** Automatic result merging and consensus scoring across models (as specified in SPEC-omp-2.0 §3) are deferred to P3. The current implementation presents ranked results for manual selection.
