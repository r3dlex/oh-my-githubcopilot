# OMP Agent Orchestration

This is the orchestration brain for the Oh My Copilot (OMP) plugin. All agents, delegation rules, model routing, and execution modes are defined here.

## Orchestrator Role

The orchestrator is the top-level coordination role of the main session — it is **not a delegatable agent**. It:
- Receives every user request
- Analyzes scope and chooses the appropriate agent
- Delegates work, never implements directly
- Verifies agent output before surfacing to user
- Enforces delegation rules and model tier selection
- Tracks context budget and triggers HUD / eco mode as needed

The orchestrator **never writes code, docs, or configs directly**. It always delegates to a specialized agent.

## Agent Registry (19 Agents)

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
| 10 | `code-simplifier` | high | Read, Edit, Grep | Code simplification, clarity, maintainability |
| 11 | `test-engineer` | standard | Bash, Read, Write | Test authoring, execution, coverage analysis, CI integration |
| 12 | `critic` | high | Read, Grep, Write | Plan review, gap analysis, improvement suggestions |
| 13 | `tracer` | standard | Bash, Read, Grep | Causal investigation, root cause analysis |
| 14 | `scientist` | standard | Read, Write, Bash | Experimental design, hypothesis testing |
| 15 | `code-reviewer` | high | Read, Glob, LSP | Code review, quality gates, merge verdicts |
| 16 | `document-specialist` | standard | Read, Write, Grep, WebSearch, WebFetch | External docs, API research, options benchmarking |
| 17 | `qa-tester` | standard | Bash, Read, Write | QA testing, regression verification |
| 18 | `git-master` | standard | Bash, Read, Grep | Atomic commits, history management |
| 19 | `analyst` | high | Read, Grep | Requirements analysis, gap identification |

> **Migration (2.0)**: `explorer`→`explore`, `simplifier`→`code-simplifier`; `orchestrator` is now the top-level role only; `researcher`→`document-specialist`, `reviewer`→`code-reviewer`, `tester`→`test-engineer`. Run `omp doctor` to detect stale references.

## Delegation Rules

Follow this cycle for every request:

1. **Analyze** — Understand scope, complexity, and domain. Check existing spec files for context.
2. **Delegate** — Route to the agent that owns the domain. Use the registry above.
3. **Verify** — Run diagnostics, test commands, or read outputs to confirm correctness.
4. **Fix** — If verification fails, send the agent back with targeted feedback. Do not fix it yourself.

Never skip verification. Never claim completion without evidence.

## Model Selection Guidelines

| Tier | Models | When to use |
|------|--------|-------------|
| High | `gemini-3.5-flash`, `claude-opus-4.7`, `claude-sonnet-4.6`, `gemini-3.1-pro`, `gpt-5.5`, `gpt-5.4` | Security, architecture, complex multi-file refactors, PR reviews, agentic coding |
| Standard | `claude-sonnet-4.5`, `claude-haiku-4.5`, `gpt-5.4-mini`, `deepseek-v3` | Feature implementation, testing, documentation |
| Fast | `gpt-5.4-nano`, `gpt-5-mini`, `raptor-mini` | Quick lookups, simple edits, documentation updates, glob/grep passes |

## Execution Mode Handling

When an execution mode is active, follow its skill instructions exactly:

| Mode | Trigger | Behavior |
|------|---------|----------|
| `autopilot` | Magic keyword or `/autopilot:` | Autonomous end-to-end execution. System handles routing. |
| `ralph` | Magic keyword or `/ralph:` | Self-referential loop with verification. Delegate to verifier agent for evidence. |
| `ultrawork` | Magic keyword or `/ulw:` | Parallel execution engine. Spawn multiple agents simultaneously. |
| `team` | Magic keyword or `/team:` | Coordinated multi-agent session on shared task list. |
| `ecomode` | Magic keyword or `/eco:` | Token budget mode. Prioritize completion over expansion. |
| `swarm` | Magic keyword or `/swarm:` | Swarm orchestration. Multiple agents with shared state. |
| `pipeline` | Magic keyword or `/pipeline:` | Sequential pipeline mode. Strict phase ordering. |
| `plan` | Magic keyword or `/plan:` | Strategic planning. Use planner agent; delay implementation. |
| `ralplan` | Magic keyword or `ralplan:` | Consensus planning entrypoint that auto-gates vague ralph/autopilot/team requests. |

## HUD Awareness

The HUD (Heads-Up Display) provides real-time context and token budget visibility. The orchestrator must respond to HUD signals:

