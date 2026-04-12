---
name: graphify
description: Build and manage a knowledge graph of the codebase using the graphify CLI. Use when user says /omp:graphify, "graph build", "build graph", or "graphify". Reduces token usage by 70x+ per query by replacing raw file searches with graph lookups.
---

# Graphify Skill

Trigger: `/omp:graphify` or magic keyword `graph:`

This skill is scoped to OMP plugin sessions (/omp:graphify). The global ~/.claude/skills/graphify skill (/graphify) is for standalone Claude Code sessions — no conflict.

## Actions

### build [--incremental]
Build the knowledge graph for the current workspace using `graphify`.
Reports: node count, edge count, community count, output path.
Install: `pip install graphify`

### status
Show whether graphify-out/graph.json exists, its size, and last modified time.

### clean
Remove the graphify-out/ directory.
