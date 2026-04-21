# Continuous Release Pipeline for oh-my-copilot

**Date:** 2026-04-12
**Status:** Final (Rev 3 — Architect APPROVE + Critic ACCEPT, implementation notes added)
**Repo:** r3dlex/oh-my-copilot | Branch: main | Version: 1.2.0

---

## Context

The `oh-my-copilot` npm package currently releases only when a `v*.*.*` tag is pushed. The goal is to publish on **every push to `main`**: stable releases for tagged commits (`X.Y.Z` on `latest`), and alpha pre-releases for untagged commits (`X.Y.Z-alpha.<SHORT_SHA>` on `alpha`). A CHANGELOG.md gate ensures every **stable** release is documented.

### Current State

- **CI workflow** (`.github/workflows/ci.yml`): runs on every push/PR; build, test, coverage, pnpm-package.
- **Release workflow** (`.github/workflows/release.yml`): runs on `v*.*.*` tag push or manual dispatch; build → test → publish → github-release. Uses `GITHUB_REF` to derive tag version in parity checks.
- **CHANGELOG.md**: manually maintained, one `# oh-my-copilot vX.Y.Z` heading per version.
- **RELEASING.md**: documents the manual release process (npm version, sync plugin.json, push tag).
- **package.json version**: `1.2.0`.
- **Known pre-existing issue**: `.github/plugin/plugin.json` is at version `1.0.0` while `package.json` is `1.2.0` — must be fixed before the first stable release or the parity check will fail.

---

## RALPLAN-DR

### Principles

1. **Every main commit is publishable** — CI/CD should treat `main` as the release branch.
2. **Stable releases are intentional** — only tagged commits produce `latest` dist-tag versions.
3. **Changelog gates stable releases only** — alphas publish freely; stable releases require documentation.
4. **No automation of version bumps** — `package.json` version remains a manual developer decision.
5. **Minimal workflow sprawl** — prefer extending one workflow over splitting into two.

### Decision Drivers

1. **Traceability** — every published artifact must be traceable to a commit.
2. **Developer friction** — the pipeline must not block day-to-day pushes to main.
3. **Race condition safety** — concurrent pushes to main must not corrupt state.

### Key Decision 1: CHANGELOG commit-back strategy

**Chosen: Option B (in-memory validation only, no commit-back)**

Alpha pre-releases validate CHANGELOG.md only for **stable** releases. Alpha entries are NOT appended to CHANGELOG.md. The npm registry is the audit trail. This avoids race conditions, commit noise, and infinite-loop risk.

### Key Decision 2: Workflow structure

**Chosen: Option A (single extended workflow)**

Keep `push: tags: [v*.*.*]` trigger AND add `push: branches: [main]` trigger. Both are kept (not replacing one with the other). When a stable release is done via `git push origin main --follow-tags`, GitHub fires BOTH events. Deduplication is handled by the concurrency group (`release`, `cancel-in-progress: false`) — the second run sees the publish already complete and the version-parity check passes idempotently via npm's "version already exists" guard. Alternatively, use `--access public` with `npm publish`'s built-in idempotency via `--ignore-exists` (if available) or catch the E409 error.

**Revised approach**: Keep the `push: tags:` trigger. When a tag push fires, `GITHUB_REF` = `refs/tags/vX.Y.Z`, making version resolution trivial. The `push: branches: [main]` trigger additionally catches untagged commits. For a commit that gets both events, the concurrency queue ensures they run sequentially; the second run detects the package is already published (stable) and is a no-op or skips via the version resolution (alpha run would publish `X.Y.Z-alpha.SHA` which is distinct from `X.Y.Z`).

Actually, cleaner: when both events fire for the same commit (tag + branch push of the same commit), the build job resolves `release_type=stable` for both runs. The concurrency group queues them. The first run publishes `X.Y.Z`. The second run attempts to publish `X.Y.Z` again and gets a 409 "version already exists" from npm — add `|| true` to the publish step OR add an "already published" check before publishing.

**Simplest approach**: Add a pre-publish version check: if `npm view oh-my-copilot@X.Y.Z` succeeds, skip publish and exit 0. This makes the workflow idempotent for stable releases triggered twice.

