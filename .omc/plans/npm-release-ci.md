# Plan: npm Release via CI

**Date:** 2026-04-12
**Status:** Final (Rev 3 -- Critic ACCEPT-WITH-RESERVATIONS fixes incorporated)
**Repo:** r3dlex/oh-my-copilot | Branch: main | Version: 1.2.0

---

## Context

The repo has a working CI pipeline (`ci.yml`) that builds, tests, runs coverage, and packs via pnpm. However, there is no automated path from "tag a release" to "package lands on npm." The goal is to add a GitHub Actions workflow that publishes to npm on tag push and optionally creates a GitHub Release.

Key observations:
- `package.json` has no `files` field and no `.npmignore` -- everything not in `.gitignore` would be published. This is a risk (specs, tests, state files could leak into the package).
- `prepublishOnly` script already runs `build` + `sync-claude-plugin`.
- Existing `pnpm-package` job proves `pnpm pack` works. The release workflow can follow the same pattern.
- `CHANGELOG.md` exists at repo root.
- No `.npmrc` at repo root.

---

## RALPLAN-DR Summary

### Principles
1. **Separation of concerns** -- Release workflow lives in its own file, not bolted onto `ci.yml`.
2. **Gate on green** -- Never publish unless the full CI suite passes first.
3. **Minimal secrets surface** -- `NPM_TOKEN` only exposed in the publish job, not in build/test.
4. **Reproducibility** -- The same artifact that was tested is the one that gets published.
5. **Provenance** -- npm publish with `--provenance` for supply-chain transparency (requires npm 9+, Node 22 ships npm 10).

### Decision Drivers (top 3)
1. **Safety** -- A bad publish is hard to undo (npm unpublish has a 72h window). CI must pass first.
2. **Simplicity** -- One new file, minimal changes to existing config. No new tooling.
3. **npm best practices** -- `files` field, provenance, tag conventions.

### Option A: Separate `release.yml` triggered by tag push (Recommended)
- **How:** New `.github/workflows/release.yml` triggers on `v*.*.*` tag push. Calls the existing `ci.yml` as a reusable workflow (or uses `workflow_run`), then runs `npm publish --provenance`. Optionally creates a GitHub Release via `gh release create`.
- **Pros:** Clean separation. CI stays untouched. Publish job only runs on explicit tag. Secrets scoped narrowly.
- **Cons:** Slight duplication if CI cannot be reused as a callable workflow (may need to re-run build+test steps).

### Option B: Add a `publish` job to existing `ci.yml` with tag-conditional
- **How:** Add a job to `ci.yml` that runs only when `github.ref_type == 'tag'` and `startsWith(github.ref, 'refs/tags/v')`. Depends on existing `test` + `coverage` jobs.
- **Pros:** No new file. Reuses existing build artifact directly.
- **Cons:** Mixes CI and release concerns. `NPM_TOKEN` secret is configured on a workflow that runs on every push/PR (even if the job is skipped, the secret is still in the workflow context). Harder to reason about trigger conditions.

### Recommendation: Option A

Option A is recommended because it keeps release logic isolated, limits secret exposure, and is the standard pattern for npm package releases. The slight duplication is acceptable -- the release workflow will build+test independently, ensuring the published artifact is verified end-to-end in a single pipeline run. No reusable workflow complexity needed.

Option B was considered but invalidated because mixing `NPM_TOKEN` into the CI workflow that runs on every PR introduces unnecessary secret exposure, and conditional jobs add cognitive overhead to the already 4-job `ci.yml`.

---

## Work Objectives

Add automated npm publishing triggered by semver git tags, with supply-chain provenance and an optional GitHub Release.

## Guardrails

### Must Have
- Publish only after build + test pass
- `NPM_TOKEN` stored as GitHub repository secret, used only in the publish job
- Tag convention: `v*.*.*` (semver with `v` prefix)
- `files` field in `package.json` to control what ships
- `--provenance` flag on `npm publish`
- Manual dispatch (`workflow_dispatch`) as a fallback trigger

