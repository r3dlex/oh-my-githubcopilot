# oh-my-githubcopilot (omp)

> **Sister projects:** [oh-my-claudecode (OMC)](https://github.com/Yeachan-Heo/oh-my-claudecode) | [oh-my-codex (OMX)](https://github.com/Yeachan-Heo/oh-my-codex) | [oh-my-githubcopilot (OMP)](https://github.com/r3dlex/oh-my-githubcopilot) | [oh-my-gemini (OMG)](https://github.com/r3dlex/oh-my-gemini) | [oh-my-auggie (OMA)](https://github.com/r3dlex/oh-my-auggie)

**面向 GitHub Copilot CLI 的多智能体编排。零学习成本。**

_不用学习 GitHub Copilot CLI。直接使用 omp。_

[Get Started](#quick-start) • [CLI Reference](#cli-reference) • [Workflows](#workflows) • [Discord](https://discord.gg/PUwSMR9XNk)

---

## 为什么选择 omp？

每个软件团队都要同时处理实现、架构、安全评审、测试和 DevOps。omp 会并行编排专门的智能体，让每个维度都得到专家级关注。

GitHub Copilot 已经是许多开发者寻求帮助的入口；omp 将这个入口变成协调一致的工程团队。它把面向 Copilot 的 agents、skills、hooks、MCP 设置和 HUD 状态放进一个可预测的流程，从提示词一路推进到已验证的交付。

---

<a id="quick-start"></a>
## 快速开始

```bash
npm install -g oh-my-githubcopilot
omp setup --scope project
omp
```

设置完成后，请重启 CLI，让 `/` 命令出现。

```bash
omp doctor              # check prerequisites
omp team run --task "..." --workers 2   # parallel work
omp hud --watch         # live status
```

---

## 功能

| Feature | Description |
|---------|-------------|
| **Specialized Agents** | 23+ agents (analyst, architect, executor, debugger, critic, verifier, test-engineer, writer, and more) |
| **Parallel Team Mode** | tmux-based multi-worker orchestration with shared task state |
| **Workflow Skills** | 39 skills built in — plan, deep-interview, ralph, autopilot, ultrawork, code-review, and more |
| **Persistent Hooks** | Automatic tool tracking, project memory, session management |
| **Real-time HUD** | Live status overlay showing agents, costs, and progress |
| **CI/CD Ready** | Verification gates, test integration, release workflows |
| **Multilingual** | README in 12 languages |

---

<a id="cli-reference"></a>
## CLI 参考

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

<a id="workflows"></a>
## 工作流

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

## Team 模式

tmux-first multi-worker orchestration with persistent state and lifecycle controls.

```bash
omp team run --task "review src/ for reliability gaps" --workers 4
omp team status --team omp --json
omp team resume --team omp
omp team shutdown --team omp --force
```

对于 GitHub Copilot CLI，team 模式会同步 `.copilot/` 下的 agent 和 skill 资源，同时终端 worker 通过持久的 OMX/OMP 状态协作。当 Copilot 任务需要独立的实现、验证、文档或发布通道，并且希望每个通道先提交证据再推进分支时，请使用它。

---

## 文档

- [Full Documentation](https://github.com/r3dlex/oh-my-githubcopilot#readme)
- [GitHub Repository](https://github.com/r3dlex/oh-my-githubcopilot)
- [Issues](https://github.com/r3dlex/oh-my-githubcopilot/issues)
- [Security Policy](https://github.com/r3dlex/oh-my-githubcopilot/security)

---

## 许可证

omp is open source under the [Apache-2.0 License](LICENSE).

---

## 赞助

If omp saves you time, consider [sponsoring the project](https://github.com/sponsors/r3dlex) ❤️
