# Plan: Zero-Install CI for ARM64

## Context

The current CI workflow in `.github/workflows/ci.yml` runs `npm ci` on every job (`test`, `coverage`, `pnpm-package`), spending ~30-60s on dependency installation per job. This is redundant work -- `dist/` and `bin/` are already built and checked into the repo. The only non-buildable runtime dependency is `better-sqlite3`, a native Node module with ARM64 binaries available.

**Key constraints discovered during investigation:**
- `better-sqlite3` is listed in `dependencies` (not `devDependencies`) -- it is a runtime dependency.
- Tests import from `../../src/...` (not `dist/`), so running `npm test` from the package tarball requires either `src/` in the package or the full `node_modules`.
- `vitest` runs via esbuild's automatic TypeScript transform, so no source build step is needed for tests.
- The published `npm pack` artifact (`.tgz`) only contains `bin/`, `dist/`, and `plugin.json` -- it intentionally excludes `src/` and `node_modules`.

---

## RALPLAN-DR Summary

### Principles

1. **Reproducible artifacts** -- what CI downloads should be bit-for-bit identical to what ships.
2. **No install in CI** -- `npm ci`, `pnpm install`, and `corepack prepare` must not appear in test/coverage jobs.
3. **Platform parity** -- test artifacts must work on ubuntu-latest (x64) and macOSARM64 / linux/arm64 runners.
4. **Coverage preserved** -- the `coverage/` report must still be generated and uploaded.

### Decision Drivers

1. **DD1: `better-sqlite3` native module** -- This is the only non-trivial runtime dependency. It ships pre-built ARM64 binaries via `@mapbox/node-pre-gyp`, so no rebuild is needed on ARM64 hosts if we ship the correct tarball.
2. **DD2: Test import paths** -- Tests import from `src/` not `dist/`. Either `src/` must be in the artifact, or test imports must be redirected.
3. **DD3: Single build trigger** -- We want one build per commit, not one build per platform.

### Viable Options

#### Option A: Unified Artifact (Full node_modules tarball)

Build once on ubuntu-latest, tar the entire `node_modules/` + `src/` + built files, upload as a single artifact. Test and coverage jobs download and extract, then run `npm test` directly.

**Pros:**
- Zero changes to test files or package structure.
- Complete runtime environment -- works on any ARM64 host without rebuild.
- Eliminates all install steps across all 3 jobs.
- Simplest mental model: CI is now "download, test, done."

**Cons:**
- Artifact size: `node_modules/` is large (~30-60 MB compressed). First-run download dominates time savings, but subsequent runs with cache are comparable.
- Must be regenerated if any dependency changes (but this is true of all options).
- Slightly different artifact for ARM64 if native module rebuild is needed.

#### Option B: Published Package + Separate test-bundle

Keep the current `pnpm pack` artifact (`.tgz`) unchanged. Generate a separate `test-bundle.tar.gz` that contains `src/` + `tests/` + `vitest.config.ts` + `tsconfig.json`. Test job downloads both artifacts and installs only vitest devDeps (via `npm install --ignore-scripts --no-save`).

**Pros:**
- Smaller primary artifact (the npm package itself).
- Clean separation between shipped package and test environment.

**Cons:**
- Requires restructuring test import paths (from `src/` to `dist/`) or including `src/` in the test-bundle.
- More artifacts to manage and download.
- Doesn't fully eliminate install -- still needs vitest devDeps.
- Two artifact pipelines to keep in sync.

#### Option C: Test imports redirected to dist/ + npm pack only

Change test files to import from `dist/` (the built files) instead of `src/`. Upload only the published npm package (`.tgz`) as the artifact. Test job downloads and extracts, runs `npm test` which uses the built dist files.

**Pros:**
- Single, minimal artifact (the published package itself).
- No `src/` in production package.

**Cons:**
- **Breaking change**: All 25 test files must be rewritten to import from `dist/` instead of `src/`. This is invasive and easy to get wrong.
- Loss of source-level coverage mapping (tests would instrument `dist/` not `src/`).
- Violates "don't rewrite tests" -- high risk of regressions.
- Not viable without significant refactoring.

### Recommendation: Option A (Unified Artifact)

Option A is the clear choice:
- It requires **no changes to test files or source code**.
- It works on ARM64 because `better-sqlite3` ships with pre-built ARM64 binaries.
- The single build pipeline is simple and robust.
- The larger artifact is a non-issue with GitHub Actions' artifact caching (artifacts are reused across jobs within a run).

---

## Implementation Plan

### Step 1: Add a build-and-upload job to CI

