---
name: design
description: UI/UX design and frontend component generation
trigger: "design:, /omp:design"
autoinvoke: false
---
# Skill: Design

## Metadata

| Field | Value |
|-------|-------|
| **ID** | `design` |
| **Keywords** | `design:`, `/omp:design` |
| **Tier** | Frontend Tool |
| **Source** | `src/skills/design.mts` |

## Description

Generates UI/UX designs and frontend components from natural language descriptions. Produces framework-appropriate components (React, Vue, Svelte, etc.), applies the project's existing design system tokens, and writes output files with associated tests. Accepts wireframe descriptions, mockup references, or component specs.

**Note:** Uses `/omp:design` (not `/design`) to avoid conflicts with native Copilot commands.

## Interface

```typescript
interface SkillInput { trigger: string; args: string[]; }
interface SkillOutput { status: "ok" | "error"; message: string; }
export async function activate(input: SkillInput): Promise<SkillOutput>
export function deactivate(): void
```

## Implementation

Extension-only skill. Triggers UI/UX design and component generation in Copilot. The CLI prints guidance directing users to the `/omp:design` slash command.

> **P3 scope:** Figma/Sketch import, design token extraction, and Storybook story generation (as specified in SPEC-omp-2.0 §5) are deferred to P3. The current implementation generates components from text descriptions only.
