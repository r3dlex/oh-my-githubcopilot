# oh-my-githubcopilot (omp)

> **Sister projects:** [oh-my-claudecode (OMC)](https://github.com/Yeachan-Heo/oh-my-claudecode) | [oh-my-codex (OMX)](https://github.com/Yeachan-Heo/oh-my-codex) | [oh-my-githubcopilot (OMP)](https://github.com/r3dlex/oh-my-githubcopilot) | [oh-my-antigravity (OMG)](https://github.com/r3dlex/oh-my-antigravity) | [oh-my-auggie (OMA)](https://github.com/r3dlex/oh-my-auggie)

**Multi-agent orchestration for GitHub Copilot CLI. Zero learning curve.**

_Don't learn GitHub Copilot CLI. Just use omp._

[Get Started](#quick-start) • [CLI Reference](#cli-reference) • [Workflows](#workflows) • [Discord](https://discord.gg/PUwSMR9XNk)

---

## Why omp?

Every software team juggles implementation, architecture, security review, testing, and DevOps — all simultaneously. omp orchestrates specialized agents so every dimension gets expert attention, in parallel, without you herding cats.

GitHub Copilot is already where many developers ask for help; omp turns that surface into a coordinated engineering team. It keeps Copilot-facing agents, skills, hooks, MCP setup, and HUD state in one predictable workflow so you can move from prompt to verified delivery without hand-wiring the orchestration layer.

---

## Quick Start

```bash
npm install -g oh-my-githubcopilot
omp setup --scope project
omp
```

After setup, restart your CLI for the `/` commands to appear.

```bash
omp doctor              # check prerequisites
omp team run --task "..." --workers 2   # parallel work
omp hud --watch         # live status
```

---

## Features

| Feature | Description |
|---------|-------------|
| **Specialized Agents** | 19 agents (analyst, architect, executor, debugger, critic, verifier, test-engineer, writer, and more) |
| **Parallel Team Mode** | tmux-based multi-worker orchestration with shared task state |
| **Workflow Skills** | 59 skills built in — plan, deep-interview, ralph, autopilot, ultrawork, code-review, and more |
| **Persistent Hooks** | Automatic tool tracking, project memory, session management |
| **Real-time HUD** | Live status overlay showing agents, costs, and progress |
| **CI/CD Ready** | Verification gates, test integration, release workflows |
| **Multilingual** | README in 12 languages |

---

## CLI Reference

| Command | Description |
|---------|-------------|
| `omp` | Launch interactive session |
| `omp setup` | Configure GitHub Copilot CLI integration |
| `omp doctor` | Check prerequisites and fix issues |
| `omp team run` | Start parallel team execution |
| `omp team status` | Check team progress |
| `omp hud --watch` | Show live status overlay |
| `omp trace` | Show execution trace |

See the [full documentation](https://github.com/r3dlex/oh-my-githubcopilot#readme) for all commands.

---

## Workflows

omp ships execution-mode and planning-mode workflows as built-in skills.

### Execution Modes

| Skill | Purpose |
|-------|---------|
| `$autopilot` | Idea → working code end-to-end |
| `$team` | N coordinated agents on a shared task |
| `$ralph` | Persistent completion loop until verified |
| `$ultrawork` | Maximum parallel throughput execution |
| `$ultraqa` | QA cycling until goals are met |

### Planning Modes

| Skill | Purpose |
|-------|---------|
| `$plan` | Strategic planning with optional interviews |
| `$deep-interview` | Socratic clarification before execution |
| `$ralplan` | Consensus planning with Architect + Critic review |

### Utility Modes

| Skill | Purpose |
|-------|---------|
| `$code-review` | Comprehensive code review |
| `$security-review` | Security audit |
| `$doctor` | Diagnose and fix installation issues |
| `$trace` | Agent flow trace and summary |
| `$note` | Save session notes |
| `$wiki` | Persistent project wiki |

---

## Team Mode

tmux-first multi-worker orchestration with persistent state and lifecycle controls.

```bash
omp team run --task "review src/ for reliability gaps" --workers 4
omp team status --team omp --json
omp team resume --team omp
omp team shutdown --team omp --force
```

For GitHub Copilot CLI, team mode keeps `.copilot/` agent and skill assets synchronized while terminal workers coordinate through durable OMX/OMP state. Use it when a Copilot task needs separate implementation, verification, documentation, or release lanes and you want each lane to report evidence before the branch moves forward.

---

## Documentation

- [Full Documentation](https://github.com/r3dlex/oh-my-githubcopilot#readme)
- [GitHub Repository](https://github.com/r3dlex/oh-my-githubcopilot)
- [Issues](https://github.com/r3dlex/oh-my-githubcopilot/issues)
- [Security Policy](https://github.com/r3dlex/oh-my-githubcopilot/security)

---

## License

omp is open source under the [Apache-2.0 License](LICENSE).

---

## Star History

[![Star History Chart](https://api.star-history.com/chart?repos=r3dlex/oh-my-githubcopilot&type=date&legend=top-left)](https://www.star-history.com/?repos=r3dlex%2Foh-my-githubcopilot&type=date&legend=top-left)

## Sponsors

If omp saves you time, consider [sponsoring the project](https://github.com/sponsors/r3dlex) ❤️

<!-- v3-ai-sdlc-init:start -->
## AI SDLC v3
This repo follows the v3 AI-SDLC layout. See `.ai/matrix.json`, `.memory/human-override/`, and `docs/architecture/adr/`. Modules at `r3dlex/skills/ai-sdlc-init/modules/`.
<!-- v3-ai-sdlc-init:end -->
