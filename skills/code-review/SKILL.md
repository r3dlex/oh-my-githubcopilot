---
name: code-review
description: Trigger the code-reviewer agent lane for structured code review
trigger: "code-review:, /code-review, /omp:code-review"
autoinvoke: false
---
# Skill: Code Review

## Metadata

| Field | Value |
|-------|-------|
| **ID** | `code-review` |
| **Keywords** | `code-review:`, `/code-review` |
| **Tier** | Developer Tool |
| **Source** | `src/skills/code-review.mts` |

## Description

Triggers the code-reviewer agent lane for structured, evidence-based code review. Reviews changed files for correctness, style, maintainability, and adherence to project conventions. Produces a structured report with inline comments and severity ratings.

## Interface

```typescript
interface SkillInput { trigger: string; args: string[]; }
interface SkillOutput { status: "ok" | "error"; message: string; }
export async function activate(input: SkillInput): Promise<SkillOutput>
export function deactivate(): void
```

## Implementation

Activates the `code-review` orchestration mode by spawning `bin/omp.mjs code-review [args]`. Delegates to the `@code-reviewer` agent for structured review. No persistent resources are maintained.
