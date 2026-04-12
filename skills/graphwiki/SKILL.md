---
name: graphwiki
description: Direct access to graphwiki CLI for graph querying, path finding, linting, and refinement. Use when user says graphwiki:, /graphwiki, or asks to query/lint/refine a knowledge graph. Install: npm install -g graphwiki
---

# GraphWiki Skill

Trigger: `/omp:graphwiki` or magic keyword `graphwiki:`

Provides direct access to graphwiki CLI features beyond the generic graph-provider interface.

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
