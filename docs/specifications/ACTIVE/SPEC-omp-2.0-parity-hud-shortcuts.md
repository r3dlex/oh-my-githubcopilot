# SPEC: OMP 2.0 — Full Parity, Native Slash Commands, Dynamic HUD

| Field | Value |
|-------|-------|
| Status | ACTIVE — approved via deep-interview (ambiguity gated at ~8%) |
| Date | 2026-06-12 |
| Target version | **2.0.0** (breaking: agent renames/drops) |
| Scope | `oh-my-githubcopilot` repository only |
| Delivery | Plan-only (this spec); execution in follow-up PRs |

## 1. Goals (from stakeholder interview)

1. **Skill/command parity** with OMC (oh-my-claudecode) and OMX (oh-my-codex): full union of the 20 missing skills.
2. **Agent parity** with OMC canonical names: rename drifted agents, **drop** OMP-only agents.
3. **Native slash-command shortcuts** (`/deep-interview`, `/ralph`, …) via Copilot SDK `CommandDefinition` — replacing keyword-trigger-only invocation.
4. **Dynamic HUD** that updates live; tmux demoted to optional fallback (see §5 verdict).
5. **CLI parity**: `bin/omp.mjs` subcommands mirror `omx`/`omc` CLI verbs.
6. **Housekeeping**: built artifacts, spec drift, dead code, dependency updates, README translation sync.

## 2. SDK/TUI Investigation Findings (Copilot CLI ≥ 1.0.60, SDK GA 2026-06)

These findings drive the architecture and supersede older keyword-hack patterns:

| Capability | SDK surface | Implication for OMP |
|---|---|---|
| Native slash commands | `joinSession({ commands: CommandDefinition[] })` — each appears as `/name` in TUI with handler callback (`types.d.ts:1198-1202`) | OMP extension registers every skill as a real `/command`. No more "magic keyword in prose" as primary trigger. |
| Persistent UI surfaces | Canvas API (`canvas.d.ts`): `createCanvas`, `canvases:[]` in session options, agent tools `open_canvas` / `invoke_canvas_action` | **HUD becomes a Canvas** — live-rendering panel updated via canvas actions, not file polling. |
| Lifecycle hooks | `hooks` in session options; extensions intercept tool calls/events | `hud-emitter`, `token-tracker`, `keyword-detector` migrate from spec-only hooks to real SDK hooks. |
| Extension discovery | `.github/extensions/*/extension.mjs`, forked Node child, JSON-RPC/stdio, hot-reload on `/clear` | OMP ships an `extension.mjs` alongside the plugin manifest; plugin install drops it into the user extensions dir. |
| Plugin system | `copilot plugin install …` marketplace flow | Keep `plugin.json` as distribution wrapper; extension provides the runtime behaviors. |

**Architecture decision**: OMP 2.0 = plugin manifest (agents + skills, declarative) **+ companion SDK extension** (commands, hooks, HUD canvas, runtime). Record as ADR `docs/architecture/adr/` on execution.

## 3. Workstream A — Skill Parity (20 new skills)

Each skill needs: `skills/<id>/SKILL.md`, `src/skills/<id>.mts`, `plugin.json` entry, `spec/SKILLS.md` row, slash command registration (§4), tests.

### Phase ordering (all 20 confirmed; phasing is execution order only)

**P1 — Core workflow (7):**
| Skill | Source | Notes |
|---|---|---|
| `verify` | OMC | Evidence-based completion check; routes to verifier agent |
| `cancel` | OMC/OMX | Ends active execution modes; clears `.omg/state/` |
| `help` | OMX | Command/skill discovery; reads registry, prints catalog |
| `code-review` | OMX | Review lane → code-reviewer agent |
| `security-review` | OMX | Security lane → security-reviewer agent |
| `ultraqa` | OMC/OMX | QA cycle loop with qa-tester |
| `ultragoal` | OMC/OMX | Durable goal ledger in `.omg/ultragoal/`, fail-closed checkpoints |

**P2 — Analysis & memory (7):**
`deep-dive` (trace→deep-interview pipeline), `external-context`, `deepsearch` (OMX), `sciomc`, `remember`, `writer-memory`, `deepinit`.

**P3 — Specialized (6):**
`self-improve`, `visual-verdict`, `ccg` (adapt: multi-model via Copilot model picker, not Claude/GPT/Gemini CLIs), `build-fix`, `design` (merge OMX `design` + `frontend-ui-ux`), `web-clone`.

### Port adaptation rules
- Source of truth: OMC skill md > OMX skill (when both exist, prefer OMC semantics, OMX triggers).
- Strip runtime-specific assumptions (Claude Code hooks, Codex exec); map to Copilot SDK equivalents.
- Explicitly NOT ported (runtime-specific): `ask-claude`, `ask-gemini`, `prometheus-strict`, `resume-claude`/`push-omc` variants beyond existing, `worker`, `visual-ralph`, `ralph-init` (fold into `ralph`), `analyze` (fold into `deep-dive`).

## 4. Workstream B — Native Slash Commands