### Key Decision 3: Race condition handling

Existing `concurrency: group: release, cancel-in-progress: false` queues runs. No shared mutable state (no commit-back). Two concurrent alphas coexist on npm as distinct versions.

---

## Guardrails

### Must Have

- CHANGELOG.md must contain a section header matching the base version (`X.Y.Z`) **for stable releases only**
- Stable releases retain existing version-parity checks, rewritten to use job outputs (not `GITHUB_REF`)
- Alpha releases use `--tag alpha` on npm publish; stable uses `--tag latest`
- `--provenance` and `--ignore-scripts` flags preserved on all npm publish commands
- `concurrency` group prevents parallel publish runs
- `workflow_dispatch` explicitly documented and supports `release_type` input override
- `github-release` job uses the resolved tag name (not `github.ref_name` which is `main` on branch push)
- Publish job idempotent for stable (skip if already published)

### Must NOT Have

- No automatic version bumping of `package.json`
- No commit-back to the repo from the workflow
- No changes to the CI workflow (`ci.yml`)
- No `npm` environment protection on alpha runs (or use a separate environment for alpha vs stable)
- No CHANGELOG gate on alpha releases

---

## Task Flow

### Prerequisite: Fix plugin.json version drift

Before any of the following steps, `.github/plugin/plugin.json` must be updated from `1.0.0` to `1.2.0` (to match `package.json`). Otherwise the existing parity check will fail on the first stable release.

**File:** `.github/plugin/plugin.json`
**Change:** `"version": "1.0.0"` → `"version": "1.2.0"`
**Note:** Also run `npm run sync-claude-plugin` to propagate to `.claude-plugin/plugin.json`.

**Acceptance criteria:**
- [ ] `.github/plugin/plugin.json` version = `1.2.0`
- [ ] `.claude-plugin/plugin.json` version = `1.2.0` (after sync)

---

### Step 1: Extend workflow triggers and add version resolution job

**File:** `.github/workflows/release.yml`

**Changes:**

1. Add `push: branches: [main]` trigger (keep existing `push: tags: [v*.*.*]` and `workflow_dispatch`).

2. Add `release_type` input to `workflow_dispatch`:
   ```yaml
   workflow_dispatch:
     inputs:
       dry-run:
         description: 'Dry run (skip actual publish)'
         type: boolean
         default: false
       release_type:
         description: 'Force release type (auto = detect from tag)'
         type: choice
         options: [auto, alpha, stable]
         default: auto
   ```

3. Add job `outputs:` on the `build` job so downstream jobs can consume the resolved version:
   ```yaml
   build:
     runs-on: ubuntu-latest
     outputs:
       release_type: ${{ steps.version.outputs.release_type }}
       publish_version: ${{ steps.version.outputs.publish_version }}
       npm_tag: ${{ steps.version.outputs.npm_tag }}
       base_version: ${{ steps.version.outputs.base_version }}
       git_tag: ${{ steps.version.outputs.git_tag }}
   ```

4. Add version resolution step in `build` job (after checkout with `fetch-depth: 0`):
   ```yaml
   - name: Resolve release version
     id: version
     run: |
       PKG_VERSION=$(node -p "require('./package.json').version")
       SHORT_SHA=$(git rev-parse --short HEAD)
       # Check if current commit has a matching version tag
       TAG_MATCH=$(git tag --points-at HEAD | grep -E "^v${PKG_VERSION//./\\.}$" || true)
       # Allow workflow_dispatch override
       FORCED="${{ inputs.release_type }}"

       if [ "$FORCED" = "stable" ] || { [ "$FORCED" != "alpha" ] && [ -n "$TAG_MATCH" ]; }; then
         echo "release_type=stable" >> "$GITHUB_OUTPUT"
         echo "publish_version=$PKG_VERSION" >> "$GITHUB_OUTPUT"
         echo "npm_tag=latest" >> "$GITHUB_OUTPUT"
         echo "git_tag=${TAG_MATCH:-v$PKG_VERSION}" >> "$GITHUB_OUTPUT"
       else
         echo "release_type=alpha" >> "$GITHUB_OUTPUT"
         echo "publish_version=${PKG_VERSION}-alpha.${SHORT_SHA}" >> "$GITHUB_OUTPUT"
         echo "npm_tag=alpha" >> "$GITHUB_OUTPUT"
         echo "git_tag=" >> "$GITHUB_OUTPUT"
       fi
       echo "base_version=$PKG_VERSION" >> "$GITHUB_OUTPUT"
   ```

