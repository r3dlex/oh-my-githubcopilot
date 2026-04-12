# Releasing OMP

This document describes the end-to-end release process for `oh-my-copilot`.

## Prerequisites

- Write access to the GitHub repository
- `NPM_TOKEN` configured as a GitHub Actions secret (see [Secret Setup](#secret-setup))
- Node.js >= 22.0.0

## Release Process (Happy Path)

1. **Bump version in `package.json`**

   ```bash
   npm version patch   # 1.2.0 → 1.2.1
   npm version minor   # 1.2.0 → 1.3.0
   npm version major   # 1.2.0 → 2.0.0
   ```

   This updates `package.json` and creates a local git commit + tag (`vX.Y.Z`).

2. **Sync plugin manifest version**

   `npm version` only bumps `package.json`. You must also manually update `.github/plugin/plugin.json`:

   ```json
   {
     "version": "X.Y.Z"
   }
   ```

   The CI will fail the publish step if `.claude-plugin/plugin.json` (synced from `.github/plugin/plugin.json` via `sync-claude-plugin`) does not match the git tag.

3. **Update `CHANGELOG.md`**

   Add a section for the new version describing changes.

4. **Amend the release commit**

   ```bash
   git add .github/plugin/plugin.json CHANGELOG.md
   git commit --amend --no-edit
   git tag -f vX.Y.Z   # re-tag after amend
   ```

5. **Push commit and tag**

   ```bash
   git push origin main
   git push origin vX.Y.Z
   ```

   This triggers the `Release` GitHub Actions workflow automatically.

6. **Monitor CI**

   The workflow runs 4 jobs in sequence:
   - `build` — compiles and archives the repo
   - `test` — typechecks and runs the test suite
   - `publish` — verifies versions, packs, and publishes to npm
   - `github-release` — creates a GitHub Release with auto-generated notes and the `.tgz` attached

   Monitor at: `https://github.com/r3dlex/oh-my-copilot/actions`

## Dry Run

To validate the pipeline without publishing:

1. Go to **Actions → Release → Run workflow**
2. Check **"Dry run"** and click **Run workflow**

The workflow runs all steps but uses `npm publish --dry-run` and skips GitHub Release creation. Use this to verify tarball contents and pipeline health before a real release.

## Secret Setup

The publish job requires an npm access token stored as a GitHub Actions secret:

1. Generate a granular npm access token:
   - Log in to [npmjs.com](https://www.npmjs.com)
   - Go to **Access Tokens → Generate New Token → Granular Access Token**
   - Scope: **Read and write** for the `oh-my-copilot` package
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

- **Within 72 hours:** `npm unpublish oh-my-copilot@X.Y.Z`
- **After 72 hours:** `npm deprecate oh-my-copilot@X.Y.Z "This version has a known issue. Please use X.Y.Z+1."`

Always publish a fixed version immediately after deprecating a bad one.

## Native Addon Note

`oh-my-copilot` depends on `better-sqlite3`, a native C++ addon. Users installing the package (`npm install oh-my-copilot` or `npm install -g oh-my-copilot`) will need:

- A C++ compiler (GCC, Clang, or MSVC)
- Python 3
- `node-gyp` (`npm install -g node-gyp`)

On most systems these are already present. If installation fails with a build error, refer to the [node-gyp installation guide](https://github.com/nodejs/node-gyp#installation).

## Known Limitations

- **Agent loader**: `src/utils/agent-loader.mts` resolves agent `.md` files via `process.cwd()`, which works when running from the repository root but not for globally installed consumers. A fix to use `import.meta.url` is tracked as a follow-up.
