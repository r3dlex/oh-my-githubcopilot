---
name: deep-dive
description: Trace→deep-interview pipeline for deep investigation
trigger: "deep-dive:, /deep-dive, /omp:deep-dive"
autoinvoke: false
---
# Skill: Deep Dive

## Metadata

| Field | Value |
|-------|-------|
| **ID** | `deep-dive` |
| **Keywords** | `deep-dive:`, `/deep-dive` |
| **Tier** | Planning Tool |
| **Source** | `src/skills/deep-dive.mts` |

## Description

Chains the `trace` and `deep-interview` skills into a single pipeline for thorough investigation. First traces execution paths and code flow, then conducts a Socratic deep-interview to surface assumptions, edge cases, and ambiguities. Ideal for complex debugging sessions, architecture reviews, and unfamiliar codebases.

## Interface

```typescript
interface SkillInput { trigger: string; args: string[]; }
interface SkillOutput { status: "ok" | "error"; message: string; }
export async function activate(input: SkillInput): Promise<SkillOutput>
export function deactivate(): void
```

## Implementation

Extension-only skill. Triggers a trace→deep-interview chained pipeline in Copilot. The CLI prints guidance directing users to the Copilot CLI slash command.
