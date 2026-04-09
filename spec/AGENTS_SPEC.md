# OMP Agents Specification

## 1. Overview

OMP exposes 18 agents registered in `plugin.json`. Every agent is a TypeScript module that exports a `run(params: AgentParams): Promise<AgentResult>` function. This document defines the model tiers, agent template, full agent registry, and delegation enforcement.

## 2. Model Tiers

OMP uses three model tiers. The `model-router` hook selects the appropriate model based on task type, token budget, and complexity.

| Tier | Model | Context Window | Best for |
|------|-------|----------------|----------|
| High | `opus` | 200K tokens | Architecture, security audits, complex multi-file refactors, PR reviews with policy |
| Standard | `sonnet` | 100K tokens | Feature implementation, testing, documentation, moderate complexity changes |
| Fast | `haiku` | 32K tokens | Quick lookups, glob/grep passes, simple edits, config updates, single-file changes |

Model selection is overridden when:
- A skill specifies a required tier (e.g., `security` skill mandates `opus`)
- Token budget enters `ecomode` threshold (below 15% remaining)
- The `hud-emitter` hook signals context pressure above 80%

## 3. Agent Template

Every OMP agent must use the following YAML frontmatter template:

```yaml
---
id: <agent-id>             # unique kebab-case identifier
name: <Agent Name>         # human-readable title
tier: <high|standard|fast>  # required model tier
tools:
  - <tool-name>            # whitelist of permitted tools
  - ...
role: <short role phrase>  # one-liner for orchestrator routing
description: |
  <multi-line description of agent responsibilities,
  edge cases handled, and delegation expectations>
entry: ./src/agents/<agent-id>.ts
---
```

Example:

```yaml
---
id: executor
name: Executor
tier: high
tools:
  - Read
  - Write
  - Edit
  - Bash
role: Implementation and complex multi-file changes
description: |
  Handles all code implementation tasks: new features, refactors,
  complex multi-file edits. Verifies output before returning.
  Never handles documentation or planning — delegate to writer/planner.
entry: ./src/agents/executor.ts
---
```

## 4. Full Agent Registry

| # | ID | Tier | Tools | Role |
|---|-----|------|-------|------|
| 1 | `orchestrator` | high | TaskList, SendMessage, Glob, Grep | Top-level coordinator. Analyzes requests, delegates to agents, verifies output. Never writes. |
| 2 | `explorer` | standard | Glob, Grep, Read | Fast codebase surveys. Finds file patterns, identifies structure. Returns file paths and summaries. |
| 3 | `planner` | high | Read, Write, TaskCreate | Architecture design, task sequencing, risk assessment, implementation roadmaps. |
| 4 | `executor` | high | Read, Write, Edit, Bash | All code implementation: features, refactors, multi-file edits. Verifies changes compile. |
| 5 | `verifier` | standard | Bash, Read, Glob | Runs tests, collects diagnostics evidence, validates command outputs, marks tasks complete. |
| 6 | `writer` | standard | Read, Write, Glob | Technical documentation: README, API docs, guides, code comments. Matches existing style. |
| 7 | `reviewer` | high | Read, Glob, Grep, LSP | Code review, quality gates, style enforcement. Uses LSP for precision. |
| 8 | `designer` | high | WebFetch, Figma tools | UI/UX designs, design system integration, Figma-to-code workflow. |
| 9 | `researcher` | standard | WebSearch, WebFetch | External documentation lookup, dependency research, options benchmarking. |
| 10 | `tester` | standard | Bash, Read, Write | Test authoring, test execution, coverage analysis, CI integration. |
| 11 | `debugger` | high | Bash, Read, LSP, Grep | Error diagnosis, crash analysis, stack trace interpretation, fix targeting. |
| 12 | `architect` | high | Read, Write, Glob | System design, cross-cutting concerns, technology selection, scalability assessment. |
| 13 | `devops` | standard | Bash, Read, Write | Build pipeline, CI/CD configuration, containerization, deployment scripts. |
| 14 | `security` | high | Grep, Glob, Read | Vulnerability scanning, dependency audit, secrets detection, security policy review. |
| 15 | `data` | standard | Bash, Read, Write | Database migrations, schema changes, data transformations, ETL scripts. |
| 16 | `mobile` | high | Bash, Read, Write | Mobile-specific builds, platform guidelines (iOS/Android), mobile CI. |
| 17 | `performance` | high | Bash, Read, LSP | Profiling, benchmark execution, optimization targeting, performance regression detection. |
| 18 | `integration` | standard | Bash, Read, Write | API integration, service wiring, third-party SDK configuration, webhook handling. |

## 5. Delegation Enforcement

The `delegation-enforcer` hook runs before every agent cycle. Its rules:

1. **Orchestrator boundary**: The orchestrator (`id: orchestrator`) may call all other agents but may not directly use Read, Write, Edit, or Bash tools for implementation work.
2. **Tool whitelist enforcement**: Each agent may only use the tools listed in its YAML frontmatter. Any use of an out-of-scope tool is intercepted and rerouted to the appropriate agent.
3. **Verification gate**: After every agent completes, the orchestrator must run at least one verification step (test, lint, read output) before marking the task done.
4. **Delegation loop detection**: If the same task is delegated more than 3 times without resolution, the orchestrator escalates to `architect` for a fresh approach.

### AgentParams Interface

```typescript
interface AgentParams {
  taskId: string;
  description: string;
  context: string;          // current conversation context
  workingDirectory: string;
  model: 'opus' | 'sonnet' | 'haiku';
  tokenBudget: number;       // remaining tokens
  activeMode: ExecutionMode | null;
  hudState: HudState;
}

type ExecutionMode = 'autopilot' | 'ralph' | 'ultrawork' | 'team' | 'ecomode' | 'swarm' | 'pipeline' | 'plan';
```

### AgentResult Interface

```typescript
interface AgentResult {
  agentId: string;
  status: 'success' | 'error' | 'escalated';
  output: string;
  evidence: string[];        // verification evidence (file paths, test output, etc.)
  nextSteps: string[];
  tokensUsed: number;
}
```

## 6. Agent Lifecycle

1. Orchestrator receives request
2. `keyword-detector` hook checks for magic keywords → activates skill if found
3. `model-router` hook selects model tier
4. Orchestrator delegates to appropriate agent
5. Agent runs, emitting progress via `hud-emitter`
6. Orchestrator verifies output via `verifier` agent
7. Result surfaced to user; `stop-continuation` checks for completion signal

## 7. Escalation Paths

| Condition | Escalate to |
|-----------|-------------|
| Security/vulnerability finding | `security` agent (mandatory `opus` tier) |
| Architecture ambiguity | `architect` agent |
| 3+ failed delegation attempts | `architect` + `planner` jointly |
| Token budget critical | Switch to `ecomode`; delegate to `verifier` for partial output |
| Complex multi-file refactor | `executor` with `opus` tier |
| Documentation needed | `writer` agent |