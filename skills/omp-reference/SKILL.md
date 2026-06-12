---
name: omp-reference
description: OMP agent catalog, available tools, team pipeline routing, commit protocol, and skills registry. Auto-loads when delegating to agents, using OMP tools, orchestrating teams, making commits, or invoking skills.
user-invocable: false
---

# OMP Reference

Use this built-in reference when you need detailed OMP catalog information that does not need to live in every session context.

## Agent Catalog

Prefix: `omp:`. See `agents/*.md` for full prompts.

| # | ID | Tier | Tools | Role |
|---|-----|------|-------|------|
| 1 | `explore` | fast | Glob, Grep, Read | Fast codebase surveys, pattern finding |
| 2 | `planner` | high | Read, Write, TaskCreate | Architecture, sequencing, risk assessment |
| 3 | `executor` | standard | Read, Write, Edit, Bash | Implementation, refactoring, complex changes |
| 4 | `verifier` | standard | Bash, Read, Glob | Testing, diagnostics, evidence collection |
| 5 | `writer` | standard | Read, Write, Glob | Documentation, README, API docs |
| 6 | `designer` | high | WebFetch, Figma tools | UI/UX, design system, Figma integration |
| 7 | `debugger` | high | Bash, Read, LSP, Grep | Error diagnosis, crash analysis |
| 8 | `architect` | high | Read, Write, Glob | System design, cross-cutting concerns |
| 9 | `security-reviewer` | high | Grep, Glob, Read | Vulnerability scanning, dependency audit |
| 10 | `code-simplifier` | high | Read, Edit, Grep | Code reuse, quality, efficiency improvements |
| 11 | `test-engineer` | standard | Bash, Read, Write | Test authoring, execution, coverage, CI integration |
| 12 | `critic` | high | Read, Grep, Write | Plan review, gap analysis, improvement suggestions |
| 13 | `tracer` | high | Bash, Read, Grep | Causal investigation, root cause analysis |
| 14 | `scientist` | high | Read, Write, Bash | Experimental design, hypothesis testing |
| 15 | `code-reviewer` | high | Read, Glob, LSP | PR reviews, quality gates, merge verdicts |
| 16 | `document-specialist` | standard | Read, Write, Grep, WebSearch, WebFetch | External docs, benchmarking, options analysis |
| 17 | `qa-tester` | standard | Bash, Read, Write | QA testing, regression verification |
| 18 | `git-master` | standard | Bash, Read, Grep | Atomic commits, history management |
| 19 | `analyst` | high | Read, Grep | Requirements analysis, gap identification |

## Model Routing

| Tier | When to use |
|------|-------------|
| high (opus) | Security, architecture, complex multi-file refactors, PR reviews, plan challenges |
| standard (sonnet) | Feature implementation, testing, documentation, debugging |
| fast (haiku) | Quick lookups, simple edits, documentation updates, glob/grep passes |

## Tools Reference

### Team runtime
- `TaskCreate`, `TaskList`, `TaskGet`, `TaskUpdate`
- `SendMessage`

### OMP state
- `state_read`, `state_write`, `state_clear`, `state_list_active`, `state_get_status`

### Notepad
- `notepad_read`, `notepad_write_priority`, `notepad_write_working`, `notepad_write_manual`

### Project memory
- `project_memory_read`, `project_memory_write`, `project_memory_add_note`, `project_memory_add_directive`

### Code intelligence
- LSP: `lsp_hover`, `lsp_goto_definition`, `lsp_find_references`, `lsp_diagnostics`, and related helpers
- AST: `ast_grep_search`, `ast_grep_replace`
- Utility: `python_repl`

## Skills Registry

Invoke built-in workflows via `/omp:<name>`.

### Workflow skills
- `autopilot` — full autonomous execution from idea to working code
- `ralph` — persistence loop until completion with verification
- `ultrawork` — high-throughput parallel execution
- `team` — coordinated team orchestration
- `ultraqa` — QA cycle: test, verify, fix, repeat
- `omp-plan` — planning workflow
- `pipeline` — sequential pipeline mode with strict phase ordering
- `swarm` — swarm orchestration with multiple agents and shared state
- `ecomode` — token budget mode; prioritize completion over expansion
- `trace` — evidence-driven causal tracing lane
- `deep-interview` — Socratic ambiguity-gated requirements workflow
- `graphify` — knowledge graph generation from any input
- `graphwiki` — LLM wiki with graph-backed knowledge base

### Utility skills
- `research` / `autoresearch:` — research and investigation workflow
- `omp-doctor` — diagnose and fix omp installation issues
- `omp-setup` — install or refresh omp plugin
- `setup` — install routing entrypoint
- `mcp-setup` — configure MCP servers
- `hud` — HUD display options
- `note` — quick note capture
- `learner` — extract learned skill from session
- `spending` — token spend tracking
- `release` — release assistant
- `configure-notifications` — notification integrations
- `wiki` — persistent LLM wiki
- `psm` — Plugin State Manager control

### Keyword triggers
- `"autopilot"→autopilot`
- `"ralph"→ralph`
- `"ulw"→ultrawork`
- `"ralplan"→omp-plan`
- `"deep interview"→deep-interview`
- `"autoresearch:"→research`
- `"pipeline"→pipeline`
- `"swarm"→swarm`
- `"eco"→ecomode`
- `"plan"→omp-plan`
- Team orchestration is explicit via `/team`.

## Team Pipeline

Stages: `team-plan` → `team-prd` → `team-exec` → `team-verify` → `team-fix` (loop).

- Use `team-fix` for bounded remediation loops.
- Prefer team mode when independent parallel lanes justify the coordination overhead.

## Execution Mode Handling

| Mode | Trigger | Behavior |
|------|---------|----------|
| `autopilot` | `/autopilot:` | Autonomous end-to-end execution |
| `ralph` | `/ralph:` | Self-referential loop with verification |
| `ultrawork` | `/ulw:` | Parallel execution engine |
| `team` | `/team:` | Coordinated multi-agent session on shared task list |
| `ecomode` | `/eco:` | Token budget mode |
| `swarm` | `/swarm:` | Multiple agents with shared state |
| `pipeline` | `/pipeline:` | Sequential pipeline with strict phase ordering |
| `plan` | `/plan:` | Strategic planning via planner agent |

## Commit Protocol

Use git trailers to preserve decision context in every commit message.

### Format
- Intent line first: why the change was made
- Optional body with context and rationale
- Structured trailers when applicable

### Common trailers
- `Constraint:` active constraint shaping the decision
- `Rejected:` alternative considered | reason for rejection
- `Directive:` forward-looking warning or instruction
- `Confidence:` `high` | `medium` | `low`
- `Scope-risk:` `narrow` | `moderate` | `broad`
- `Not-tested:` known verification gap

### Example
```text
feat(skills): add research skill to omp plugin

Adds autoresearch workflow with structured output format and
agent routing to document-specialist/explore/architect as appropriate.

Constraint: No model routing parameters allowed in omp skills
Confidence: high
Scope-risk: narrow
```

## State Paths

All OMP runtime state uses `.omp/` prefix:
- `.omp/state/` — active state files
- `.omp/state/sessions/{sessionId}/` — per-session state
- `.omp/notepad.md` — shared notepad
- `.omp/project-memory.json` — persistent project memory
- `.omp/plans/` — planning artifacts
- `.omp/research/` — research outputs
- `.omp/logs/` — execution logs
