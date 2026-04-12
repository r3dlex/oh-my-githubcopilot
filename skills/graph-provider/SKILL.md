---
name: graph-provider
description: Manage and use the active graph provider (graphify or graphwiki). Use when user says graph:, /graph-provider, or wants to switch/build/query the active knowledge graph provider.
---

# Graph Provider Skill

Trigger: `/omp:graph-provider` or magic keyword `graph:`

Manage the active knowledge graph provider. Delegates to whichever adapter is configured (graphify or graphwiki).

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
