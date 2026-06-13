---
name: visual-verdict
description: Visual diff/screenshot comparison verdict
trigger: "visual-verdict:, /visual-verdict, /omp:visual-verdict"
autoinvoke: false
---
# Skill: Visual Verdict

## Metadata

| Field | Value |
|-------|-------|
| **ID** | `visual-verdict` |
| **Keywords** | `visual-verdict:`, `/visual-verdict` |
| **Tier** | QA Tool |
| **Source** | `src/skills/visual-verdict.mts` |

## Description

Compares visual diffs or screenshots to render a pass/fail verdict. Accepts before/after image paths or URLs, runs a pixel-level diff, and produces a structured verdict with diff percentage, bounding boxes of changed regions, and a human-readable summary.

## Interface

```typescript
interface SkillInput { trigger: string; args: string[]; }
interface SkillOutput { status: "ok" | "error"; message: string; }
export async function activate(input: SkillInput): Promise<SkillOutput>
export function deactivate(): void
```

## Implementation

Extension-only skill. Triggers visual diff comparison in Copilot. The CLI prints guidance directing users to the Copilot CLI slash command.

> **P3 scope:** Integration with Playwright screenshot capture and CI diff reporting (as specified in SPEC-omp-2.0 §5) are deferred to P3. The current implementation accepts user-supplied image paths only.
