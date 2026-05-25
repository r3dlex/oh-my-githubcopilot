# oh-my-githubcopilot (omp)

> **Sister projects:** [oh-my-claudecode (OMC)](https://github.com/Yeachan-Heo/oh-my-claudecode) | [oh-my-codex (OMX)](https://github.com/Yeachan-Heo/oh-my-codex) | [oh-my-githubcopilot (OMP)](https://github.com/r3dlex/oh-my-githubcopilot) | [oh-my-gemini (OMG)](https://github.com/r3dlex/oh-my-gemini) | [oh-my-auggie (OMA)](https://github.com/r3dlex/oh-my-auggie)

**Orchestration multi-agent pour GitHub Copilot CLI. Aucune courbe d’apprentissage.**

_N’apprends pas GitHub Copilot CLI. Utilise simplement omp._

[Get Started](#quick-start) • [CLI Reference](#cli-reference) • [Workflows](#workflows) • [Discord](https://discord.gg/PUwSMR9XNk)

---

## Pourquoi omp ?

Chaque équipe logicielle jongle simultanément avec l’implémentation, l’architecture, la revue sécurité, les tests et le DevOps. omp orchestre des agents spécialisés pour que chaque dimension reçoive une expertise en parallèle, sans devoir tout coordonner à la main.

GitHub Copilot est déjà l’endroit où beaucoup de développeurs demandent de l’aide ; omp transforme cette surface en équipe d’ingénierie coordonnée. Il regroupe agents, skills, hooks, configuration MCP et état HUD orientés Copilot dans un flux prévisible, du prompt à la livraison vérifiée.

---

<a id="quick-start"></a>
## Démarrage rapide

```bash
npm install -g oh-my-githubcopilot
omp setup --scope project
omp
```

Après la configuration, redémarre ta CLI pour faire apparaître les commandes `/`.

```bash
omp doctor              # check prerequisites
omp team run --task "..." --workers 2   # parallel work
omp hud --watch         # live status
```

---

## Fonctionnalités

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
## Référence CLI

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

## Mode Team

tmux-first multi-worker orchestration with persistent state and lifecycle controls.

```bash
omp team run --task "review src/ for reliability gaps" --workers 4
omp team status --team omp --json
omp team resume --team omp
omp team shutdown --team omp --force
```

Pour GitHub Copilot CLI, le mode team synchronise les assets agents et skills sous `.copilot/` pendant que les workers de terminal se coordonnent via un état durable OMX/OMP. Utilise-le lorsqu’une tâche Copilot exige des voies distinctes pour implémentation, vérification, documentation ou release, avec des preuves avant d’avancer la branche.

---

## Documentation

- [Full Documentation](https://github.com/r3dlex/oh-my-githubcopilot#readme)
- [GitHub Repository](https://github.com/r3dlex/oh-my-githubcopilot)
- [Issues](https://github.com/r3dlex/oh-my-githubcopilot/issues)
- [Security Policy](https://github.com/r3dlex/oh-my-githubcopilot/security)

---

## Licence

omp is open source under the [Apache-2.0 License](LICENSE).

---

## Sponsors

If omp saves you time, consider [sponsoring the project](https://github.com/sponsors/r3dlex) ❤️
