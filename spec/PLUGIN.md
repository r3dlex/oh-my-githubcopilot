# OMP Plugin Specification

## 1. Overview

The Oh My Copilot (OMP) plugin extends GitHub Copilot CLI with a multi-agent orchestration layer. It exposes 18 agents, 30+ skills, a HUD display, a Plugin State Manager (PSM), and an MCP server. This document covers plugin identity, discovery, registration, and cross-compatibility.

## 2. Plugin Manifest

Every OMP plugin must have a `plugin.json` at the project root:

```json
{
  "schemaVersion": "1.0",
  "name": "oh-my-copilot",
  "version": "1.0.0",
  "description": "Multi-agent orchestration plugin for GitHub Copilot CLI",
  "entryPoints": {
    "cli": "./dist/cli/index.js",
    "hooks": "./dist/hooks/bundle.js",
    "mcp": "./dist/mcp/server.js"
  },
  "agents": [
    { "id": "orchestrator", "entry": "./dist/agents/orchestrator.js" },
    { "id": "explorer",     "entry": "./dist/agents/explorer.js" },
    { "id": "planner",      "entry": "./dist/agents/planner.js" },
    { "id": "executor",     "entry": "./dist/agents/executor.js" },
    { "id": "verifier",     "entry": "./dist/agents/verifier.js" },
    { "id": "writer",       "entry": "./dist/agents/writer.js" },
    { "id": "reviewer",     "entry": "./dist/agents/reviewer.js" },
    { "id": "designer",     "entry": "./dist/agents/designer.js" },
    { "id": "researcher",   "entry": "./dist/agents/researcher.js" },
    { "id": "tester",       "entry": "./dist/agents/tester.js" },
    { "id": "debugger",     "entry": "./dist/agents/debugger.js" },
    { "id": "architect",    "entry": "./dist/agents/architect.js" },
    { "id": "devops",       "entry": "./dist/agents/devops.js" },
    { "id": "security",     "entry": "./dist/agents/security.js" },
    { "id": "data",         "entry": "./dist/agents/data.js" },
    { "id": "mobile",       "entry": "./dist/agents/mobile.js" },
    { "id": "performance",  "entry": "./dist/agents/performance.js" },
    { "id": "integration",   "entry": "./dist/agents/integration.js" }
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
    { "id": "keyword-detector",    "entry": "./dist/hooks/keyword-detector.mjs" },
    { "id": "delegation-enforcer","entry": "./dist/hooks/delegation-enforcer.mjs" },
    { "id": "model-router",       "entry": "./dist/hooks/model-router.mjs" },
    { "id": "token-tracker",      "entry": "./dist/hooks/token-tracker.mjs" },
    { "id": "hud-emitter",        "entry": "./dist/hooks/hud-emitter.mjs" },
    { "id": "stop-continuation",  "entry": "./dist/hooks/stop-continuation.mjs" }
  ],
  "permissions": ["filesystem", "network", "exec"],
  "peerDependencies": {
    "@anthropic-ai/copilot-cli": ">=1.0.0"
  }
}
```

## 3. Marketplace Distribution

The `marketplace.json` file at the project root enables discovery by the Copilot CLI plugin manager:

```json
{
  "schemaVersion": "1.0",
  "registryVersion": "1.0",
  "plugins": [
    {
      "id": "oh-my-copilot",
      "name": "Oh My Copilot",
      "version": "1.0.0",
      "description": "Multi-agent orchestration layer with 18 agents, 30+ skills, HUD, PSM, and MCP server",
      "keywords": ["agents", "orchestration", "autopilot", "HUD", "MCP"],
      "homepage": "https://github.com/oh-my-copilot/oh-my-copilot",
      "repository": "https://github.com/oh-my-copilot/oh-my-copilot",
      "license": "MIT",
      "author": {
        "name": "OMP Contributors",
        "email": "omp@oh-my-copilot.dev"
      },
      "entryPoints": {
        "cli": "./dist/cli/index.js",
        "hooks": "./dist/hooks/keyword-detector.mjs",
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

1. `~/.claude/plugins/oh-my-copilot/plugin.json`
2. `{cwd}/node_modules/oh-my-copilot/plugin.json`
3. `{cwd}/.claude/plugins/oh-my-copilot/plugin.json`
4. `{cwd}/.omp/plugin.json`
5. The `OMP_PLUGIN_PATH` environment variable (colon-separated)

## 5. Hook, Agent, and Skill Registration

### Hook Registration

Hooks are registered via `hooks.json` at the project root:

```json
{
  "schemaVersion": "1.0",
  "hooks": [
    { "id": "keyword-detector",    "entry": "./src/hooks/keyword-detector.ts", "trigger": "pre-cycle" },
    { "id": "delegation-enforcer", "entry": "./src/hooks/delegation-enforcer.ts", "trigger": "pre-cycle" },
    { "id": "model-router",       "entry": "./src/hooks/model-router.ts", "trigger": "pre-cycle" },
    { "id": "token-tracker",      "entry": "./src/hooks/token-tracker.ts", "trigger": "post-message" },
    { "id": "hud-emitter",        "entry": "./src/hooks/hud-emitter.ts", "trigger": "post-cycle" },
    { "id": "stop-continuation",  "entry": "./src/hooks/stop-continuation.ts", "trigger": "post-message" }
  ]
}
```

### Agent Registration

Each agent is registered in `plugin.json` under `agents[]`. An agent entry point exports a `run(params: AgentParams): Promise<AgentResult>` function.

### Skill Registration

Skills are registered under `skills[]` in `plugin.json`. Each skill exports a `activate(context: SkillContext): void` function and a `deactivate(): void` function. Skills use lazy loading — they are not loaded until triggered by a magic keyword or explicit activation.

## 6. Cross-Compatibility: `.claude-plugin/`

OMP can operate as a standalone plugin or as a `.claude-plugin/` embedded within another project. When installed as a submodule:

```
{project}/
  .claude-plugin/
    oh-my-copilot/
      plugin.json        ← symlink or copy
      dist/
        cli/
        hooks/
        mcp/
      spec/
```

The Copilot CLI traverses the filesystem looking for `plugin.json` files. OMP uses the `.claude-plugin/` namespace to avoid conflicts with local project files.

## 7. Installation Methods

OMP supports three installation methods:

| Method | Command | Use case |
|--------|---------|----------|
| Global plugin | `copilot plugin install oh-my-copilot` | Shared across all projects |
| Project dependency | `npm install oh-my-copilot --save-dev` | Pinned version per project |
| Submodule | `git submodule add <repo> .claude-plugin/oh-my-copilot` | Embedded, version-controlled |

## 8. Peer Dependencies

OMP requires `@anthropic-ai/copilot-cli` version `>=1.0.0`. The plugin will not activate if the peer dependency is not satisfied. A warning is logged with a link to installation instructions.

## 9. Permissions

OMP requests the following permissions (declared in `plugin.json`):

- `filesystem` — Read/write project files, config, state
- `network` — WebFetch for external docs, marketplace check
- `exec` — Spawn agent subprocesses, run build/test commands

All permissions are declared explicitly. No hidden or ambient permissions are used.