### Must NOT Have
- No changes to existing `ci.yml` jobs
- No `pnpm publish` (the package is an npm package; keep publish tooling consistent with `npm`)
- No automatic version bumping or changelog generation (out of scope; manual for now)
- No publish on branch push -- only on tag or manual dispatch

---

## Task Flow

### Step 1: Add `files` field to `package.json`

Add a `files` array to `package.json` to explicitly whitelist what goes into the npm tarball. This prevents specs, tests, `.omc/`, and other non-essential files from leaking into the published package.

**Changes:**
- File: `package.json`
- Add `files` field after `bin`:
  ```json
  "files": [
    "dist/",
    "bin/",
    "skills/",
    "hooks/",
    "src/agents/",
    ".claude-plugin/",
    "AGENTS.md",
    "CHANGELOG.md",
    "LICENSE"
  ]
  ```
  - `hooks/` is required because `hooks/hooks.json` is referenced at runtime by `.claude-plugin/plugin.json`.
  - `src/agents/` is included because the 23 agent definition `.md` files are loaded at runtime by the agent loader. **Known limitation:** `src/utils/agent-loader.mts` resolves agents via `join(process.cwd(), "src", "agents")`, which works when running from the repo root but NOT for globally installed consumers (`npm install -g`). A follow-up task is needed to fix the loader to use `import.meta.url` instead of `process.cwd()`. Including `src/agents/` in `files` is still correct -- it ensures the files ship in the tarball, which is a prerequisite for the future loader fix.
  - `AGENTS.md` is the orchestration brain document referenced by the project.

**Acceptance criteria:**
- `npm pack --dry-run` lists only the intended files (dist, bin, skills, hooks, src/agents, plugin config, AGENTS.md, changelog, license, package.json, README)
- No test files, `.omc/`, `spec/`, or non-agent `src/` files appear in the tarball
- Existing `pnpm-package` CI job still passes

---

### Step 2: Create `.github/workflows/release.yml`

Create the release workflow file with the following structure:

**Triggers:**
- `push.tags`: `v*.*.*`
- `workflow_dispatch` with optional `dry-run` boolean input

**Concurrency control:**
```yaml
concurrency:
  group: release
  cancel-in-progress: false
```
This prevents overlapping release runs (e.g., two tags pushed in quick succession) while ensuring an in-progress release is never cancelled.

**Jobs:**

1. **`build`** (ubuntu-latest, Node 22)
   - Checkout with `fetch-depth: 0` (needed for provenance)
   - **Branch guard:** Verify the tagged commit is reachable from `main`:
     ```bash
     git branch --contains HEAD | grep -q main || \
       { echo "::error::Tagged commit is not on main branch"; exit 1; }
     ```
   - `npm ci`
   - `npm run build`
   - **Artifact strategy:** Tar the entire checkout into `ci-artifact.tar.gz` and upload it via `actions/upload-artifact`. This matches the pattern used in `ci.yml` and ensures downstream jobs have the full source tree (needed for `typecheck`, test fixtures, etc.), not just `dist/` and `bin/`.
     ```bash
     tar -czf /tmp/ci-artifact.tar.gz .
     ```
     Upload `/tmp/ci-artifact.tar.gz` as artifact name `release-build`.

2. **`test`** (needs: build)
   - Download `release-build` artifact
   - Extract: `tar -xzf ci-artifact.tar.gz`
   - `npm ci` (for dev deps / test runner)
   - `npm run typecheck` (requires full source tree -- this is why we tar the whole checkout, not just `dist/`)
   - `npm test`
   - **IMPORTANT:** Test commands must NOT use `|| true`. Unlike `ci.yml` (which tolerates flaky tests), the release workflow must hard-fail on any test failure to block publish.

