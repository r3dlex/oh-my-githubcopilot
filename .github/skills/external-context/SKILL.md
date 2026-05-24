---
name: external-context
description: >
  Gather external documentation context through focused, bounded research passes.
  Activate when: external context, docs research, external docs, look up docs.
argument-hint: "<technology or question>"
---

# External Context

> **OMG adapted scope:** This port uses sequential or small batched research passes. It does not guarantee OMC-style parallel document-specialist execution.

## Workflow
1. Clarify the exact technology, API, version, and decision to support.
2. Search local repository docs first.
3. Fetch official or primary external documentation when URLs are provided or needed.
4. Summarize only the details relevant to the current implementation decision.
5. Cite source URLs and note version/date sensitivity.

## Rules
- Use official docs before blog posts when possible.
- Do not overfetch unrelated links.
- Separate source facts from recommendations.
- If the user provides URLs, fetch and inspect them before relying on memory.
