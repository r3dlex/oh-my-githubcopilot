---
name: sciomc
description: Scientific/analytical reasoning workflow — hypothesis→experiment→conclusion
trigger: "sciomc:, /sciomc, /omp:sciomc"
autoinvoke: false
---
# Skill: SciOMC

## Metadata

| Field | Value |
|-------|-------|
| **ID** | `sciomc` |
| **Keywords** | `sciomc:`, `/sciomc` |
| **Tier** | Analytical Tool |
| **Source** | `src/skills/sciomc.mts` |

## Description

Applies rigorous scientific reasoning to software problems via a hypothesis→experiment→conclusion chain. For each problem, the agent formulates a testable hypothesis, designs a minimal experiment, runs it, and draws a conclusion. Chains multiple cycles until the hypothesis is confirmed or refuted with evidence. Ideal for debugging non-deterministic issues, performance regressions, and unknown system behaviours.

## Interface

```typescript
interface SkillInput { trigger: string; args: string[]; }
interface SkillOutput { status: "ok" | "error"; message: string; }
export async function activate(input: SkillInput): Promise<SkillOutput>
export function deactivate(): void
```

## Implementation

Extension-only skill. Triggers the scientific reasoning pipeline in Copilot. The CLI prints guidance directing users to the Copilot CLI slash command.

> **P3 scope:** Parallel scientist agents with AUTO mode (as specified in SPEC-omp-2.0 §3) are deferred to P3. The current implementation triggers a single hypothesis→experiment→conclusion chain.
