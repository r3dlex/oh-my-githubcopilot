---
type: branch-policy-checklist
project: oh-my-githubcopilot
host: github
repository: r3dlex/oh-my-githubcopilot
enforcement: checklist-only
owner: andre.burgstahler
last_updated: 2026-06-10
---

# GitHub Branch Policy Checklist - oh-my-githubcopilot

This is a checklist artifact per the AI SDLC ci-policy module. It documents the intended branch protection for `main`. Nothing here mutates GitHub settings; applying a ruleset is a deliberate admin action by the owner.

## Target

- Protected branch: `main`
- Enforcement state: checklist-only (no ruleset or classic protection applied yet)
- Owner: repository admin (andre.burgstahler)

## Required before merge

- [ ] Pull request required before merging (no direct pushes to `main`)
- [ ] Required status checks (GitHub-hosted legs only):
  - [ ] `Pre-commit Hooks` (ci-prek.yml, GitHub-hosted leg)
  - [ ] `build` (ci.yml, GitHub-hosted leg)
  - [ ] `test` (ci.yml, GitHub-hosted leg)
  - [ ] `coverage` (ci.yml, GitHub-hosted leg)
  - [ ] `vscode-omp` (ci.yml, GitHub-hosted leg)
- [ ] Required approvals: 1 (single-maintainer repo; the AI review loop below substitutes for a second human)
- [ ] Dismiss stale approvals on new commits: enabled

## Explicitly NOT required

- `Pre-commit Hooks (self-hosted)`: self-hosted wrapper leg introduced in commit 62610ef; informational only, never mark as required.
- `build (self-hosted)`: self-hosted wrapper leg; informational only.
- `test (self-hosted)`: self-hosted wrapper leg; currently failing on main (verified 2026-06-10 on commit 62610ef, run <https://github.com/r3dlex/oh-my-githubcopilot/actions/runs/27151885667/job/80145470882>); informational only and must never be marked required.
- `coverage (self-hosted)`: self-hosted wrapper leg; informational only.
- `vscode-omp (self-hosted)`: self-hosted wrapper leg; informational only.
- `publish`: release workflow check; gates releases not merges; not a merge requirement.
- `github-release`: release workflow check; gates releases not merges; not a merge requirement.

## Optional hardening (decide later)

- [ ] Require linear history (squash-merge practice keeps history linear already)
- [ ] Require signed commits
- [ ] Merge queue (overkill for a single-maintainer repo)
- [ ] Tag protection ruleset for `v*` (see `docs/agents/release-versioning-github.md`)

## PR merge gate (AI SDLC)

Merge is allowed only when all of these are true:

1. The **architect** confirms the PR still matches ADRs (`docs/architecture/adr/`), module boundaries, branch policy, and acceptance criteria.
2. The **reviewer** confirms code quality, safety, documentation, and drift checks have no blocking findings.
3. The **executor** confirms the requested change is complete, cleanup is done, and the required hosted checks are green.
4. The architect, reviewer, and executor loop reaches explicit agreement. If any role disagrees or required checks are not green, do not merge.

## References

- GitHub rulesets: <https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets>
- GitHub branch protection: <https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches>
