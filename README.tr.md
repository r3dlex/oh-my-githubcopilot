# oh-my-githubcopilot (omp)

> **Sister projects:** [oh-my-claudecode (OMC)](https://github.com/Yeachan-Heo/oh-my-claudecode) | [oh-my-codex (OMX)](https://github.com/Yeachan-Heo/oh-my-codex) | [oh-my-githubcopilot (OMP)](https://github.com/r3dlex/oh-my-githubcopilot) | [oh-my-antigravity (OMG)](https://github.com/r3dlex/oh-my-antigravity) | [oh-my-auggie (OMA)](https://github.com/r3dlex/oh-my-auggie)

**GitHub Copilot CLI için çok ajanlı orkestrasyon. Öğrenme eğrisi yok.**

_GitHub Copilot CLI öğrenme. Sadece omp kullan._

[Get Started](#quick-start) • [CLI Reference](#cli-reference) • [Workflows](#workflows) • [Discord](https://discord.gg/PUwSMR9XNk)

---

## Neden omp?

Her yazılım ekibi uygulama, mimari, güvenlik incelemesi, test ve DevOps işlerini aynı anda yürütür. omp, uzman ajanları paralel olarak orkestre eder ve her boyutun uzman dikkati almasını sağlar.

GitHub Copilot birçok geliştiricinin yardım istediği yer; omp bu yüzeyi koordineli bir mühendislik ekibine dönüştürür. Copilot odaklı ajanları, skill’leri, hook’ları, MCP kurulumunu ve HUD durumunu öngörülebilir bir akışta toplar.

---

<a id="quick-start"></a>
## Hızlı başlangıç

```bash
npm install -g oh-my-githubcopilot
omp setup --scope project
omp
```

Kurulumdan sonra `/` komutlarının görünmesi için CLI’yi yeniden başlatın.

```bash
omp doctor              # check prerequisites
omp team run --task "..." --workers 2   # parallel work
omp hud --watch         # live status
```

---

## Özellikler

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
## CLI referansı

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
## İş akışları

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

## Team modu

tmux-first multi-worker orchestration with persistent state and lifecycle controls.

```bash
omp team run --task "review src/ for reliability gaps" --workers 4
omp team status --team omp --json
omp team resume --team omp
omp team shutdown --team omp --force
```

GitHub Copilot CLI için team modu, `.copilot/` altındaki ajan ve skill varlıklarını senkron tutarken terminal worker’ları kalıcı OMX/OMP durumu üzerinden koordine eder. Copilot görevi uygulama, doğrulama, dokümantasyon veya release için ayrı şeritler gerektirdiğinde ve branch ilerlemeden kanıt istediğinizde kullanın.

---

## Dokümantasyon

- [Full Documentation](https://github.com/r3dlex/oh-my-githubcopilot#readme)
- [GitHub Repository](https://github.com/r3dlex/oh-my-githubcopilot)
- [Issues](https://github.com/r3dlex/oh-my-githubcopilot/issues)
- [Security Policy](https://github.com/r3dlex/oh-my-githubcopilot/security)

---

## Lisans

omp is open source under the [Apache-2.0 License](LICENSE).

---

## Sponsorlar

If omp saves you time, consider [sponsoring the project](https://github.com/sponsors/r3dlex) ❤️
