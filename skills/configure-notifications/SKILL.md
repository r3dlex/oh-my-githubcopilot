---
name: configure-notifications
description: Configure session notification settings
trigger: "configure-notifications:, /configure-notifications, /omp:configure-notifications"
autoinvoke: false
---
# Skill: Configure-Notifications

## Metadata

| Field | Value |
|-------|-------|
| **ID** | `configure-notifications` |
| **Keywords** | `configure-notifications:`, `/configure-notifications` |
| **Tier** | Developer Tool |
| **Source** | `src/skills/configure-notifications.mts` |

## Description

Configure notification integrations: Telegram, Discord, Slack.

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

Spawns `bin/omp.mjs configure-notifications [args]`. No persistent resources are maintained.
