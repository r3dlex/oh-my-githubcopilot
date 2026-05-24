---
name: skillify
description: >
  Turn a repeatable workflow into a reusable OMG skill draft.
  Activate when: skillify, make a skill, create skill, extract workflow.
argument-hint: "<workflow to convert into a skill>"
---

# Skillify

Use this skill to package a repeatable task pattern into a clear OMG skill.

## Workflow
1. Identify the repeated trigger, goal, inputs, and outputs.
2. Separate durable workflow rules from one-off project details.
3. Draft a VS Code-compatible `SKILL.md` with frontmatter and concise instructions.
4. Include activation phrases, boundaries, verification steps, and failure modes.
5. Ask for approval before installing the skill into `.github/skills/`.

## Frontmatter Rules
- Include `name` and `description`.
- Use `argument-hint` only when helpful.
- Do not use unsupported fields such as `allowed-tools`.

## Output
- Proposed skill name
- Draft skill body
- Installation path
- Verification checklist
