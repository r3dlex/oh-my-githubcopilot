---
name: self-improve
description: OMP self-improvement — analyse own skills/agents and propose improvements
trigger: "self-improve:, /self-improve, /omp:self-improve"
autoinvoke: false
---
# Skill: Self-Improve

## Metadata

| Field | Value |
|-------|-------|
| **ID** | `self-improve` |
| **Keywords** | `self-improve:`, `/self-improve` |
| **Tier** | Meta Tool |
| **Source** | `src/skills/self-improve.mts` |

## Description

Analyses OMP's own skills, agents, and configuration to propose targeted improvements. Reads `skills/*/SKILL.md`, `agents/*`, and recent session logs to identify gaps, redundancies, and missing capabilities. Produces a structured improvement proposal in `.omp/self-improve/`.

## Interface

```typescript
interface SkillInput { trigger: string; args: string[]; }
interface SkillOutput { status: "ok" | "error"; message: string; }
export async function activate(input: SkillInput): Promise<SkillOutput>
export function deactivate(): void
```

## Implementation

Extension-only skill. Triggers OMP self-improvement analysis in Copilot. The CLI prints guidance directing users to the Copilot CLI slash command.

> **P3 scope:** Automated improvement PR generation and agent self-patching (as specified in SPEC-omp-2.0 §6) are deferred to P3. The current implementation performs analysis and produces a structured proposal only.