1. New module `src/extension/commands.mts`: builds `CommandDefinition[]` from the skill registry (single source of truth — no hand-maintained duplicate list).
2. Every skill gets `/skill-id`; keep legacy keyword triggers (`ralph:`, `ulw:` …) working via `keyword-detector` hook for backward compat during 2.x.
3. Aliases: `/ulw`→ultrawork, `/eco`→ecomode, `/plan`→omp-plan, `/di`→deep-interview.
4. `bin/omp.mjs` CLI parity: subcommand per skill (`omp ralph`, `omp hud`, `omp verify` …) with shared dispatch table so CLI verb ≡ slash command ≡ keyword. Compare against `omx` CLI verb list during execution.

## 5. Workstream C — Dynamic HUD

**tmux verdict (investigated as mandated):** tmux is *not* instrumental. The SDK Canvas API provides a native, in-TUI, live-updating surface — superior to tmux `status-right` polling. tmux statusline (`bin/omp-statusline.sh`) is retained as **fallback renderer #2** for users running Copilot CLI inside tmux without canvas support.

Renderer priority:
1. **Canvas HUD** (new): `src/extension/hud-canvas.mts` registers a canvas; `hud-emitter` hook pushes `HudState` diffs on every tool/agent cycle → true dynamic updates, no polling.
2. **tmux statusline** (existing, kept): reads state file; document refresh interval.
3. **File polling / `omp hud --watch`** (existing `src/hud/watch.mts`).

State flow: hooks write `HudState` → single writer in PSM (better-sqlite3) → renderers subscribe. Fixes "HUD not updating dynamically" by replacing file-mtime polling with event push for renderer #1 and shortening poll interval for #2/#3.

## 6. Workstream D — Agent Parity (BREAKING)

Canonical = OMC's 19 agents + `omg-coordinator` equivalent.

| Action | Agents |
|---|---|
| Rename | `explorer`→`explore`, `simplifier`→`code-simplifier` |
| Drop (merge into) | `orchestrator` (→ copilot-instructions orchestration role), `researcher` (→`document-specialist`), `reviewer` (→`code-reviewer`), `tester` (→`test-engineer`) |
| Keep | remaining 17, file suffix `.agent.md` unchanged |

Migration: 2.0.0 release notes + `omp doctor` detects stale `@researcher`/`@reviewer`/`@tester`/`@explorer` references in user configs and suggests replacements. Update `AGENTS.md`, `spec/AGENTS_SPEC.md`, `copilot-instructions.md`, MCP `omp_delegate_task` enum, README ×14.

## 7. Workstream E — Housekeeping (full scope selected)

| Item | Finding | Action |
|---|---|---|
| Built artifacts | `bin/*.mjs.map` committed; `dist/` + `node_modules/` present in tree | Verify gitignore; stop committing maps; CI builds artifacts |
| Spec drift | plugin.json says "23 agents, 39 skills" — both change in 2.0 | Regenerate counts from registry in build step (`scripts/`), not prose |
| Dead code | `interview` vs `deep-interview` duplicate; `omp-reference` vs AGENTS.md overlap | Merge `interview` into `deep-interview`; audit each src/skills/*.mts spawning `bin/omp.mjs` for dead subcommands |
| Dependencies | `@modelcontextprotocol/sdk ^1.0.0` (check latest), better-sqlite3 12.x ok, vitest/esbuild/eslint refresh | `npm outdated` pass; pin SDK protocol version vs CLI 1.0.60+ |
| README langs | 13 translations must reflect 2.0 agent/skill changes | Translation sync pass post-merge; consider generating skill tables |

## 8. Execution Plan (for follow-up PRs)

| # | PR | Contents | Depends on |
|---|---|---|---|
| 1 | Extension scaffold | `extension.mjs`, commands module, registry-driven CommandDefinitions, ADR | — |
| 2 | HUD canvas | Canvas renderer, hud-emitter SDK hook, PSM event push, tmux fallback docs | 1 |
| 3 | Agent parity | Renames, drops, doc/MCP/readme updates | — |
| 4 | Skills P1 (7) | + slash + CLI verbs + tests | 1 |
| 5 | Skills P2 (7) | same | 1 |
| 6 | Skills P3 (6) | same | 1 |
| 7 | Housekeeping | artifacts, deps, dead code, spec regen | 1–6 |
| 8 | Release 2.0.0 | CHANGELOG, RELEASING.md flow, translation sync | all |

Verification gate per PR: `npm run build && npm run typecheck && npm run lint && npm test`; HUD PRs additionally verified live in Copilot CLI ≥ 1.0.60 session and in tmux fallback.

## 9. Open Risks

- Canvas API stability: GA but young; keep renderer abstraction so fallback #2/#3 remain first-class.
- `commands` registration requires extension process; plugin-only installs (no extension dir) fall back to keyword triggers — document.
- Dropping 4 agents breaks saved user workflows → major bump justified; provide `omp doctor` migration check.
- `ccg` semantics differ on Copilot (model picker vs three external CLIs) — scope reduced to multi-model prompt fan-out.
