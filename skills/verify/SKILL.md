---
name: verify
description: Evidence-based completion check via verifier agent
trigger: "verify:, /verify, /omp:verify"
autoinvoke: false
---
# Skill: Verify

## Metadata

| Field | Value |
|-------|-------|
| **ID** | `verify` |
| **Keywords** | `verify:`, `/verify` |
| **Tier** | Planning Tool |
| **Source** | `src/skills/verify.mts` |

## Description

Evidence-based completion check that routes to the verifier agent. Inspects current work against acceptance criteria, runs any defined test suites, and produces a structured pass/fail report with citations.

## Interface

```typescript
interface SkillInput { trigger: string; args: string[]; }
interface SkillOutput { status: "ok" | "error"; message: string; }
export async function activate(input: SkillInput): Promise<SkillOutput>
export function deactivate(): void
```

## Implementation

Activates the `verify` orchestration mode by spawning `bin/omp.mjs verify [args]`. Delegates to the verifier agent which checks completion evidence. No persistent resources are maintained.
