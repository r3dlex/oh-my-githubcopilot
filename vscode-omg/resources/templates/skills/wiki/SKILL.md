---
name: wiki
description: >
  Maintain a lightweight project knowledge base that compounds across sessions.
  Activate when: wiki, knowledge base, project wiki, save knowledge.
argument-hint: "<knowledge to read or store>"
---

# Wiki

> **OMG adapted scope:** This port starts as a guided file workflow. A full wiki MCP API is out of scope for this branch.

## Workflow
1. Determine whether the user wants to read, add, update, or reorganize knowledge.
2. Choose a repository-scoped markdown location that already exists, or propose `.omg/wiki/` when no convention exists.
3. Store concise, durable facts with dates and source context.
4. Update outdated entries instead of duplicating contradictory notes.
5. Summarize what changed and how to retrieve it later.

## Rules
- Do not store secrets or private credentials.
- Prefer short entries that future agents can load quickly.
- Separate verified facts from hypotheses or todos.
