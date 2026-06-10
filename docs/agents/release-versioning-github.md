---
type: release-versioning-checklist
project: oh-my-githubcopilot
host: github
repository: r3dlex/oh-my-githubcopilot
strategy: semver
enforcement: checklist-only
last_updated: 2026-06-10
---

# Release Versioning Checklist - oh-my-githubcopilot

Per the AI SDLC release-versioning module. Strategy is **semver**. The repository has a LIVE working release pipeline (`.github/workflows/release.yml`); this document describes and audits that pipeline - it does not replace it. Current npm latest is `1.8.1`; `package.json` is in sync at `1.8.1`.

**This pass changes no workflow files.** Wiring guardrails into `release.yml` is a listed future decision.

## Tag format

`v<major>.<minor>.<patch>` for example `v1.8.1` (stable) or `v1.8.1-alpha.<short-sha>` (alpha). The manifest (`release.json`) is the audit anchor; it becomes authoritative once guardrails are wired into the release workflow. Convention for the initialized manifest: `tag` and `trace_id` are empty strings until the first guardrail-passed release run populates them.

## How a release happens (existing flow)

1. Push a tag `v*.*.*` to `main`, push to `main`, or trigger the `Release` workflow via **workflow_dispatch** (inputs: `dry-run`, `release_type` auto/alpha/stable).
2. The `build` job resolves the version: if the HEAD commit carries a matching semver tag (or `release_type=stable` is forced), `release_type=stable` and `npm_tag=latest`; otherwise `release_type=alpha` and `npm_tag=alpha` with a short-sha suffix.
3. A branch guard confirms the tagged commit is reachable from `origin/main`.
4. The `test` job downloads the build artifact, runs `typecheck`, `npm test`, validates `CHANGELOG.md` contains the version heading (stable only), and runs `archgate check`.
5. The `publish` job verifies `package.json` and `.claude-plugin/plugin.json` versions match, publishes to GitHub Packages (`@r3dlex/oh-my-githubcopilot`) and to npmjs.com (`oh-my-githubcopilot`) via OIDC trusted publishing.
6. The `github-release` job (stable, non-dry-run only) creates a GitHub Release with auto-generated notes and attaches the npm tarball.

## Tag guardrails (five gates - current enforcement status)

- [ ] **green_ci**: latest CI on the candidate SHA reports success (GitHub-hosted legs; self-hosted legs are informational only, see `docs/agents/branch-policy-github.md`).
  - **Current status**: unenforced gap - the workflow does not explicitly poll CI status before releasing. Branch guard (step 3 above) is a partial proxy.
- [ ] **conventional_commits**: commits in the candidate range match `feat:|fix:|docs:|test:|refactor:|perf:|build:|chore:|ci:` grammar.
  - **Current status**: unenforced gap - the workflow does not validate commit message format.
- [ ] **secrets_permissions_preflight**: explicit `permissions:` blocks present; key names logged, never values.
  - **Current status**: partially enforced - `publish` job has `permissions: contents: read, id-token: write, packages: write`; `github-release` job has `permissions: contents: write`. Preflight logging of key presence is not explicitly implemented.
- [ ] **no_dirty_generated_state**: clean working tree in the release job.
  - **Current status**: partially enforced - the workflow works from a checked-out artifact rather than a live checkout in publish/release jobs, which isolates dirty state risk. No explicit `git diff --exit-code` guard.
- [ ] **protected_tag_policy**: GitHub ruleset protecting tag pattern `v*` so only CI can create release tags.
  - **Current status**: unenforced gap - no tag protection ruleset applied. Until the ruleset is applied this guardrail is `skipped` with that reason recorded in `release.json`.

## Tag protection ruleset (admin checklist, not automated)

- [ ] Ruleset target: tags matching `v*`
- [ ] Restrict creation to the GitHub Actions identity
- [ ] Block deletion and non-fast-forward updates (no history rewrites; a bad tag is retired forward with a new tag, never deleted)

## Future decisions (not in this pass)

- Wire the five guardrails explicitly into `release.yml` so the manifest is emitted as a run artifact and `tag_creation` transitions from `blocked` to `pass`.
- Add conventional-commits validation step to the `test` job.
- Add explicit `git diff --exit-code` to the `build` job after artifact generation.
- Add CI-status preflight step (poll GitHub Checks API) at the start of the `build` job.
- Apply tag protection ruleset via GitHub admin UI or Terraform.

## Out of scope

- No production deploys, no database migrations, no cloud provisioning.
- No tag deletion or force-push, ever.

## References

- GitHub rulesets (tag protection): <https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets>
- npmjs.com OIDC trusted publishing: <https://docs.npmjs.com/generating-provenance-statements>