5. Update branch guard to only run for stable releases:
   ```yaml
   - name: Branch guard (tag must be on main)
     if: needs.build.outputs.release_type == 'stable'  # alpha is inherently on main
     run: |
       git branch --contains HEAD | grep -q main || \
         { echo "::error::Tagged commit is not reachable from main branch"; exit 1; }
   ```

**Acceptance criteria:**
- [ ] Workflow triggers on every push to `main`
- [ ] Workflow triggers on `v*.*.*` tag push (kept)
- [ ] `workflow_dispatch` accepts `dry-run` and `release_type` inputs
- [ ] Tag pushes that have a matching version tag produce `release_type=stable`
- [ ] Non-tagged pushes produce `release_type=alpha` with short SHA suffix
- [ ] `workflow_dispatch` with `release_type=auto` auto-detects; `alpha`/`stable` override
- [ ] Version outputs are accessible in all downstream jobs via `needs.build.outputs.*`

---

### Step 2: Add CHANGELOG.md validation gate (stable releases only)

**File:** `.github/workflows/release.yml`

Add a step in the `build` or `test` job (after version resolution), gated on stable:

```yaml
- name: Validate CHANGELOG.md (stable releases only)
  if: needs.build.outputs.release_type == 'stable'
  run: |
    BASE_VERSION="${{ needs.build.outputs.base_version }}"
    # Escape dots for literal string matching
    if ! grep -qF "v${BASE_VERSION}" CHANGELOG.md; then
      echo "::error::CHANGELOG.md does not contain a section for version ${BASE_VERSION}"
      echo "::error::Add a heading like '# oh-my-copilot v${BASE_VERSION}' with release notes before tagging."
      exit 1
    fi
    echo "CHANGELOG.md contains section for v${BASE_VERSION} ✓"
```

Note: `grep -qF` uses fixed-string matching, avoiding regex dot-as-wildcard issue.

**Acceptance criteria:**
- [ ] Pipeline fails for stable releases when CHANGELOG.md lacks a section for the current `package.json` version
- [ ] Pipeline passes for alpha releases regardless of CHANGELOG.md state
- [ ] Pipeline passes for stable when CHANGELOG.md has a matching version heading
- [ ] Uses `grep -qF` (fixed-string) to avoid regex dot-wildcard false positives

---

### Step 3: Rewrite publish job for dual-mode releases

**File:** `.github/workflows/release.yml`

1. **Rewrite version-parity checks** to use job outputs (not `GITHUB_REF`):

```yaml
- name: Verify package.json version matches publish version (stable only)
  if: needs.build.outputs.release_type == 'stable'
  run: |
    PKG_VERSION=$(node -p "require('./package.json').version")
    EXPECTED="${{ needs.build.outputs.base_version }}"
    if [ "$PKG_VERSION" != "$EXPECTED" ]; then
      echo "::error::package.json version ($PKG_VERSION) does not match expected ($EXPECTED)"
      exit 1
    fi

- name: Verify .claude-plugin/plugin.json version matches (stable only)
  if: needs.build.outputs.release_type == 'stable'
  run: |
    PLUGIN_VERSION=$(node -p "require('./.claude-plugin/plugin.json').version")
    EXPECTED="${{ needs.build.outputs.base_version }}"
    if [ "$PLUGIN_VERSION" != "$EXPECTED" ]; then
      echo "::error::.claude-plugin/plugin.json version ($PLUGIN_VERSION) does not match expected ($EXPECTED)"
      exit 1
    fi
```

