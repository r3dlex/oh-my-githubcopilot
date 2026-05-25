# oh-my-githubcopilot (omp)

> **Sister projects:** [oh-my-claudecode (OMC)](https://github.com/Yeachan-Heo/oh-my-claudecode) | [oh-my-codex (OMX)](https://github.com/Yeachan-Heo/oh-my-codex) | [oh-my-githubcopilot (OMP)](https://github.com/r3dlex/oh-my-githubcopilot) | [oh-my-antigravity (OMG)](https://github.com/r3dlex/oh-my-antigravity) | [oh-my-auggie (OMA)](https://github.com/r3dlex/oh-my-auggie)

**GitHub Copilot CLI のためのマルチエージェント・オーケストレーション。学習コストはゼロ。**

_GitHub Copilot CLI を覚える必要はありません。omp を使うだけです。_

[Get Started](#quick-start) • [CLI Reference](#cli-reference) • [Workflows](#workflows) • [Discord](https://discord.gg/PUwSMR9XNk)

---

## なぜ omp?

ソフトウェアチームは実装、アーキテクチャ、セキュリティレビュー、テスト、DevOps を同時に扱います。omp は専門エージェントを並列にオーケストレーションし、各領域に専門的な注意を届けます。

GitHub Copilot は多くの開発者が助けを求める場所です。omp はその場を協調するエンジニアリングチームへ変えます。Copilot 向けのエージェント、スキル、フック、MCP 設定、HUD 状態を予測可能なワークフローにまとめ、プロンプトから検証済みの成果まで進めます。

---

<a id="quick-start"></a>
## クイックスタート

```bash
npm install -g oh-my-githubcopilot
omp setup --scope project
omp
```

セットアップ後、`/` コマンドを表示するために CLI を再起動してください。

```bash
omp doctor              # check prerequisites
omp team run --task "..." --workers 2   # parallel work
omp hud --watch         # live status
```

---

## 機能

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
## CLI リファレンス

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
## ワークフロー

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

## Team モード

tmux-first multi-worker orchestration with persistent state and lifecycle controls.

```bash
omp team run --task "review src/ for reliability gaps" --workers 4
omp team status --team omp --json
omp team resume --team omp
omp team shutdown --team omp --force
```

GitHub Copilot CLI では、team モードが `.copilot/` 配下のエージェントとスキルを同期し、ターミナル worker は永続的な OMX/OMP 状態で連携します。実装、検証、ドキュメント、リリースを分け、各レーンの証跡を確認してからブランチを進めたいときに使います。

---

## ドキュメント

- [Full Documentation](https://github.com/r3dlex/oh-my-githubcopilot#readme)
- [GitHub Repository](https://github.com/r3dlex/oh-my-githubcopilot)
- [Issues](https://github.com/r3dlex/oh-my-githubcopilot/issues)
- [Security Policy](https://github.com/r3dlex/oh-my-githubcopilot/security)

---

## ライセンス

omp is open source under the [Apache-2.0 License](LICENSE).

---

## スポンサー

If omp saves you time, consider [sponsoring the project](https://github.com/sponsors/r3dlex) ❤️
