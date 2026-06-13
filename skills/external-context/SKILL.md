---
name: external-context
description: Load external docs/URLs into session context
trigger: "external-context:, /external-context, /omp:external-context"
autoinvoke: false
---
# Skill: External Context

## Metadata

| Field | Value |
|-------|-------|
| **ID** | `external-context` |
| **Keywords** | `external-context:`, `/external-context` |
| **Tier** | Context Tool |
| **Source** | `src/skills/external-context.mts` |

## Description

Loads external documentation, URLs, or file paths into the active Copilot session context window. Accepts a URL or local file path as its argument. In Copilot, fetches the content and injects it as context. Via CLI, prints confirmation so you can reference the URL in your next Copilot prompt.

## Interface

```typescript
interface SkillInput { trigger: string; args: string[]; }
interface SkillOutput { status: "ok" | "error"; message: string; }
export async function activate(input: SkillInput): Promise<SkillOutput>
export function deactivate(): void
```

## Implementation

CLI accepts a URL or file path argument and prints a confirmation message. Extension-side fetches or reads the content and injects it into the session context.
