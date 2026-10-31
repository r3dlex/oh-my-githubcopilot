---
id: ARCH-005
title: MCP Server via @modelcontextprotocol/sdk
domain: integration
rules: true
---

# MCP Server via @modelcontextprotocol/sdk

## Context

OMP exposes tools (state, memory, session management) to AI agents via a MCP server. The @modelcontextprotocol/sdk provides transport, JSON-RPC, and session lifecycle handling.

## Decision

OMP exposes an MCP server (`src/mcp/server.mts`) that provides tools over STDIO transport. The server is built by esbuild to `dist/mcp/server.mjs` (ESM format, `.mjs` extension) and registered in `.mcp.json`.

MCP server tools:
- `omp_get_session_state`, `omp_save_session`, `omp_list_sessions`
- `omp_get_agents`, `omp_delegate_task`, `omp_activate_skill`
- `omp_get_hud_state`, `omp_subscribe_hud_events`
- `omp_invoke_hook`, `omp_fleet_status`

## Rules

- MCP server must export a `server` instance compatible with `@modelcontextprotocol/sdk`
- `.mcp.json` must reference `dist/mcp/server.mjs` (not `.js`)
- Tool definitions must follow the MCP tool schema

## Consequences

- STDIO transport enables local process communication
- ESM format required (`.mjs` extension)
- `.mcp.json` path must be kept in sync with esbuild output

## Compliance and Enforcement

`rules: true` — enforced by the companion `ARCH-005-mcp-server.rules.ts`:

- `mcp-server-uses-sdk-server` — the MCP server must import `Server` from
  `@modelcontextprotocol/sdk/server/index.js` and construct it.
- `mcp-json-registers-dist-mjs` — `.mcp.json` must register the built server as
  `dist/mcp/server.mjs` (never `dist/mcp/server.js`).

CI runs `archgate check` and asserts the report is non-vacuous (a rule count
above zero), so a gate that stops checking anything fails instead of passing.
