---
name: ask
description: >
  Route multi-perspective questions through OMG's existing CCG-style analysis workflow.
  Activate when: ask, multi-model ask, ask models, compare model opinions.
argument-hint: "<question to route>"
---

# Ask

> **OMG adapted scope:** This skill is a `/ccg` routing helper only. It does not invoke provider CLIs or wrap raw OMC ask commands.

## Workflow
1. Restate the user's question and the decision it supports.
2. Decide whether a single answer is enough or a multi-perspective `/ccg` analysis is useful.
3. Route to `/ccg` when comparing model viewpoints, trade-offs, or uncertainty would materially improve the answer.
4. Synthesize results into one recommendation with assumptions and confidence.

## Rules
- Do not fabricate responses from external providers.
- Do not run raw provider CLI commands unless the user explicitly asks and the environment supports them.
- Prefer concise synthesis over dumping multiple opinions.
