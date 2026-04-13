---
name: trace
description: Execution tracing and debugging
trigger: "trace:, /trace, /omp:trace"
autoinvoke: false
---
# Skill: Trace

## Metadata

| Field | Value |
|-------|-------|
| **ID** | `trace` |
| **Keywords** | `trace:`, `/trace` |
| **Tier** | Planning Tool |
| **Source** | `src/skills/trace.mts` |

## Description

Evidence-driven tracing lane orchestrating competing tracer hypotheses in Claude built-in team mode.

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

Spawns `bin/omp.mjs trace [args]`. No persistent resources are maintained.
