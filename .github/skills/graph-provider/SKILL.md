# Skill: Graph Provider

## Metadata

| Field | Value |
|-------|-------|
| **ID** | `graph-provider` |
| **Keywords** | `graph:`, `/graph-provider` |
| **Tier** | developer |
| **Source** | `src/skills/graph-provider.mts` |

## Description

Manage and use the active graph provider (graphify or graphwiki). Delegates to whichever adapter is configured, allowing users to switch between providers, build graphs, and query the active knowledge graph.

## Interface

```typescript
interface SkillInput {
  action: 'get' | 'set' | 'list' | 'build' | 'status' | 'clean' | 'query';
  provider?: string;
  question?: string;
  options?: { incremental?: boolean };
}

interface SkillOutput {
  status: "ok" | "error";
  message: string;
  data?: unknown;
}
```

## Implementation

Manages the active graph provider configuration stored in `.omp/config.json`. Routes actions to the configured provider adapter (graphify or graphwiki). Provides a unified interface for graph operations across multiple provider implementations.

## Actions

### get
Show the currently active graph provider.

### set <provider>
Switch the active graph provider (saved to local .omp/config.json).

```
graph: set graphwiki
graph: set graphify
```

### list
List all available graph providers.

### build [--incremental]
Build the knowledge graph using the active provider.

### status
Show whether the active provider's graph exists.

### clean
Remove the active provider's output directory.

### query <question>
Query the graph (graphwiki provider only).

## Configuration

Add to `.omp/config.json` or `~/.omp/config.json`:

```json
{
  "graph": {
    "provider": "graphwiki"
  }
}
```

Resolution: local > global > default (`graphwiki`).
