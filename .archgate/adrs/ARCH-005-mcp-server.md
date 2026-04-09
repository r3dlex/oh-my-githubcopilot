---
id: ARCH-005
title: MCP Server via @modelcontextprotocol/sdk
domain: integration
rules: false
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

Set `rules: true` and create a companion `.rules.ts` file to enforce MCP tool schema compliance and correct `.mcp.json` registration.
