# Releasing OMP

This document describes the end-to-end release process for `oh-my-githubcopilot`.

Copilot-facing documentation now lives under `.copilot/`. The `.github/` directory is reserved for workflows, plugin metadata, and hook entrypoints.

## Prerequisites

- Write access to the GitHub repository
- `NPM_TOKEN` configured as a GitHub Actions secret (see [Secret Setup](#secret-setup))
- Node.js >= 22.0.0
- Fresh built artifacts in `dist/` committed to git before release publication (plugin consumers may install without running a build)

## Continuous Alpha Releases

Every push to `main` automatically publishes an alpha release:

- **Version scheme**: `X.Y.Z-alpha.<git-short-sha>` (e.g., `1.2.3-alpha.a1b2c3d4`)
- **Dist tag**: `alpha`
- **Manual steps required**: None — fully automated
- **Install latest alpha**: `npm install oh-my-githubcopilot@alpha`
- **CHANGELOG.md requirement**: NOT required for alpha releases

Alpha releases allow users to test new features and fixes immediately without waiting for a stable release.

## Package Registries

The publish job writes to **two registries** on every release:

| Registry        | Package Name                  | Auth                      | Condition               |
| --------------- | ----------------------------- | ------------------------- | ----------------------- |
| GitHub Packages | `@r3dlex/oh-my-githubcopilot` | `GITHUB_TOKEN` (built-in) | Always                  |
| npmjs.com       | `oh-my-githubcopilot`         | `NPM_TOKEN` secret        | When `NPM_TOKEN` is set |

GitHub Packages always publishes (no extra secret required). npmjs.com publishes only when the `NPM_TOKEN` secret is configured — if absent, the step logs a notice and the job succeeds.

**Install from GitHub Packages:**

```bash
# Requires: ~/.npmrc with //npm.pkg.github.com/:_authToken=<PAT>
npm install @r3dlex/oh-my-githubcopilot@alpha    # latest alpha
npm install @r3dlex/oh-my-githubcopilot          # stable
```

**Install from npmjs.com (public, no auth):**

```bash
npm install oh-my-githubcopilot@alpha    # latest alpha
npm install oh-my-githubcopilot          # stable
```

## npm Dist Tags

| Dist Tag | Version Scheme      | When Published               | Install Command                         |
| -------- | ------------------- | ---------------------------- | --------------------------------------- |
| `latest` | `X.Y.Z` (stable)    | On tagged commits (`vX.Y.Z`) | `npm install oh-my-githubcopilot`       |
| `alpha`  | `X.Y.Z-alpha.<sha>` | On every push to `main`      | `npm install oh-my-githubcopilot@alpha` |

## Stable Release Process

To publish a stable release, follow these steps:

### Step 1: Choose the next unreleased version and bump it

```bash
npm version patch --no-git-tag-version   # 1.2.0 → 1.2.1
npm version minor --no-git-tag-version   # 1.2.0 → 1.3.0
npm version major --no-git-tag-version   # 1.2.0 → 2.0.0
```

Before choosing `X.Y.Z`, verify it is newer than every existing git tag and previously published package version. For example, if `v1.5.3` already exists in git history, do **not** reuse `1.5.0`, `1.5.2`, or `1.5.3`; bump to the next free version such as `1.5.4`.

This updates `package.json` and `package-lock.json` without creating a tag yet, so you can sync the remaining release manifests first.

### Step 2: Build and commit runtime artifacts

```bash
npm run build
git add dist/
```

OMP plugin consumers may install from a git checkout or plugin clone without an automatic rebuild, so the committed `dist/` directory is part of the release artifact.

### Step 3: Sync plugin manifests and marketplace metadata

`npm version` only updates `package.json` and `package-lock.json`. You must also manually update:

- `plugin.json`
- `.github/plugin/plugin.json`
- `.github/plugin/marketplace.json`

```json
{
  "version": "X.Y.Z"
}
```

Then run the sync script:

```bash
npm run sync-claude-plugin
```

This syncs the root `plugin.json` into `.claude-plugin/plugin.json`. Before releasing, confirm all of these files match the same version:

- `package.json`
- `package-lock.json`
- `plugin.json`
- `.github/plugin/plugin.json`
- `.github/plugin/marketplace.json`
- `.claude-plugin/plugin.json`

The CI will fail the publish step if the plugin manifests drift from the release version.

### Step 4: Write CHANGELOG.md

Add a section for the new version describing changes. The section heading **must** contain the version number and should follow the bracketed format already used in this repository (for example, `## [v1.2.0] — Short summary`).

Example:

```markdown
## [v1.2.0] — Short summary

### Features

- New feature A
- New feature B

### Fixes

- Fixed bug X
- Fixed bug Y
```

### Step 5: Run release-candidate verification

Before tagging, run the same checks the release candidate is expected to satisfy locally:

```bash
npm run typecheck
npm run test:coverage
npm run build
npm pack --dry-run
```

### Step 6: Create the release commit and tag

After writing the CHANGELOG and syncing manifests, create the release commit and tag:

```bash
git add package.json package-lock.json plugin.json .github/plugin/plugin.json .github/plugin/marketplace.json .claude-plugin/plugin.json CHANGELOG.md RELEASING.md dist/
git commit -m "Prepare the next publishable OMP release"
git tag vX.Y.Z
```

Do not force-move an existing version tag. If `vX.Y.Z` already exists, choose the next unreleased version and repeat the version-sync step instead.

### Step 7: Push with `--follow-tags`

```bash
git push origin main --follow-tags
```

The `--follow-tags` flag ensures the tag is pushed together with the commit and triggers the Release workflow.

### Step 8: Monitor CI

The `Release` GitHub Actions workflow runs automatically and executes 4 jobs in sequence:

- **build** — Compiles and archives the repo
- **test** — Typechecks, runs the test suite, and **verifies CHANGELOG.md exists with the correct version**
- **publish** — Verifies versions match, packs the tarball, and publishes to npm on the `latest` dist-tag
- **github-release** — Creates a GitHub Release with auto-generated notes and attaches the `.tgz`

Monitor at: `https://github.com/r3dlex/oh-my-githubcopilot/actions`

## CHANGELOG.md Requirement

- **Alpha releases**: CHANGELOG.md is NOT required
- **Stable releases**: CHANGELOG.md MUST have a section heading containing the version (for example, `## [v1.2.0] — Short summary`)

The test job in CI explicitly checks for this. If the version heading is missing, the pipeline will fail with a clear error message before publishing.

## Dry Run

To validate the pipeline without publishing to npm:

1. Go to **Actions → Release → Run workflow**
2. Provide inputs:
   - **dry-run** (checkbox): Check this to skip real npm publish
   - **release-type** (dropdown): Select `alpha` or `stable` to test the workflow for that release type
3. Click **Run workflow**

The workflow runs all steps but uses `npm publish --dry-run` (when applicable) and skips GitHub Release creation. Use this to verify tarball contents and pipeline health before a real release.

## Secret Setup

The publish job requires an npm access token stored as a GitHub Actions secret:

1. Generate a granular npm access token:
   - Log in to [npmjs.com](https://www.npmjs.com)
   - Go to **Access Tokens → Generate New Token → Granular Access Token**
   - Scope: **Read and write** for the `oh-my-githubcopilot` package
   - Set an expiry (recommend 1 year)

2. Add the token to GitHub:
   - Go to **Settings → Secrets and variables → Actions**
   - Click **New repository secret**
   - Name: `NPM_TOKEN`
   - Value: paste the token

3. (Optional) Create a GitHub environment named `npm` with protection rules (e.g., require approval before publish).

### Rotating NPM_TOKEN

When the token expires or is compromised:

1. Generate a new token on npmjs.com
2. Update the `NPM_TOKEN` secret in GitHub Actions
3. Revoke the old token on npmjs.com

## Rollback

If a bad release reaches npm:

- **Within 72 hours**: `npm unpublish oh-my-githubcopilot@X.Y.Z`
- **After 72 hours**: `npm deprecate oh-my-githubcopilot@X.Y.Z "This version has a known issue. Please use X.Y.Z+1."`

Always publish a fixed version immediately after deprecating a bad one.

## Native Addon Note

`oh-my-githubcopilot` depends on `better-sqlite3`, a native C++ addon. Users installing the package (`npm install oh-my-githubcopilot` or `npm install -g oh-my-githubcopilot`) will need:

- A C++ compiler (GCC, Clang, or MSVC)
- Python 3
- `node-gyp` (`npm install -g node-gyp`)

On most systems these are already present. If installation fails with a build error, refer to the [node-gyp installation guide](https://github.com/nodejs/node-gyp#installation).

## Known Limitations

- **Agent loader**: `src/utils/agent-loader.mts` resolves agent `.md` files via `process.cwd()`, which works when running from the repository root but not for globally installed consumers. A fix to use `import.meta.url` is tracked as a follow-up.
