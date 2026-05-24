---
name: deepinit
description: >
  Generate or refresh hierarchical repository guidance files for agents.
  Activate when: deepinit, repo init docs, initialize agent docs, create AGENTS guidance.
argument-hint: "<repository scope>"
---

# Deepinit

Use this skill to analyze a repository and create durable agent-facing guidance for future work.

## Workflow
1. Map the repository structure, languages, build/test commands, and major subsystems.
2. Identify local conventions and hazards that future agents must know.
3. Write or update guidance files at the narrowest useful scope.
4. Avoid duplicating stale or generic instructions.
5. Verify references and commands where practical.

## Output
- Files created or updated
- Repository conventions captured
- Commands verified
- Areas intentionally left undocumented

## Rules
- Prefer specific, local facts over generic coding advice.
- Do not overwrite human-authored guidance without preserving intent.
- Keep guidance concise enough to be loaded repeatedly.