2. **Skip-if-already-published check** (idempotency for stable):
```yaml
- name: Check if version already published (stable idempotency)
  if: needs.build.outputs.release_type == 'stable' && !inputs.dry-run
  id: npm_check
  run: |
    PUBLISH_VERSION="${{ needs.build.outputs.publish_version }}"
    if npm view "oh-my-copilot@${PUBLISH_VERSION}" version 2>/dev/null | grep -q "${PUBLISH_VERSION}"; then
      echo "already_published=true" >> "$GITHUB_OUTPUT"
      echo "Version ${PUBLISH_VERSION} already on npm, skipping publish."
    else
      echo "already_published=false" >> "$GITHUB_OUTPUT"
    fi
```

3. **Set publish version** before pack/publish (needed for alpha to inject the alpha version):
```yaml
- name: Set publish version in package.json
  run: |
    npm version "${{ needs.build.outputs.publish_version }}" --no-git-tag-version --allow-same-version
```

4. **npm publish** with resolved dist-tag:
```yaml
- name: Publish to npm
  if: ${{ !inputs.dry-run && steps.npm_check.outputs.already_published != 'true' }}
  run: npm publish --provenance --access public --ignore-scripts --tag ${{ needs.build.outputs.npm_tag }}
  env:
    NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}

- name: Publish to npm (dry run)
  if: ${{ inputs.dry-run }}
  run: npm publish --dry-run --ignore-scripts --tag ${{ needs.build.outputs.npm_tag }}
  env:
    NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

5. **Remove `environment: npm`** from publish job (or create a separate `npm-stable` environment only used for stable) to avoid manual approval gates blocking alpha publishes. If the `npm` environment has approval rules, alpha publishes on every main commit will require a human click, defeating the purpose.

**Acceptance criteria:**
- [ ] Alpha releases publish with `--tag alpha`, stable with `--tag latest`
- [ ] Stable parity checks use `base_version` from job outputs (not `GITHUB_REF`)
- [ ] Alpha releases skip both version-parity checks
- [ ] Stable publish is idempotent (skip if already published)
- [ ] `--provenance` and `--ignore-scripts` on all publish commands
- [ ] `--tag` flag present on dry-run publish
- [ ] `npm version` sets the correct version before `npm publish`

---

### Step 4: Fix github-release job tag reference

**File:** `.github/workflows/release.yml`

The `github-release` job currently uses `${{ github.ref_name }}` for the release tag. When triggered from `push: branches: [main]`, `ref_name` = `main`, not `v1.2.0`.

```yaml
github-release:
  runs-on: ubuntu-latest
  needs: [build, publish]
  if: ${{ needs.build.outputs.release_type == 'stable' && !inputs.dry-run }}
  permissions:
    contents: write
  steps:
    # ... (download + extract artifact, npm ci --omit=dev, npm pack)
    - name: Create GitHub Release
      run: |
        TAG="${{ needs.build.outputs.git_tag }}"
        gh release create "$TAG" \
          --generate-notes \
          --latest \
          *.tgz
      env:
        GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Use `needs.build.outputs.git_tag` (resolved in Step 1) instead of `github.ref_name`.

**Acceptance criteria:**
- [ ] GitHub Release is only created for stable releases
- [ ] Release tag name comes from `git_tag` output (e.g., `v1.2.0`), not `github.ref_name`
- [ ] Alpha pushes to main do not create GitHub Releases
- [ ] Dry-run skips GitHub Release

---

### Step 5: Update RELEASING.md

**File:** `RELEASING.md`

Add/update the following sections:

1. **Continuous Alpha Releases**: every push to main auto-publishes `X.Y.Z-alpha.<SHA>` on the `alpha` dist-tag. No manual steps required.

2. **Installing Alpha Versions**: `npm install oh-my-copilot@alpha`

3. **CHANGELOG.md Requirement**: stable releases require CHANGELOG.md to have a section for the current `package.json` version. Alpha releases have no such requirement.

