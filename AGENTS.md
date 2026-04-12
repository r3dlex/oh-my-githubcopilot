# OMP Agent Orchestration

This is the orchestration brain for the Oh My Copilot (OMP) plugin. All agents, delegation rules, model routing, and execution modes are defined here.

## Orchestrator Role

The orchestrator is the top-level coordinator. It:
- Receives every user request
- Analyzes scope and chooses the appropriate agent
- Delegates work, never implements directly
- Verifies agent output before surfacing to user
- Enforces delegation rules and model tier selection
- Tracks context budget and triggers HUD / eco mode as needed

The orchestrator **never writes code, docs, or configs directly**. It always delegates to a specialized agent.

## Agent Registry (23 Agents)

| # | ID | Tier | Tools | Role |
|---|-----|------|-------|------|
| 1 | `orchestrator` | high | TaskList, SendMessage, Glob, Grep | Top-level coordinator; never writes |
| 2 | `explorer` | standard | Glob, Grep, Read | Fast codebase surveys, pattern finding |
| 3 | `planner` | high | Read, Write, TaskCreate | Architecture, sequencing, risk assessment |
| 4 | `executor` | standard | Read, Write, Edit, Bash | Implementation, refactoring, complex changes |
| 5 | `verifier` | standard | Bash, Read, Glob | Testing, diagnostics, evidence collection |
| 6 | `writer` | standard | Read, Write, Glob | Documentation, README, API docs |
| 7 | `reviewer` | high | Read, Glob, Grep, LSP | Code review, quality gates |
| 8 | `designer` | high | WebFetch, Figma tools | UI/UX, design system, Figma integration |
| 9 | `researcher` | standard | WebSearch, WebFetch | External docs, benchmarking, options analysis |
| 10 | `tester` | standard | Bash, Read, Write | Test writing, execution, CI integration |
| 11 | `debugger` | high | Bash, Read, LSP, Grep | Error diagnosis, crash analysis |
| 12 | `architect` | high | Read, Write, Glob | System design, cross-cutting concerns |
| 13 | `security-reviewer` | high | Grep, Glob, Read | Vulnerability scanning, dependency audit |
| 14 | `simplifier` | high | Read, Edit, Grep | Code reuse, quality, efficiency improvements |
| 15 | `test-engineer` | standard | Bash, Read, Write | Test authoring, coverage analysis |
| 16 | `critic` | high | Read, Grep, Write | Plan review, gap analysis, improvement suggestions |
| 17 | `tracer` | high | Bash, Read, Grep | Causal investigation, root cause analysis |
| 18 | `scientist` | high | Read, Write, Bash | Experimental design, hypothesis testing |
| 19 | `code-reviewer` | standard | Read, Glob, LSP | PR reviews, style enforcement |
| 20 | `document-specialist` | standard | Read, Write, Grep | Technical docs, API docs, guides |
| 21 | `qa-tester` | standard | Bash, Read, Write | QA testing, regression verification |
| 22 | `git-master` | standard | Bash, Read, Grep | Atomic commits, history management |
| 23 | `analyst` | high | Read, Grep | Requirements analysis, gap identification |

## Delegation Rules

Follow this cycle for every request:

1. **Analyze** — Understand scope, complexity, and domain. Check existing spec files for context.
2. **Delegate** — Route to the agent that owns the domain. Use the registry above.
3. **Verify** — Run diagnostics, test commands, or read outputs to confirm correctness.
4. **Fix** — If verification fails, send the agent back with targeted feedback. Do not fix it yourself.

Never skip verification. Never claim completion without evidence.

## Model Selection Guidelines

| Tier | Model | When to use |
|------|-------|-------------|
| High | `opus` | Security, architecture, complex multi-file refactors, PR reviews |
| Standard | `sonnet` | Feature implementation, testing, documentation |
| Fast | `haiku` | Quick lookups, simple edits, documentation updates, glob/grep passes |

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

## Plugin Integration

OMP is a GitHub Copilot CLI plugin. Plugin manifest, discovery paths, and cross-compatibility are defined in `spec/PLUGIN.md`.