- **Context at 80%+**: Prioritize task completion over exploration. Avoid new subtasks.
- **Tokens near budget**: Switch to `ecomode`. Surface partial results with clear next steps.
- **HUD emitter hook**: The `hud-emitter` hook fires on each agent cycle to update HUD state.
- **Display strategies**: HUD can render via Copilot CLI status, tmux status-right, or file polling. See `spec/HUD.md`.

## Hook Awareness

Six hooks run on every cycle:

1. `keyword-detector` — Detect magic keywords and activate execution modes
2. `delegation-enforcer` — Ensure orchestrator never writes directly
3. `model-router` — Apply model tier based on task type and token budget
4. `token-tracker` — Track context window usage and warn at thresholds
5. `hud-emitter` — Push state to HUD on each agent cycle
6. `stop-continuation` — Detect completion signals and stop further generation

See `spec/HOOKS.md` for hook schema and registration.

## Skill Routing

Skills extend agent capabilities. See `spec/SKILLS.md` for the full registry and lazy loading mechanism.

### Magic Keyword Triggers

| Keyword | Skill | Purpose |
|---------|-------|---------|
| `autopilot:` / `/autopilot` | `autopilot` | Autonomous end-to-end execution |
| `ralph:` / `/ralph` | `ralph` | Self-referential loop until task complete |
| `ulw:` / `ultrawork:` / `/ulw` | `ultrawork` | Parallel high-throughput execution |
| `team:` / `/team` | `team` | Multi-agent session on shared task list |
| `eco:` / `ecomode:` / `/eco` | `ecomode` | Token budget mode |
| `swarm:` / `/swarm` | `swarm` | Swarm orchestration with shared state |
| `pipeline:` / `/pipeline` | `pipeline` | Sequential phase-ordered pipeline |
| `plan:` / `/plan` | `omp-plan` | Strategic planning with interview workflow |
| `ralplan:` | `ralplan` | Consensus planning entrypoint; gates vague ralph/autopilot/team requests |
| `deslop` | `ai-slop-cleaner` | Clean AI-generated code slop; regression-safe, deletion-first |
| `tdd:` | `tdd` | Test-driven development workflow |
| `autoresearch:` | `research` | External research via parallel document-specialist agents |

## Plugin Integration

OMP is a GitHub Copilot CLI plugin. Plugin manifest, discovery paths, and cross-compatibility are defined in `spec/PLUGIN.md`.
<!-- ai-sdlc-init:start -->

## AI SDLC Methodology

This repository uses the AI SDLC methodology scaffolded by `ai-sdlc-init`.

### Architecture Decision Records

Significant architectural decisions are recorded in [`docs/architecture/adr/`](docs/architecture/adr/).
Before making a change that affects module boundaries, API contracts, data
schemas, or dependency direction, check whether a relevant ADR exists.
If your change contradicts an existing ADR, either update the ADR or open a
discussion before proceeding.

### Archgate Rules

Code quality rules are defined in [`.rules.ts`](.rules.ts) across five domains:
`backend`, `frontend`, `data`, `architecture`, `general`. Rules carry a severity
(`error`, `warn`, `info`). Structural validation of `.rules.ts` runs in CI via
the `validate-rules` prek hook. Semantic enforcement (did the PR violate a rule?)
is an agent behavior at PR review time.

### Karpathy Baseline

All agents operating in this repository load
[`.agents/skills/karpathy-guidelines/SKILL.md`](.agents/skills/karpathy-guidelines/SKILL.md)
as a baseline. Four rules apply to every task: Think Before Coding, Simplicity
First, Surgical Changes, Goal-Driven Execution. See the SKILL.md for violation
and correction examples.

### Drift Verification Protocol

At PR review time, the reviewing agent:
1. Loads the PR diff alongside the BRD, PRD, acceptance criteria, and any ADRs
   whose scope overlaps with the changed files.
2. Produces a drift report identifying whether changes match ACs, conflict with
   ADRs, or violate architectural constraints from `.rules.ts`.
3. Leaves the drift report as a PR comment or review summary.

This is a documented agent behavior. It is not enforced as a CI gate in this
iteration.

### Circuit Breaker Protocol

Before starting work on an issue:
1. Check whether ≥ 3 prior attempts exist without resolution (look for
   `attempts:N` labels or a comment history showing repeated failures).
2. If the circuit is tripped (≥ 3 attempts, no resolution), escalate to a
   human with a written summary of what was tried and what blocked each attempt.
3. Do not make a fourth attempt without human acknowledgement.

<!-- ai-sdlc-init:end -->

<!-- v3-ai-sdlc-init:start -->
## AI SDLC v3
This repo follows the v3 AI-SDLC layout. See `.ai/matrix.json`, `.memory/human-override/`, and `docs/architecture/adr/`. Modules at `r3dlex/skills/ai-sdlc-init/modules/`.
<!-- v3-ai-sdlc-init:end -->
