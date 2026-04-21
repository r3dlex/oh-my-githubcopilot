# OMP — Oh My Copilot

OMP is a TypeScript plugin for GitHub Copilot CLI that brings 23 specialized agents, 39 skills, a HUD display, a Plugin State Manager (PSM), and MCP server integration to every session.

## Start Here

- **Orchestration brain**: `AGENTS.md`
- **Component specs**: `spec/*.md`

## Delegation Principle

Delegate specialized work to the appropriate agent. Verify outcomes before claiming completion. Never implement what you can delegate.

## Model Routing

| Tier | Model | Use for |
|------|-------|---------|
| High | opus | Architecture, security, deep analysis |
| Standard | sonnet | Implementation, testing |
| Fast | haiku | Documentation, lookups |

## Magic Keywords

Trigger OMP skill modes via slash commands: `autopilot:`, `ralph:`, `ulw:`, `team:`, `eco:`, `swarm:`, `pipeline:`, `plan:`

## Quick Reference

```
AGENTS.md          → Agent registry & delegation rules
spec/AGENTS_SPEC.md   → 23-agent table & model tiers
spec/SKILLS.md        → 39 skills & lazy loading
spec/HOOKS.md         → 6 hooks & registration
spec/HUD.md           → HUD display & context tracking
spec/PSM.md           → Plugin State Manager
spec/MCP.md           → MCP server & tools
```