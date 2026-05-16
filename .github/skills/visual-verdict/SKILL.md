---
name: visual-verdict
description: >
  Structured visual QA for screenshot-to-reference comparisons.
  Activate when: visual verdict, screenshot compare, compare UI image, visual QA.
argument-hint: "<screenshot and reference/context>"
---

# Visual Verdict

Use this skill to produce a concise, evidence-based visual comparison between an actual screenshot and a reference image or written visual spec.

## Workflow
1. Identify the actual artifact and the expected reference.
2. Compare layout, spacing, typography, colors, states, responsive behavior, and accessibility-visible cues.
3. Classify differences by severity: blocking, major, minor, cosmetic.
4. Return a verdict: pass, pass-with-notes, or fail.

## Output
- Verdict
- Evidence observed
- Severity-rated differences
- Recommended fixes
- Unknowns or missing artifacts

## Rules
- Do not invent visual evidence that is not present.
- If only one image is available, compare against the written spec and call out the weaker confidence.
- Prefer actionable UI fixes over broad design commentary.
