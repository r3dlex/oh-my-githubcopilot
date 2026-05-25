# oh-my-githubcopilot (omp)

> **Sister projects:** [oh-my-claudecode (OMC)](https://github.com/Yeachan-Heo/oh-my-claudecode) | [oh-my-codex (OMX)](https://github.com/Yeachan-Heo/oh-my-codex) | [oh-my-githubcopilot (OMP)](https://github.com/r3dlex/oh-my-githubcopilot) | [oh-my-gemini (OMG)](https://github.com/r3dlex/oh-my-gemini) | [oh-my-auggie (OMA)](https://github.com/r3dlex/oh-my-auggie)

**Điều phối đa tác nhân cho GitHub Copilot CLI. Không cần đường cong học tập.**

_Đừng học GitHub Copilot CLI. Chỉ cần dùng omp._

[Get Started](#quick-start) • [CLI Reference](#cli-reference) • [Workflows](#workflows) • [Discord](https://discord.gg/PUwSMR9XNk)

---

## Vì sao chọn omp?

Mọi nhóm phần mềm đều phải xử lý triển khai, kiến trúc, rà soát bảo mật, kiểm thử và DevOps cùng lúc. omp điều phối các tác nhân chuyên biệt để từng mảng được chuyên gia xử lý song song.

GitHub Copilot đã là nơi nhiều lập trình viên tìm trợ giúp; omp biến bề mặt đó thành một đội kỹ thuật được phối hợp. Nó gom tác nhân, skill, hook, thiết lập MCP và trạng thái HUD dành cho Copilot vào một luồng dự đoán được từ prompt đến bàn giao đã kiểm chứng.

---

<a id="quick-start"></a>
## Bắt đầu nhanh

```bash
npm install -g oh-my-githubcopilot
omp setup --scope project
omp
```

Sau khi thiết lập, hãy khởi động lại CLI để các lệnh `/` xuất hiện.

```bash
omp doctor              # check prerequisites
omp team run --task "..." --workers 2   # parallel work
omp hud --watch         # live status
```

---

## Tính năng

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
## Tham chiếu CLI

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
## Quy trình

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

## Chế độ Team

tmux-first multi-worker orchestration with persistent state and lifecycle controls.

```bash
omp team run --task "review src/ for reliability gaps" --workers 4
omp team status --team omp --json
omp team resume --team omp
omp team shutdown --team omp --force
```

Với GitHub Copilot CLI, team mode đồng bộ tài sản agent và skill trong `.copilot/` trong khi các worker terminal phối hợp qua trạng thái OMX/OMP bền vững. Dùng khi một tác vụ Copilot cần các làn riêng cho triển khai, xác minh, tài liệu hoặc release và bạn muốn từng làn báo bằng chứng trước khi đẩy nhánh tiếp.

---

## Tài liệu

- [Full Documentation](https://github.com/r3dlex/oh-my-githubcopilot#readme)
- [GitHub Repository](https://github.com/r3dlex/oh-my-githubcopilot)
- [Issues](https://github.com/r3dlex/oh-my-githubcopilot/issues)
- [Security Policy](https://github.com/r3dlex/oh-my-githubcopilot/security)

---

## Giấy phép

omp is open source under the [Apache-2.0 License](LICENSE).

---

## Nhà tài trợ

If omp saves you time, consider [sponsoring the project](https://github.com/sponsors/r3dlex) ❤️