4. **Stable Release Process (updated)**:
   1. Fix `package.json` version: `npm version patch/minor/major`
   2. Sync `.github/plugin/plugin.json` version (manual — CI fails if out of sync)
   3. Run `npm run sync-claude-plugin` to propagate to `.claude-plugin/plugin.json`
   4. Write CHANGELOG.md section for the new version
   5. Commit all changes: `git add . && git commit -m "chore: release vX.Y.Z"`
   6. Tag: `git tag vX.Y.Z` (or `npm version` already did this)
   7. Push commit AND tag together: `git push origin main --follow-tags`
      - **Important**: use `--follow-tags` to push commit and tag atomically. Pushing separately causes two workflow runs; the concurrency group handles this but `--follow-tags` is cleaner.
   8. CI handles build → test → publish → GitHub Release

5. **Manual Dispatch (dry run or override)**:
   - Go to Actions → Release → Run workflow
   - Choose `release_type`: `auto` (detect from tag), `alpha` (force alpha), `stable` (force stable)
   - Check "Dry run" to test without publishing

6. **Dist Tags**: `latest` (stable), `alpha` (pre-release)

**Acceptance criteria:**
- [ ] RELEASING.md documents alpha auto-publish flow
- [ ] RELEASING.md documents CHANGELOG.md gate (stable only)
- [ ] RELEASING.md documents `--follow-tags` for atomic push
- [ ] RELEASING.md documents plugin.json version sync requirement
- [ ] RELEASING.md documents `release_type` input on manual dispatch
- [ ] Existing rollback and NPM_TOKEN instructions preserved

---

## ADR: Continuous Release Pipeline

**Decision:** Implement continuous alpha pre-releases on every push to main, gated stable releases on tag push, with CHANGELOG.md validation for stable only.

**Drivers:**
1. Enable consumers to test unreleased changes immediately
2. Maintain changelog discipline for stable releases without blocking alpha development
3. Keep development trunk unblocked (no CHANGELOG friction on WIP commits)

**Alternatives considered:**
1. **CHANGELOG gate on alpha too** — rejected: violates "every main commit is publishable" principle; blocks pushes after a version bump until changelog is written
2. **Commit-back CHANGELOG updates for alpha** — rejected: race conditions, commit noise, infinite loop risk
3. **Split into two workflows (stable vs alpha)** — rejected: duplicates build/test steps; single workflow with conditionals is simpler
4. **Remove tag trigger, rely on branch push only** — rejected: breaks existing `git push origin vX.Y.Z` (separate tag push) workflow; version resolution from branch push alone cannot detect a tag pushed later

**Why chosen:** Single-workflow extension with in-memory validation for stable only. Minimum friction for alpha (publish freely), maximum clarity for stable (CHANGELOG required). Idempotent for duplicate triggers (tag + branch push same commit). All `GITHUB_REF` usages replaced with resolved job outputs.

**Consequences:**
- Alpha publishes are ephemeral; CHANGELOG.md only documents base versions
- `alpha` dist-tag always points to most recently published alpha
- Developers must write CHANGELOG before tagging a stable release
- plugin.json must be kept in sync with package.json manually (pre-existing requirement)

**Follow-ups:**
- Add CHANGELOG validation to CI (PR-level check) for earlier developer feedback
- Prune old alpha versions from npm periodically
- Fix `agent-loader.mts` to use `import.meta.url` for global install support (existing)
- Consider `npm` environment only for stable releases (separate environment names: `npm-stable` vs none for alpha)

---

## Revision Log

| Rev | Date | Summary |
|-----|------|---------|
| 1 | 2026-04-12 | Initial draft |
| 2 | 2026-04-12 | Architect + Critic ITERATE fixes: (1) kept tag trigger alongside branch trigger; (2) rewrote parity checks to use job outputs not GITHUB_REF; (3) gated CHANGELOG check on stable only; (4) added release_type input to workflow_dispatch; (5) fixed github-release ref_name to use git_tag output; (6) noted plugin.json drift as prerequisite; (7) added exact job outputs: YAML; (8) fixed CHANGELOG grep to use -qF; (9) added idempotency check for stable publish; (10) warned about npm environment approval blocking alpha |
| 3 (Final) | 2026-04-12 | Architect APPROVE + Critic ACCEPT. Implementation notes: (a) place CHANGELOG gate in `test` job not `build`; (b) add `gh release view` idempotency guard before `gh release create`; (c) keep `npm pack --dry-run` after `npm version`; (d) add `build` to `github-release` needs array |
