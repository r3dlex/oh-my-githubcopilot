---
name: deepsearch
description: Multi-source deep search across codebase and web
trigger: "deepsearch:, /deepsearch, /omp:deepsearch"
autoinvoke: false
---
# Skill: Deep Search

## Metadata

| Field | Value |
|-------|-------|
| **ID** | `deepsearch` |
| **Keywords** | `deepsearch:`, `/deepsearch` |
| **Tier** | Research Tool |
| **Source** | `src/skills/deepsearch.mts` |

## Description

Runs a multi-source deep search across the local codebase, project documentation, and the web simultaneously. Aggregates results from all sources, de-duplicates, and ranks by relevance. Useful for researching unfamiliar APIs, finding prior art, and cross-referencing internal code with external documentation.

## Interface

```typescript
interface SkillInput { trigger: string; args: string[]; }
interface SkillOutput { status: "ok" | "error"; message: string; }
export async function activate(input: SkillInput): Promise<SkillOutput>
export function deactivate(): void
```

## Implementation

Extension-only skill. Triggers multi-source deep search in Copilot. The CLI prints guidance directing users to the Copilot CLI slash command.
