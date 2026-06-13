# OMP Agents Specification

## 1. Overview

OMP exposes 19 agents registered in `plugin.json`. Every agent is a TypeScript module that exports a `run(params: AgentParams): Promise<AgentResult>` function. This document defines the model tiers, agent template, full agent registry, and delegation enforcement.

> **Breaking change in 2.0**: `explorer` was renamed to `explore` and `simplifier` to `code-simplifier`. The `orchestrator`, `researcher`, `reviewer`, and `tester` agents were dropped — orchestration is now the top-level instruction role, and their responsibilities merged into `document-specialist`, `code-reviewer`, and `test-engineer` respectively. `omp doctor` detects stale references.

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
| 1 | `explore` | fast | Glob, Grep, Read | Fast codebase surveys. Finds file patterns, identifies structure. Returns file paths and summaries. |
| 2 | `planner` | high | Read, Write, TaskCreate | Architecture design, task sequencing, risk assessment, implementation roadmaps. |
| 3 | `executor` | standard | Read, Write, Edit, Bash | Implementation and complex multi-file changes. Verifies output before returning. |
| 4 | `verifier` | standard | Bash, Read, Glob | Runs tests, collects diagnostics evidence, validates command outputs, marks tasks complete. |
| 5 | `writer` | standard | Read, Write, Glob | Technical documentation: README, API docs, guides, code comments. Matches existing style. |
| 6 | `designer` | high | WebFetch, Figma tools | UI/UX designs, design system integration, Figma-to-code workflow. |
| 7 | `debugger` | high | Bash, Read, LSP, Grep | Error diagnosis, crash analysis, stack trace interpretation, fix targeting. |
| 8 | `architect` | high | Read, Write, Glob | System design, cross-cutting concerns, technology selection, scalability assessment. |
| 9 | `security-reviewer` | high | Grep, Glob, Read | Vulnerability scanning, dependency audit, secrets detection, security policy review. |
| 10 | `code-simplifier` | high | Read, Edit, Grep | Code simplification, reuse analysis, quality improvements, efficiency refactoring. |
| 11 | `test-engineer` | standard | Bash, Read, Write | Test strategy, test authoring, suite execution, coverage analysis, CI integration. |
| 12 | `critic` | high | Read, Grep, Write | Plan review, gap analysis, improvement suggestions, quality gates. |
| 13 | `tracer` | standard | Bash, Read, Grep | Causal investigation, root cause analysis, trace-driven debugging. |
| 14 | `scientist` | standard | Read, Write, Bash | Experimental design, hypothesis testing, data analysis. |
| 15 | `code-reviewer` | high | Read, Glob, LSP | PR reviews, severity-rated findings, style enforcement, merge gate verdicts. |
| 16 | `document-specialist` | standard | Read, Write, Grep, WebSearch, WebFetch | External documentation lookup, API research, options benchmarking, guides. |
| 17 | `qa-tester` | standard | Bash, Read, Write | QA testing, regression verification, test plan execution. |
| 18 | `git-master` | standard | Bash, Read, Grep | Atomic commits, history management, branch strategy, commit archaeology. |
| 19 | `analyst` | high | Read, Grep | Requirements analysis, gap identification, acceptance criteria definition. |

## 5. Delegation Enforcement

The `delegation-enforcer` hook runs before every agent cycle. Its rules:

1. **Orchestrator boundary**: The top-level coordinator (orchestrator role — not a delegatable agent) may call all agents but may not directly use Read, Write, Edit, or Bash tools for implementation work.
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
| Security/vulnerability finding | `security-reviewer` agent (mandatory `opus` tier) |
| Architecture ambiguity | `architect` agent |
| 3+ failed delegation attempts | `architect` + `planner` jointly |
| Token budget critical | Switch to `ecomode`; delegate to `verifier` for partial output |
| Complex multi-file refactor | `executor` with `opus` tier |
| Documentation needed | `writer` agent |