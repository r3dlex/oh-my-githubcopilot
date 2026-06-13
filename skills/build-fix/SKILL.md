---
name: build-fix
description: Diagnose and fix build/CI failures automatically
trigger: "build-fix:, /build-fix, /omp:build-fix"
autoinvoke: false
---
# Skill: Build-Fix

## Metadata

| Field | Value |
|-------|-------|
| **ID** | `build-fix` |
| **Keywords** | `build-fix:`, `/build-fix` |
| **Tier** | DevOps Tool |
| **Source** | `src/skills/build-fix.mts` |

## Description

Diagnoses and fixes build/CI failures automatically. Reads build logs, identifies root-cause errors, applies targeted source fixes, and re-runs the build in a loop until it passes or the retry budget is exhausted. Supports npm, pnpm, cargo, go, gradle, and custom CI runners.

## Interface

```typescript
interface SkillInput { trigger: string; args: string[]; }
interface SkillOutput { status: "ok" | "error"; message: string; }
export async function activate(input: SkillInput): Promise<SkillOutput>
export function deactivate(): void
```

## Implementation

Extension-only skill. Triggers automated build/CI failure diagnosis and repair in Copilot. The CLI prints guidance directing users to the Copilot CLI slash command.

> **P3 scope:** Cross-repository dependency resolution and remote CI log fetching (as specified in SPEC-omp-2.0 §5) are deferred to P3. The current implementation operates on local build output only.
