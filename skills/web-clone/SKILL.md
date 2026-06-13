---
name: web-clone
description: Clone and adapt a web page/design to the codebase
trigger: "web-clone:, /web-clone, /omp:web-clone"
autoinvoke: false
---
# Skill: Web-Clone

## Metadata

| Field | Value |
|-------|-------|
| **ID** | `web-clone` |
| **Keywords** | `web-clone:`, `/web-clone` |
| **Tier** | Frontend Tool |
| **Source** | `src/skills/web-clone.mts` |

## Description

Clones a web page or design reference and adapts it to the project's codebase. Accepts a URL or screenshot, extracts the visual structure and content, and generates framework-appropriate components that match the existing project conventions. Handles responsive layouts, typography, colour schemes, and interactive elements.

## Interface

```typescript
interface SkillInput { trigger: string; args: string[]; }
interface SkillOutput { status: "ok" | "error"; message: string; }
export async function activate(input: SkillInput): Promise<SkillOutput>
export function deactivate(): void
```

## Implementation

Extension-only skill. Triggers web page cloning and adaptation in Copilot. The CLI prints guidance directing users to the Copilot CLI slash command.

> **P3 scope:** Live browser puppeteer crawl, asset extraction, and animation cloning (as specified in SPEC-omp-2.0 §5) are deferred to P3. The current implementation accepts URL or screenshot input and generates static component output.
