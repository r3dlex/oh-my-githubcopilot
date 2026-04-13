# Skill: GraphWiki

## Metadata

| Field | Value |
|-------|-------|
| **ID** | `graphwiki` |
| **Keywords** | `graphwiki:`, `/graphwiki`, `/omp:graphwiki` |
| **Tier** | developer |
| **Source** | `src/skills/graphwiki.mts` |

## Description

Direct access to graphwiki CLI for graph querying, path finding, linting, and refinement. Provides comprehensive knowledge graph management beyond the generic graph-provider interface, including zero-token path finding and structural graph analysis.

## Interface

```typescript
interface SkillInput {
  action: 'query' | 'path' | 'lint' | 'refine' | 'build' | 'status' | 'clean';
  question?: string;
  from?: string;
  to?: string;
  options?: { review?: boolean; update?: boolean };
}

interface SkillOutput {
  status: "ok" | "error";
  message: string;
  data?: unknown;
}
```

## Implementation

Provides a thin wrapper around the graphwiki CLI tool (`npm install -g graphwiki`). Routes user actions to appropriate graphwiki subcommands and parses output into structured responses.

## Actions

### query <question>
Query the knowledge graph with a natural language question.
Uses graphwiki's token-budget-aware query engine.

### path <from> <to>
Find the structural path between two nodes (zero LLM tokens).

### lint
Check the graph for orphan nodes, missing edges, and structural issues.

### refine [--review]
Refine the graph. Add `--review` to run in review mode.

### build [--update]
Build the knowledge graph. Add `--update` for incremental build.

### status
Show whether graphwiki-out/graph.json exists and its output paths.

### clean
Remove the graphwiki-out/ directory.

## Installation

```bash
npm install -g graphwiki
```