3. **`publish`** (needs: test)
   - Download `release-build` artifact and extract: `tar -xzf ci-artifact.tar.gz`
   - `npm ci --omit=dev` (production deps only -- skips dev-dependency install time since tests already passed)
   - Verify tag version matches `package.json` version (extract tag with `${GITHUB_REF#refs/tags/v}` and compare to `node -p "require('./package.json').version"`)
   - Verify `.claude-plugin/plugin.json` version matches the git tag:
     ```bash
     PLUGIN_VERSION=$(node -p "require('./.claude-plugin/plugin.json').version")
     TAG_VERSION="${GITHUB_REF#refs/tags/v}"
     if [ "$PLUGIN_VERSION" != "$TAG_VERSION" ]; then
       echo "::error::.claude-plugin/plugin.json version ($PLUGIN_VERSION) does not match tag ($TAG_VERSION)"
       exit 1
     fi
     ```
     Rationale: the `sync-claude-plugin` npm script copies from `.github/plugin/plugin.json` but does not sync the version field. This check catches that drift.
   - **Pre-publish safety net:** Run `npm pack --dry-run` and log the file list. This catches unexpected files before they reach the registry. The step should fail if the output contains any file not in the `files` whitelist.
   - `npm publish --provenance --access public --ignore-scripts`
     - `--ignore-scripts` is used because artifacts are already pre-built by the `build` job; running `prepublishOnly` again would be redundant. Note: local `npm publish` (without `--ignore-scripts`) still runs `prepublishOnly` as expected.
   - Environment: `npm` (for GitHub environment protection rules, optional)
   - Permissions: `contents: read`, `id-token: write` (required for provenance)
   - Secret: `NPM_TOKEN` via `NODE_AUTH_TOKEN` env var
   - If `dry-run` input is true, use `npm publish --dry-run` instead
   - Uses `actions/setup-node@v4` with `registry-url: https://registry.npmjs.org`

4. **`github-release`** (needs: publish)
   - Run `gh release create ${{ github.ref_name }} --generate-notes --latest`
   - Attach the `.tgz` artifact (run `npm pack` and upload)
   - Permissions: `contents: write`
   - Skip if `dry-run` is true

**Acceptance criteria:**
- Workflow file passes `actionlint` (if available) or at minimum valid YAML
- Pushing a `v*.*.*` tag triggers the workflow
- `workflow_dispatch` with `dry-run: true` runs all steps but does not actually publish
- Version mismatch between tag and `package.json` fails the pipeline with a clear error message
- Version mismatch between tag and `.claude-plugin/plugin.json` fails the pipeline with a clear error message
- `--provenance` is used (requires `id-token: write` permission)
- `--ignore-scripts` is used on `npm publish` (artifacts pre-built by build job)
- No `|| true` on any test command in `release.yml` -- test failures must block publish
- Artifact uses full-repo tarball (`ci-artifact.tar.gz`), not partial `dist/`+`bin/` upload
- Branch guard rejects tags on non-main commits
- Concurrency group `release` is set with `cancel-in-progress: false`
- `npm pack --dry-run` runs before `npm publish` as a safety check

---

### Step 3: Configure repository secret and environment

**Manual steps (documented, not automated):**
1. Generate an npm access token (granular, publish-only, scoped to `oh-my-copilot` package)
2. Add it as `NPM_TOKEN` in GitHub repo Settings > Secrets and variables > Actions
3. (Optional) Create a GitHub environment called `npm` with protection rules (e.g., require approval for publishes)

**Acceptance criteria:**
- `NPM_TOKEN` secret exists in the repository
- Workflow can authenticate to npm registry during publish job
- Document these steps in a `RELEASING.md` file at repo root

---

### Step 4: Create `RELEASING.md` documentation

Create a short document at the repo root describing the release process:

