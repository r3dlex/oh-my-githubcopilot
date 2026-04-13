# Skill: Graphify

## Metadata

| Field | Value |
|-------|-------|
| **ID** | `graphify` |
| **Keywords** | `graph build`, `build graph`, `/graphify`, `/omp:graphify` |
| **Tier** | developer |
| **Source** | `src/skills/graphify.mts` |

## Description

Build and manage a knowledge graph of the codebase using the graphify CLI. Reduces token usage by 70x+ per query by replacing raw file searches with graph lookups. This OMP plugin skill is scoped to `/omp:graphify` in OMP sessions. The standalone `~/.claude/skills/graphify` skill (`/graphify`) is for standalone Claude Code sessions — no conflict.

## Interface

```typescript
interface SkillInput {
  action: 'build' | 'status' | 'clean';
  options?: { incremental?: boolean };
}

interface SkillOutput {
  status: "ok" | "error";
  message: string;
  data?: {
    nodeCount?: number;
    edgeCount?: number;
    communityCount?: number;
    outputPath?: string;
  };
}
```

## Implementation

Invokes the `graphify` CLI tool to analyze the workspace and generate a knowledge graph stored in `graphify-out/graph.json`. Provides status reporting on graph size and last modified time, and can incrementally update existing graphs.

## Actions

### build [--incremental]
Build the knowledge graph for the current workspace using `graphify`.
Reports: node count, edge count, community count, output path.
Install: `pip install graphify`

### status
Show whether graphify-out/graph.json exists, its size, and last modified time.

### clean
Remove the graphify-out/ directory.
