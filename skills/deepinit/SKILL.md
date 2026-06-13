---
name: deepinit
description: Deep project initialization — full codebase onboarding
trigger: "deepinit:, /deepinit, /omp:deepinit"
autoinvoke: false
---
# Skill: Deep Init

## Metadata

| Field | Value |
|-------|-------|
| **ID** | `deepinit` |
| **Keywords** | `deepinit:`, `/deepinit` |
| **Tier** | Initialization Tool |
| **Source** | `src/skills/deepinit.mts` |

## Description

Performs a deep project initialization and full codebase onboarding. Scans the repository structure, reads key configuration files (package.json, tsconfig, CI/CD pipelines, test config), identifies agent roles, detects the tech stack, and writes a comprehensive `.omp/project-memory.json` summary. Subsequent agents and skills use this context to operate without re-scanning from scratch.

## Interface

```typescript
interface SkillInput { trigger: string; args: string[]; }
interface SkillOutput { status: "ok" | "error"; message: string; }
export async function activate(input: SkillInput): Promise<SkillOutput>
export function deactivate(): void
```

## Implementation

Extension-only skill. Triggers deep project initialization in Copilot. The CLI prints guidance directing users to the Copilot CLI slash command.