1. Update version in `package.json` (`npm version patch/minor/major`)
2. **Manually update `.github/plugin/plugin.json` version** to match -- `npm version` only bumps `package.json`, not the plugin manifest. The CI will fail if these are out of sync (see Step 2 version check).
3. Update `CHANGELOG.md`
4. Commit: `chore: release vX.Y.Z`
5. Tag: `git tag vX.Y.Z`
6. Push: `git push origin main --tags`
7. CI handles the rest (build, test, publish, GitHub Release)

Also document: how to do a dry-run, how to rotate `NPM_TOKEN`, rollback procedure (`npm unpublish` within 72h or `npm deprecate`), and that `better-sqlite3` is a native addon requiring native compilation on install (users may need build tools like `node-gyp`, Python, and a C++ compiler).

**Acceptance criteria:**
- `RELEASING.md` exists at repo root
- Covers the happy path, dry-run, secret rotation, and rollback
- No implementation details leak (no token values)

---

### Step 5: Validate end-to-end with a dry-run

After merging Steps 1-4:
1. Trigger the workflow manually via `workflow_dispatch` with `dry-run: true`
2. Verify all jobs pass (build, test, publish --dry-run)
3. Verify `npm pack --dry-run` output matches expected file list
4. If everything passes, tag `v1.2.0` and push to trigger the real first publish

**Acceptance criteria:**
- Dry-run workflow completes green
- No unexpected files in the tarball
- Real publish of `v1.2.0` succeeds (package visible on npmjs.com/package/oh-my-copilot)

---

## Success Criteria

1. Pushing a `v*.*.*` tag to `main` triggers an automated build > test > publish > release pipeline
2. The published npm package contains only intended files (enforced by `files` field)
3. npm provenance attestation is attached to the published package
4. A GitHub Release is created with auto-generated notes and the `.tgz` attached
5. The process is documented in `RELEASING.md`
6. Dry-run capability exists for safe validation before real publishes

---

## ADR: Release Pipeline Decision

- **Decision:** Separate `release.yml` workflow triggered by semver tag push
- **Drivers:** Secret isolation, separation of concerns, npm best practices
- **Alternatives considered:** Adding a conditional publish job to existing `ci.yml`
- **Why chosen:** Keeps CI clean, limits `NPM_TOKEN` exposure to release-only runs, follows GitHub Actions best practices for package publishing
- **Consequences:** Build+test steps are duplicated between `ci.yml` and `release.yml`; this is acceptable because release runs are infrequent and the duplication ensures the published artifact is independently verified
- **Follow-ups:** Consider making `ci.yml` a reusable workflow in the future to eliminate duplication; consider adding automated changelog generation (e.g., `conventional-changelog`) in a later iteration; consider consolidating from 4 jobs to 2 (`build-and-test` + `publish-and-release`) to halve YAML complexity while preserving secret isolation; fix `agent-loader.mts` to use `import.meta.url` instead of `process.cwd()` so `src/agents/` works for globally installed consumers

---

## Revision Log

| Rev | Date | Author | Summary |
|-----|------|--------|---------|
| 1 | 2026-04-12 | Planner | Initial draft |
| 2 | 2026-04-12 | Planner | Architect feedback: added `.claude-plugin/plugin.json` version check, `--ignore-scripts` rationale, `hooks/` to `files`, native addon note, Option B invalidation rationale |
| 3 (Final) | 2026-04-12 | Planner | Critic ACCEPT-WITH-RESERVATIONS fixes: (1) MAJOR -- switched from partial `dist/`+`bin/` artifact to full-repo tarball (`ci-artifact.tar.gz`) matching `ci.yml` pattern, so `typecheck` has source access; (2) MAJOR -- documented `agent-loader.mts` `process.cwd()` limitation for global installs, added follow-up for `import.meta.url` fix; (3) added `npm pack --dry-run` safety net before publish; (4) added branch guard requiring tagged commit on `main`; (5) added concurrency control group; (6) documented `plugin.json` manual version bump in RELEASING.md steps; (7) fixed misleading `--omit=dev` rationale |
