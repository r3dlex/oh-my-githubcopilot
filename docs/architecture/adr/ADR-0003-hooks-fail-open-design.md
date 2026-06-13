# ADR-0003: Hooks Fail-Open Design

## Status
Accepted

## Context
GitHub Copilot CLI hooks (UserPromptSubmitted, PreToolUse, PostToolUse) must emit valid JSON and exit 0 within their timeout. If a hook exits non-zero or times out, the CLI denies the tool call or prompt — blocking the user completely. OMP's 6 lifecycle hooks process stdin, parse JSON, and apply routing logic; any unhandled exception or slow startup would cause silent denials.

The original implementation had `timeoutSec: 0.2` and no error handling, causing widespread tool call denials when hooks encountered unexpected input.

## Decision
All 6 OMP hooks route through a shared `runHookMain(processHook, options)` entry point in `src/hooks/runner.mts` that:
1. Wraps all processing in try/catch
2. Emits `{"decision":"allow","status":"error",...}` on any failure
3. Always exits 0
4. Logs failures to `~/.omp/logs/hook-failures.jsonl` for post-hoc debugging
5. Runs with `timeoutSec: 5` (raised from 0.2)

## Consequences
- **Positive:** OMP hooks never block user workflows, even when processing malformed input or encountering bugs.
- **Positive:** Failures are observable via the JSONL log without disrupting the session.
- **Negative:** A hook that silently fails will not apply its intended mutation (e.g., model routing). This is acceptable — the default Copilot behavior is always safe.
- **Trade-off:** Fail-open means a bug in the delegation-enforcer would allow disallowed delegations. This is mitigated by the hook logging and the fact that the agent itself enforces its own guardrails.
