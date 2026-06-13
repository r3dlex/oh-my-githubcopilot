# OMP Plugin Specification

## 1. Overview

The Oh My Copilot (OMP) plugin extends GitHub Copilot CLI with a multi-agent orchestration layer. It exposes 19 agents, 59 skills, a HUD display, a Plugin State Manager (PSM), and an MCP server. This document covers plugin identity, discovery, registration, and cross-compatibility.

## 2. Plugin Manifest

Every OMP plugin must have a `plugin.json` at the project root. The runtime manifest explicitly exposes the `omp` CLI companion and declares `.agent.md` as the native agent file contract:

```json
{
  "schemaVersion": "1.0",
  "name": "oh-my-githubcopilot",
  "version": "1.0.0",
  "description": "Multi-agent orchestration plugin for GitHub Copilot CLI",
  "entryPoints": {
    "cli": "./bin/omp.mjs",
    "mcp": "./dist/mcp/server.mjs"
  },
  "agentFormat": ".agent.md",
  "agentFilePattern": "*.agent.md",
  "agents": [
    { "id": "explore" },
    { "id": "planner" },
    { "id": "executor" },
    { "id": "verifier" },
    { "id": "writer" },
    { "id": "code-reviewer" },
    { "id": "designer" },
    { "id": "document-specialist" },
    { "id": "test-engineer" },
    { "id": "debugger" },
    { "id": "architect" }
  ],
  "skills": [
    "./skills/autopilot",
    "./skills/ralph",
    "./skills/ultrawork",
    "./skills/team",
    "./skills/ecomode",
    "./skills/swarm",
    "./skills/pipeline",
    "./skills/plan"
  ],
  "hooks": [
    { "id": "keyword-detector", "entry": "./dist/hooks/keyword-detector.mjs" },
    {
      "id": "delegation-enforcer",
      "entry": "./dist/hooks/delegation-enforcer.mjs"
    },
    {
      "id": "stop-continuation",
      "entry": "./dist/hooks/stop-continuation.mjs"
    },
    { "id": "token-tracker", "entry": "./dist/hooks/token-tracker.mjs" },
    { "id": "model-router", "entry": "./dist/hooks/model-router.mjs" },
    { "id": "hud-emitter", "entry": "./dist/hooks/hud-emitter.mjs" }
  ],
  "permissions": ["filesystem", "network", "exec"],
  "peerDependencies": {
    "@anthropic-ai/copilot-cli": ">=1.0.0"
  }
}
```

> **Note:** Skills are not yet registered in `plugin.json`. Skill bundles exist in `dist/skills/` (`setup.mjs`, `mcp-setup.mjs`) and will be registered in `plugin.json` once the skill loading mechanism is implemented. Source skills live in `src/skills/` (`.mts`).

## 3. Marketplace Distribution

The `marketplace.json` file at the project root enables discovery by the Copilot CLI plugin manager:

```json
{
  "schemaVersion": "1.0",
  "registryVersion": "1.0",
  "plugins": [
    {
      "id": "oh-my-githubcopilot",
      "name": "Oh My Copilot",
      "version": "1.0.0",
      "description": "Multi-agent orchestration layer with 19 agents, 59 skills, HUD, PSM, and MCP server",
      "keywords": ["agents", "orchestration", "autopilot", "HUD", "MCP"],
      "homepage": "https://github.com/oh-my-githubcopilot/oh-my-githubcopilot",
      "repository": "https://github.com/oh-my-githubcopilot/oh-my-githubcopilot",
      "license": "MIT",
      "author": {
        "name": "OMP Contributors",
        "email": "omp@oh-my-githubcopilot.dev"
      },
      "entryPoints": {
        "cli": "./bin/omp.mjs",
        "mcp": "./dist/mcp/server.mjs"
      },
      "schemaVersion": "1.0",
      "minCliVersion": "1.0.0",
      "platforms": ["darwin", "linux", "win32"],
      "checksum": "sha256:..."
    }
  ],
  "lastUpdated": "2026-04-09T00:00:00Z"
}
```

## 4. Discovery Paths

OMP is discovered by the Copilot CLI through the following search paths, checked in order:

