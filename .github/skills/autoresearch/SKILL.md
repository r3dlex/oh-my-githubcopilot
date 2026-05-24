---
name: autoresearch
description: >
  Stateful research improvement loop with evaluator gates and decision logs.
  Activate when: autoresearch, research loop, improve research, evaluate research.
argument-hint: "<research mission>"
---

# Autoresearch

> **OMG adapted scope:** This workflow is driven by visible checkpoints and evaluator gates, not by an external OMC runtime loop.

## Workflow
1. Define the research mission, success criteria, constraints, and stop conditions.
2. Break the mission into hypotheses or research questions.
3. Gather evidence from local docs, code, and permitted web sources.
4. Evaluate findings against the success criteria.
5. Iterate only while the next pass is likely to improve the answer meaningfully.
6. Record final decisions, rejected alternatives, and confidence.

## Evaluator Gates
- Evidence sufficiency
- Contradiction check
- Confidence level
- Stop/continue decision

## Rules
- Prefer primary sources.
- Label uncertainty clearly.
- Do not loop indefinitely without measurable improvement.
