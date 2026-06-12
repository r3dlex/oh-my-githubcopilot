# ADR-0002 — Plugin + Companion SDK Extension Architecture

**Status:** Accepted
**Date:** 2026-06-12
**Deciders:** @r3dlex

---

## Context

OMP 1.x ships as a Copilot CLI plugin (`plugin.json`) whose skills are invoked
via "magic keyword in prose" triggers (`ralph:`, `ulw:` …). The Copilot CLI
(>= 1.0.60, SDK GA 2026-06) now exposes an extension API: `extension.mjs`
files are forked as Node child processes, talk JSON-RPC over stdio, and can
register native slash commands (`joinSession({ commands })`), lifecycle hooks,
and persistent Canvas UI surfaces (SPEC-omp-2.0 §2). Keyword triggers have poor
discoverability and no TUI affordances; the spec mandates native `/commands`,
a dynamic HUD, and SDK hooks.

Alternatives considered:

- **Keyword triggers only (status quo).** Rejected: poor discoverability — no
  `/command` autocomplete in the TUI, skills are invisible until users read the
  docs, and prose parsing is fragile.
- **tmux-primary HUD.** Rejected: the SDK Canvas API provides a native,
  in-TUI, live-updating surface — superior to tmux `status-right` polling.
  tmux statusline is retained only as a fallback renderer.

## Decision

> We will ship OMP 2.0 as the existing plugin manifest (declarative agents +
> skills) **plus** a companion SDK extension (`extension/extension.mjs`),
> because the plugin system handles distribution while only an extension
> process can provide native slash commands now, and hooks + HUD canvas in
> PR2.

The extension derives its commands from a single skill registry
(`src/extension/registry.mts` + `src/extension/commands.mts`); each skill id
and alias becomes a `/command` whose handler returns an activation instruction
to the agent.

## Consequences

### Positive
- Every skill is discoverable as a native `/command` with TUI autocomplete.
- Single registry — slash command ≡ CLI verb ≡ keyword trigger (no drift).
- Fail-open design: if the SDK or `joinSession` is unavailable, the extension
  logs to stderr and exits gracefully; the CLI session is never broken and
  keyword triggers keep working.

### Negative
- Requires Copilot CLI >= 1.0.60; older CLIs fall back to keyword triggers.
- Two runtime surfaces (plugin manifest + extension process) must stay in
  sync; `extension/extension.mjs` carries a self-contained registry copy.

### Neutral / Trade-offs
- `@github/copilot-sdk` is resolved by the CLI inside extension processes
  only and is deliberately not a package.json dependency; SDK shapes are
  typed structurally in `src/extension/`.
- Canvas API is young (GA 2026-06); renderer abstraction keeps tmux/file
  fallbacks first-class (see SPEC-omp-2.0 §5, §9).
