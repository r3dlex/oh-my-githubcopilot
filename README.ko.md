# oh-my-githubcopilot (omp)

> **Sister projects:** [oh-my-claudecode (OMC)](https://github.com/Yeachan-Heo/oh-my-claudecode) | [oh-my-codex (OMX)](https://github.com/Yeachan-Heo/oh-my-codex) | [oh-my-githubcopilot (OMP)](https://github.com/r3dlex/oh-my-githubcopilot) | [oh-my-antigravity (OMG)](https://github.com/r3dlex/oh-my-antigravity) | [oh-my-auggie (OMA)](https://github.com/r3dlex/oh-my-auggie)

**GitHub Copilot CLI를 위한 멀티 에이전트 오케스트레이션. 학습 곡선은 없습니다.**

_GitHub Copilot CLI를 새로 배우지 마세요. 그냥 omp를 쓰세요._

[Get Started](#quick-start) • [CLI Reference](#cli-reference) • [Workflows](#workflows) • [Discord](https://discord.gg/PUwSMR9XNk)

---

## 왜 omp인가요?

모든 소프트웨어 팀은 구현, 아키텍처, 보안 리뷰, 테스트, DevOps를 동시에 다룹니다. omp는 전문 에이전트를 병렬로 오케스트레이션해 각 영역이 전문가의 관심을 받도록 합니다.

GitHub Copilot은 이미 많은 개발자가 도움을 요청하는 곳입니다. omp는 그 표면을 조율된 엔지니어링 팀으로 바꿉니다. Copilot용 에이전트, 스킬, 훅, MCP 설정, HUD 상태를 하나의 예측 가능한 워크플로로 묶어 프롬프트에서 검증된 결과까지 이어 줍니다.

---

<a id="quick-start"></a>
## 빠른 시작

```bash
npm install -g oh-my-githubcopilot
omp setup --scope project
omp
```

설정 후 `/` 명령이 보이도록 CLI를 다시 시작하세요.

```bash
omp doctor              # check prerequisites
omp team run --task "..." --workers 2   # parallel work
omp hud --watch         # live status
```

---

## 기능

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
## CLI 참고

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
## 워크플로

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

## Team 모드

tmux-first multi-worker orchestration with persistent state and lifecycle controls.

```bash
omp team run --task "review src/ for reliability gaps" --workers 4
omp team status --team omp --json
omp team resume --team omp
omp team shutdown --team omp --force
```

GitHub Copilot CLI에서 team 모드는 `.copilot/`의 에이전트와 스킬 자산을 동기화하고 터미널 워커는 지속적인 OMX/OMP 상태로 조율됩니다. 구현, 검증, 문서화, 릴리스 레인이 분리되어야 하고 브랜치를 진행하기 전에 각 레인의 증거가 필요할 때 사용하세요.

---

## 문서

- [Full Documentation](https://github.com/r3dlex/oh-my-githubcopilot#readme)
- [GitHub Repository](https://github.com/r3dlex/oh-my-githubcopilot)
- [Issues](https://github.com/r3dlex/oh-my-githubcopilot/issues)
- [Security Policy](https://github.com/r3dlex/oh-my-githubcopilot/security)

---

## 라이선스

omp is open source under the [Apache-2.0 License](LICENSE).

---

## 스폰서

If omp saves you time, consider [sponsoring the project](https://github.com/sponsors/r3dlex) ❤️