Add a new `build` job that runs on ubuntu-latest. It will:
- Check out the repo.
- Run `npm ci` once.
- Run `npm run build` (already builds all dist/ and bin/ artifacts).
- Tar `node_modules/` + `src/` + all project files (except node_modules exclusions) into a single artifact.
- Upload the artifact named `ci-artifact`.

**File changed:** `.github/workflows/ci.yml`

**Acceptance criteria:**
- `build` job completes successfully on ubuntu-latest.
- `ci-artifact` is uploaded with all files needed to run `npm test` without install.
- Total tarball size is reasonable (< 200 MB).

### Step 2: Replace test job install steps with artifact download

The `test` job will:
- Remove `actions/setup-node` and `npm ci` steps.
- Add `actions/checkout@v4` (shallow clone is fine).
- Add `actions/download-artifact@v4` to download `ci-artifact`.
- Extract the artifact.
- Run `npm run typecheck` and `npm test` directly.
- Remove `npm run build` (dist/ is already in the artifact).

**File changed:** `.github/workflows/ci.yml`

**Acceptance criteria:**
- `test` job passes on ubuntu-latest without running `npm ci`.
- `npm test` finds and runs all 25 test files successfully.
- No `npm ci`, `npm install`, or `pnpm install` commands appear in the job.

### Step 3: Replace coverage job install steps with artifact download

Mirror Step 2 for the `coverage` job. Remove install, download artifact, run tests with `--coverage`.

**File changed:** `.github/workflows/ci.yml`

**Acceptance criteria:**
- `coverage` job passes and generates `coverage/lcov.info` and `coverage/lcov-report/`.
- No install steps remain.

### Step 4: Update pnpm-package job to consume the build artifact

Refactor `pnpm-package` to run `pnpm install && pnpm pack` and upload the `.tgz` as before, but add a new job or step that downloads `ci-artifact` and runs `pnpm pack` from it. This keeps the npm package verification working.

**Alternative (preferred):** Since the `build` job already runs `npm ci && npm run build`, the `pnpm-package` job can simply download `ci-artifact` and run `pnpm pack` from the extracted files. This eliminates the second `npm ci` / `pnpm install` call entirely.

**File changed:** `.github/workflows/ci.yml`

**Acceptance criteria:**
- `pnpm-package` job uploads a valid `.tgz` artifact.
- No redundant install steps.

### Step 5: Add ARM64 matrix variant (optional -- verify compatibility)

Add `runs-on: [ubuntu-latest, macos-14]` to a new job or existing jobs to verify the artifact works on ARM64. This confirms `better-sqlite3` pre-built binaries are compatible.

**File changed:** `.github/workflows/ci.yml`

**Acceptance criteria:**
- Artifact download + extract + test runs successfully on macos-14 (ARM64).
- No install step present.

---

## Detailed TODOs

| # | Task | File | Acceptance Criteria |
|---|------|------|---------------------|
| 1 | Add `build` job: `npm ci` + `npm run build` + tar + upload `ci-artifact` | `.github/workflows/ci.yml` | Job succeeds, artifact uploaded |
| 2 | Refactor `test` job: download artifact, remove `npm ci`, run typecheck + test | `.github/workflows/ci.yml` | Job passes, zero install commands |
| 3 | Refactor `coverage` job: download artifact, remove `npm ci`, run coverage | `.github/workflows/ci.yml` | `coverage/lcov.info` generated |
| 4 | Refactor `pnpm-package`: download artifact, run `pnpm pack` | `.github/workflows/ci.yml` | `.tgz` uploaded successfully |
| 5 | Verify ARM64 compatibility: add macos-14 matrix or separate job | `.github/workflows/ci.yml` | Passes on ARM64 runner |

---

## Verification Steps

1. **Local dry-run:** Create a fresh checkout, run `npm ci && npm run build`, tar the result, extract to another directory, run `npm test`. Confirm all tests pass.
2. **CI verification:** Push a test commit. Observe that `build` job completes first, then `test`/`coverage`/`pnpm-package` jobs download and run without any install step. All jobs pass.
3. **ARM64 verification:** After merge, verify the workflow also passes on `macos-14` runner (or a self-hosted ARM64 runner if configured).
4. **Coverage check:** Confirm `coverage/lcov.info` is generated and upload-artifact step succeeds.

---

## Success Criteria

- `npm ci`, `npm install`, `pnpm install`, and `corepack prepare` are **not present** in `test`, `coverage`, or `pnpm-package` jobs.
- All 3 jobs pass on ubuntu-latest using downloaded artifacts.
- All 25 test files execute successfully from the artifact.
- Coverage report is generated.
- The plan is ready to hand off to `/oh-my-claude-code:start-work`.
