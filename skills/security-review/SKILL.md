---
name: security-review
description: Trigger the security-reviewer agent lane for security analysis
trigger: "security-review:, /security-review, /omp:security-review"
autoinvoke: false
---
# Skill: Security Review

## Metadata

| Field | Value |
|-------|-------|
| **ID** | `security-review` |
| **Keywords** | `security-review:`, `/security-review` |
| **Tier** | Developer Tool |
| **Source** | `src/skills/security-review.mts` |

## Description

Triggers the security-reviewer agent lane for structured security analysis. Examines code changes and the broader codebase for vulnerabilities, misconfigurations, injection risks, and compliance gaps. Produces a structured report with CVE references and remediation guidance.

## Interface

```typescript
interface SkillInput { trigger: string; args: string[]; }
interface SkillOutput { status: "ok" | "error"; message: string; }
export async function activate(input: SkillInput): Promise<SkillOutput>
export function deactivate(): void
```

## Implementation

Activates the `security-review` orchestration mode by spawning `bin/omp.mjs security-review [args]`. Delegates to the `@security-reviewer` agent for threat-modelled review. No persistent resources are maintained.
