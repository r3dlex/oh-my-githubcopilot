---
name: hud
description: >
  Guide use of OMG's VS Code StatusBar and TreeView workflow status surfaces.
  Activate when: hud, status display, workflow dashboard, show OMG status.
argument-hint: "<status surface or workflow>"
---

# HUD

> **OMG adapted scope:** This skill documents existing VS Code StatusBar and TreeView status surfaces. Terminal HUD parity with OMC is out of scope.

## Workflow
1. Identify which status the user needs: active modes, agents, PRD, checkpoint, or workflow progress.
2. Use the OMG status bar and tree views where available.
3. If MCP tools are available, inspect active modes or checkpoints for evidence.
4. Explain stale, missing, or conflicting status indicators.
5. Recommend the smallest refresh or health-check action.

## Rules
- Do not imply real-time terminal HUD metrics unless implemented.
- Prefer VS Code-native views over terminal dashboards.
- Report uncertainty when state files are missing or stale.
