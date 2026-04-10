# OMP Skills Specification

## 1. Overview

Skills extend agent capabilities by activating specialized workflows triggered by magic keywords. OMP ships with 30+ skills organized into three categories: execution modes (8), planning tools (10+), and developer tools (12+). Skills use lazy loading — they are not instantiated until triggered.

## 2. Lazy Loading

Skills are loaded on demand via dynamic `import()`. The skill registry in `plugin.json` is read at session start, but entry point modules are not executed until a keyword match or explicit activation.

```
session start
  → parse plugin.json skills[]
  → register magic keywords in keyword-detector hook
  → on trigger: dynamic import('./dist/skills/<id>.js')
  → activate(skillContext)
```

This avoids loading all 30+ skills at startup. The typical cold start latency for a triggered skill is under 200ms (within the hook performance budget).

## 3. Skill Template

Every OMP skill must use the following template:

```typescript
// src/skills/<skill-id>.ts

import { Skill, SkillContext, SkillResult } from '@omp/core';

export default class <SkillName>Skill implements Skill {
  readonly id = '<skill-id>';
  readonly keywords = ['<keyword>', '<alternate>'];
  readonly description = '<one-line description>';

  activate(ctx: SkillContext): SkillResult {
    // Activate the skill workflow
    // Return a SkillResult with status, output, and next steps
  }

  deactivate(): void {
    // Clean up resources, stop polling, release handles
  }
}
```

## 4. Skill Registry

### 4.1 Execution Modes

Execution mode skills are top-level workflows that take over session orchestration.

| # | Skill ID | Keywords | Description |
|---|----------|----------|-------------|
| 1 | `autopilot` | `autopilot:`, `/autopilot` | Autonomous end-to-end execution from idea to working code. Handles routing, delegation, verification internally. |
| 2 | `ralph` | `ralph:`, `/ralph` | Self-referential loop: plan → execute → verify → repeat until task marked done. Configurable verification reviewer. |
| 3 | `ultrawork` | `ulw:`, `/ulw`, `ultrawork:` | Parallel execution engine. Spawns multiple agents simultaneously for high-throughput task completion. |
| 4 | `team` | `team:`, `/team` | Coordinated multi-agent session on a shared task list. Agents communicate via SendMessage. |
| 5 | `ecomode` | `eco:`, `/eco`, `ecomode:` | Token budget mode. Prioritizes task completion over exploration. Suppresses verbose output. |
| 6 | `swarm` | `swarm:`, `/swarm` | Swarm orchestration with shared state. Multiple agents work on sub-problems simultaneously. |
| 7 | `pipeline` | `pipeline:`, `/pipeline` | Sequential pipeline mode. Strict phase ordering enforced: plan → build → test → deploy. |
| 8 | `plan` | `plan:`, `/plan` | Strategic planning mode with optional interview workflow. Delays implementation until plan is approved. |

### 4.2 Planning Tools

| # | Skill ID | Description |
|---|----------|-------------|
| 9 | `deep-dive` | 2-stage pipeline: trace (causal investigation) → deep-interview (requirements crystallization) |
| 10 | `deep-interview` | Socratic deep interview with mathematical ambiguity gating before autonomous execution |
| 11 | `ralplan` | Consensus planning entrypoint that auto-gates vague ralph/autopilot/team requests |
| 12 | `trace` | Evidence-driven tracing lane orchestrating competing tracer hypotheses |
| 13 | `remember` | Review reusable project knowledge; classify into project memory, notepad, or durable docs |
| 14 | `deepinit` | Deep codebase initialization with hierarchical AGENTS.md documentation |
| 15 | `wiki` | LLM Wiki — persistent markdown knowledge base that compounds across sessions |
| 16 | `sciomc` | Orchestrate parallel scientist agents for comprehensive analysis with AUTO mode |

### 4.3 Developer Tools