1. `~/.claude/plugins/oh-my-githubcopilot/plugin.json`
2. `{cwd}/node_modules/oh-my-githubcopilot/plugin.json`
3. `{cwd}/.claude/plugins/oh-my-githubcopilot/plugin.json`
4. `{cwd}/.omp/plugin.json`
5. The `OMP_PLUGIN_PATH` environment variable (colon-separated)

## 5. Hook, Agent, and Skill Registration

### Hook Registration

Hooks are registered via `hooks.json` at the project root:

```json
{
  "schemaVersion": "1.0",
  "hooks": [
    {
      "id": "keyword-detector",
      "entry": "./src/hooks/keyword-detector.ts",
      "trigger": "pre-cycle"
    },
    {
      "id": "delegation-enforcer",
      "entry": "./src/hooks/delegation-enforcer.ts",
      "trigger": "pre-cycle"
    },
    {
      "id": "model-router",
      "entry": "./src/hooks/model-router.ts",
      "trigger": "pre-cycle"
    },
    {
      "id": "token-tracker",
      "entry": "./src/hooks/token-tracker.ts",
      "trigger": "post-message"
    },
    {
      "id": "hud-emitter",
      "entry": "./src/hooks/hud-emitter.ts",
      "trigger": "post-cycle"
    },
    {
      "id": "stop-continuation",
      "entry": "./src/hooks/stop-continuation.ts",
      "trigger": "post-message"
    }
  ]
}
```

### Agent Registration

Each agent directory listed in `plugin.json` is scanned for `*.agent.md` files. OMP treats `.agent.md` as the stable Copilot-native format: YAML frontmatter describes the agent metadata and the Markdown body defines the prompt contract. The root `agents/` directory is the package runtime surface; `.github/agents/` and `.copilot/agents/` mirror Copilot-facing variants for repository/editor workflows.

### Skill Registration

Skills are registered under `skills[]` in `plugin.json`. Each skill exports a `activate(context: SkillContext): void` function and a `deactivate(): void` function. Skills use lazy loading — they are not loaded until triggered by a magic keyword or explicit activation.

## 6. Cross-Compatibility: `.claude-plugin/`

OMP can operate as a standalone plugin or as a `.claude-plugin/` embedded within another project. When installed as a submodule:

```
{project}/
  .claude-plugin/
    oh-my-githubcopilot/
      plugin.json        ← symlink or copy
      dist/
        cli/
        hooks/
        mcp/
      spec/
```

The Copilot CLI traverses the filesystem looking for `plugin.json` files. OMP uses the `.claude-plugin/` namespace to avoid conflicts with local project files.

## 7. Optional VS Code Companion Package

In addition to the Copilot CLI plugin, OMP may ship an optional workspace package at `vscode-omp/` that builds a
VS Code companion extension. This package is intentionally separate from the root plugin runtime:

- **Root package (`./`)** — Copilot CLI plugin, MCP server, hooks, skills, and CLI companion
- **Extension package (`./vscode-omp`)** — editor-facing UI such as activity trees, status-bar integration, and VSIX packaging

Design constraints for this split:

- The root plugin must continue to build/test/package cleanly when `vscode-omp/` is absent.
- Extension CI/release hooks must be conditional on `vscode-omp/package.json` existing.
- The extension keeps its own README, tests, and package-local build/package scripts.

## 8. Installation Methods

OMP supports three installation methods:

| Method             | Command                                                       | Use case                     |
| ------------------ | ------------------------------------------------------------- | ---------------------------- |
| Global plugin      | `copilot plugin install oh-my-githubcopilot`                  | Shared across all projects   |
| Project dependency | `npm install oh-my-githubcopilot --save-dev`                  | Pinned version per project   |
| Submodule          | `git submodule add <repo> .claude-plugin/oh-my-githubcopilot` | Embedded, version-controlled |

If the optional VS Code package exists, it is distributed separately as a VSIX artifact and does not replace the
Copilot CLI plugin installation paths above.

## 9. Peer Dependencies

OMP requires `@anthropic-ai/copilot-cli` version `>=1.0.0`. The plugin will not activate if the peer dependency is not satisfied. A warning is logged with a link to installation instructions.

## 10. Permissions

OMP requests the following permissions (declared in `plugin.json`):

- `filesystem` — Read/write project files, config, state
- `network` — WebFetch for external docs, marketplace check
- `exec` — Spawn agent subprocesses, run build/test commands

All permissions are declared explicitly. No hidden or ambient permissions are used.
