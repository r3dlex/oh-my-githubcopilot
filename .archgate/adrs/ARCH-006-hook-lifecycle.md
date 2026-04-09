---
id: ARCH-006
title: Hook Lifecycle — Six Pre-Defined Triggers
domain: architecture
rules: false
status: provisional
---

# Hook Lifecycle — Six Pre-Defined Triggers

## Context

Hooks intercept Claude Code cycles to perform logging, enforcement, routing, and UI tasks. A fixed trigger taxonomy prevents hook proliferation.

## Decision

Hooks fire on one of six triggers:

- `pre-cycle` — before Claude Code processes a turn
- `post-cycle` — after Claude Code completes a turn
- `post-message` — after a tool use message (PostToolUse equivalent)

Six hooks are registered in `src/hooks/*.mts`:

| Hook | Trigger | Priority |
|---|---|---|
| keyword-detector | post-message | 100 |
| delegation-enforcer | post-message | 90 |
| model-router | post-message | 80 |
| token-tracker | post-message | 70 |
| hud-emitter | post-message | 60 |
| stop-continuation | post-message | 50 |

Higher priority numbers run first within a trigger group.

## Provisional Status

This ADR is **Provisionally Accepted** because hook implementations are `.mts` files only. When new hooks are added, rules must be updated to enforce the trigger taxonomy.

## Rules (when enforced)

- New hooks must specify a valid `trigger` value (`pre-cycle`, `post-cycle`, `post-message`)
- Priority must be an integer between 1 and 100
- Hook IDs must be unique

## Consequences

- Fixed trigger taxonomy prevents proliferation
- Priority ordering ensures predictable execution within trigger groups
- Hooks are synchronous (run in the Claude Code process)

## Compliance and Enforcement

Rules are **not yet fully enforceable** — provisional status. Current six hooks are verified; new hook registration rules apply when `hooks/hooks.json` is modified.