| # | Skill ID | Description |
|---|----------|-------------|
| 17 | `verify` | Verify that a change really works before claiming completion. Runs diagnostics and evidence collection. |
| 18 | `simplify` | Review changed code for reuse, quality, and efficiency; fix issues found. |
| 19 | `debug` | Diagnose the current session or repo state using logs, traces, state, and focused reproduction. |
| 20 | `ask` | Process-first advisor routing for Claude, Codex, or Gemini via `omp ask`; captures artifacts. |
| 21 | `ccg` | Claude-Codex-Gemini tri-model orchestration via `/ask codex` + `/ask gemini`; Claude synthesizes results. |
| 22 | `skill` | Manage local skills — list, add, remove, search, edit, setup wizard. |
| 23 | `skillify` | Turn a repeatable workflow into a reusable OMP skill draft. |
| 24 | `self-improve` | Autonomous evolutionary code improvement engine with tournament selection. |
| 25 | `external-context` | Invoke parallel document-specialist agents for external web searches. |
| 26 | `visual-verdict` | Structured visual QA verdict for screenshot-to-reference comparisons. |
| 27 | `writer-memory` | Agentic memory system for writers — track characters, relationships, scenes, themes. |
| 28 | `project-session-manager` | Worktree-first dev environment manager for issues, PRs, and features. |

## 5. OMA Skill Porting (5-Step Process)

To port an existing OMA (Oh My Claude) skill to OMP:

**Step 1 — Identify the skill manifest**
Find the skill's `id`, `keywords`, and `activate/deactivate` signature in the OMA skill registry.

**Step 2 — Create the OMP wrapper**
```typescript
// src/skills/<skill-id>.ts
import { Skill, SkillContext } from '@omp/core';

export default class PortedSkill implements Skill {
  readonly id = '<skill-id>';
  readonly keywords = ['<keyword>'];
  readonly description = '<from OMA manifest>';

  activate(ctx: SkillContext) {
    // Adapt OMA SkillContext → OMP SkillContext
    // Call OMA skill's activate with adapted context
  }

  deactivate() {
    // Call OMA skill's deactivate
  }
}
```

**Step 3 — Register in plugin.json**
Add to the `skills[]` array:
```json
{ "id": "<skill-id>", "entry": "./dist/skills/<skill-id>.js" }
```

**Step 4 — Add keyword to keyword-detector hook**
Update `keyword-detector.ts` to map the keyword to the skill ID.

**Step 5 — Verify lazy loading**
Confirm the skill is not loaded at session start and is dynamically imported on first trigger.

## 6. SkillContext Interface

```typescript
interface SkillContext {
  sessionId: string;
  workingDirectory: string;
  orchestrator: OrchestratorRef;    // delegate(task, agent, modelTier) => Promise<TaskResult>
  hud: HudRef;                      // update(metrics: Partial<HudMetrics>) => void
  hooks: HooksRef;                  // fire(type: HookType, data: HookData) => Promise<HookResult>
  model: 'opus' | 'sonnet' | 'haiku';
  tokenBudget: TokenBudget;
  activeMode: ExecutionMode | null;  // string union from spec/HOOKS.md
  notepad: NotepadRef;              // read(section?) => string; write(content, section?) => void
  projectMemory: ProjectMemoryRef;   // read(category?) => MemoryEntry[]; write(entry) => void
  stateManager: StateManagerRef;     // get(key, scope?) => unknown; set(key, value, scope?) => void
}

interface SkillResult {
  status: 'success' | 'error' | 'partial';
  output: string;
  evidence: string[];
  nextSteps: string[];
  modeComplete: boolean;   // true signals stop-continuation hook
}
```

## 7. Skill Deactivation

All skills must implement `deactivate()`. Common cleanup tasks:
- Stop any running polling loops
- Release file handles or subprocesses
- Persist partial state to PSM
- Notify HUD to clear skill-specific indicators

A skill that fails to deactivate cleanly may leave zombie processes or stale state. Deactivation is called on: skill conflict (new skill overrides), mode switch, session end.