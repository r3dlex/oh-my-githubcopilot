# Changelog

All notable changes to oh-my-githubcopilot are documented here.

## [v2.0.0] — 2026-06-13

### Breaking Changes
- **Agent parity (23→19):** Six agents removed, merged, or renamed:
  - `orchestrator` → top-level instruction role (not delegatable)
  - `researcher` → merged into `document-specialist`
  - `reviewer` → merged into `code-reviewer`
  - `tester` → merged into `test-engineer`
  - `explorer` → renamed to `explore`
  - `simplifier` → renamed to `code-simplifier`
- Run `omp doctor` to detect stale agent references in your config files.

### New Features

#### Native Slash Commands (SDK Extension)
- Every skill is now available as a native `/skill-name` command in GitHub Copilot CLI
- Aliases: `/ulw` (ultrawork), `/eco` (ecomode), `/plan` (omp-plan), `/di` (deep-interview)
- Extension registered via `.github/extensions/oh-my-githubcopilot/extension.mjs`

#### Dynamic HUD (Canvas API)
- Live Canvas HUD updates via Copilot SDK Canvas API (no tmux required)
- Fallback chain: Canvas → tmux statusline → file polling
- `OMP_HUD_POLL_MS` env var to tune polling interval

#### 20 New Skills (59 total, was 39)
**P1:** verify, cancel, help, code-review, security-review, ultraqa, ultragoal  
**P2:** deep-dive, external-context, deepsearch, sciomc, remember, writer-memory, deepinit  
**P3:** self-improve, visual-verdict, ccg, build-fix, design, web-clone

#### `omp doctor`
- Scans `.github/copilot-instructions.md`, `AGENTS.md`, `.omg/`, `.omp/` for stale agent references
- Exits 1 when issues found (CI-detectable)

### Fixes
- **Hooks fail-open:** All 6 lifecycle hooks now emit `{"decision":"allow"}` on any error instead of exiting 1 (which caused tool-call denials). `timeoutSec` raised from 0.2→5.
- **token-tracker Set serialization:** `warnings_issued` persisted as Array, rehydrated as Set — fixes `TypeError: .has is not a function` crash.
- **Model tier routing:** `analyst`, `designer`, `code-simplifier`, `code-reviewer` correctly routed to `claude-opus-4.6` (high tier).
- **`/help` and `/cancel` keyword collision:** These common words no longer shadow native Copilot commands.

### Architecture
- `src/hooks/runner.mts`: shared fail-open entry point for all hooks
- `src/extension/registry.mts`: single source of truth for all 59 skills
- `src/cli/doctor.mts`: agent migration scanner
- ADR-0002: plugin + extension dual-surface architecture
- ADR-0003: hooks fail-open design
- ADR-0004: token-tracker Set→Array serialization

## [1.8.1] — (previous release)

See git history for changes prior to 2.0.0.
