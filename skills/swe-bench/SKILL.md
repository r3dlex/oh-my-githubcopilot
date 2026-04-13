---
name: swe-bench
description: SWE-bench evaluation harness runner
trigger: "swe-bench:, /swe-bench, /omp:swe-bench"
autoinvoke: false
---
# Skill: SWE-Bench

## Metadata

| Field | Value |
|-------|-------|
| **ID** | `swe-bench` |
| **Keywords** | `swe-bench:`, `/swe-bench` |
| **Tier** | Developer Tool |
| **Source** | `src/skills/swe-bench.mts` |

## Description

SWE-bench integration for OMP — run and evaluate SWE-bench test cases.

## Interface

```typescript
interface SkillInput {
  trigger: string;
  args: string[];
}

interface SkillOutput {
  status: "ok" | "error";
  message: string;
}

export async function activate(input: SkillInput): Promise<SkillOutput>
export function deactivate(): void
```

## Implementation

Spawns `bin/omp.mjs swe-bench [args]`. No persistent resources are maintained.
