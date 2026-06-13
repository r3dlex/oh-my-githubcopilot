---
name: help
description: Command and skill discovery; prints the full skill catalog
trigger: "help:, /help, /omp:help"
autoinvoke: false
---
# Skill: Help

## Metadata

| Field | Value |
|-------|-------|
| **ID** | `help` |
| **Keywords** | `help:`, `/help` |
| **Tier** | Developer Tool |
| **Source** | `src/skills/help.mts` |

## Description

Command and skill discovery tool. Reads the OMP skill registry and prints a formatted catalog of all available skills with their IDs, descriptions, and trigger keywords. Useful for discovering available commands without leaving the current session.

## Interface

```typescript
interface SkillInput { trigger: string; args: string[]; }
interface SkillOutput { status: "ok" | "error"; message: string; }
export async function activate(input: SkillInput): Promise<SkillOutput>
export function deactivate(): void
```

## Implementation

Activates the `help` mode by spawning `bin/omp.mjs help [args]`. The CLI handler reads `SKILL_REGISTRY` from the registry and prints a formatted table of all skills. No persistent resources are maintained.
