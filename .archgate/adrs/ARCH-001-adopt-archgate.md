---
id: ARCH-001
title: Adopt archgate for ADR Governance
domain: governance
rules: false
---

# Adopt archgate for ADR Governance

## Context

oh-my-copilot is a multi-agent orchestration plugin for GitHub Copilot CLI with 18 agents, 30+ skills, and a growing plugin architecture. Architectural decisions have previously been tracked in `spec/*.md` files and `.omc/plans/` documents without automated enforcement.

## Decision

Adopt archgate/cli as the ADR governance and architectural rule enforcement tool. ADRs are stored in `.archgate/adrs/` as Markdown files with YAML frontmatter. Rules are enforced via `npx archgate check` in CI.

## Alternatives Considered

- **Manual ADR tracking** — Markdown files without tooling. Pros: simple. Cons: no automated enforcement, no CI gate, easy to ignore.
- **Global install + Makefile** — Pros: always available. Cons: not reproducible, `npm ci` does not install global tools, version skew between contributors and CI.
- **Pre-commit only** — Pros: fast. Cons: contributors can bypass with `--no-verify`, does not block merges.

## Consequences

- `archgate` is a devDependency — reproducible via `npm ci`
- CI runs `npx archgate check` as a blocking gate after `typecheck`
- `.archgate/adrs/` is the canonical location for implemented architectural decisions
- `.omc/plans/` continues to be used for future/not-yet-implemented decisions

## Compliance and Enforcement

This ADR has no automated rules. Future ADRs with testable rules should set `rules: true` and create a companion `.rules.ts` file.
