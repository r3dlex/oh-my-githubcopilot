---
id: ARCH-003
title: esbuild for Bundling, TypeScript for Type Safety
domain: build
rules: false
---

# esbuild for Bundling, TypeScript for Type Safety

## Context

The project bundles hooks, MCP server, and CLI tool for distribution. A fast, minimal-output bundler is required that handles ESM cleanly.

## Decision

Use `esbuild` for all bundling. TypeScript is the source language with strict mode enabled. Output is **6 individual ESM hook files** in `dist/hooks/` — not a single bundle:

- `dist/hooks/keyword-detector.mjs`
- `dist/hooks/delegation-enforcer.mjs`
- `dist/hooks/stop-continuation.mjs`
- `dist/hooks/token-tracker.mjs`
- `dist/hooks/model-router.mjs`
- `dist/hooks/hud-emitter.mjs`

MCP server: `dist/mcp/server.mjs` (ESM, `.mjs` extension)
CLI tool: `bin/omp.mjs`

Externalized runtime dependencies (`better-sqlite3`, `@modelcontextprotocol/sdk`) are marked `external: true` in esbuild config.

## Rules

- All source files in `src/` must pass `tsc --noEmit`
- No `any`-typed variables unless explicitly justified in a comment
- Build output must land in `dist/` or `bin/`

## Consequences

- Fast builds (esbuild is significantly faster than tsc or webpack)
- Individual hook bundles enable granular hook loading
- Runtime deps must be installed separately (not bundled)

## Compliance and Enforcement

Set `rules: true` and create a companion `.rules.ts` file to enforce TypeScript strictness and build output location.
