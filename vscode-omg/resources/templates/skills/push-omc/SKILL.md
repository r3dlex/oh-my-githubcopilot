# /push-omc — Export OMG Session into OMC (omg → omc)

## Trigger
- Slash command: `/push-omc`
- Keywords: "push omc", "omc 푸시", "omc로 보내기", "sync to omc", "export to omc"

## Purpose
Push the local OMG (`oh-my-githubcopilot`) session into OMC (`oh-my-claudecode`) so work done in GitHub Copilot can continue in Claude Code. Counterpart of `/resume-claude`. Together they form the v1.4.3 bidirectional bridge (OMG ↔ OMC).

## Workflow

### Step 1 — Detect
Call `omg_detect_external_session` and find the entry where `source === "omg"` (the local session). If `has_checkpoint` is `false`, abort:

> "OMG 체크포인트가 없습니다. `omg_checkpoint`를 먼저 호출해 현재 상태를 저장해주세요."

### Step 2 — Compare
Call `omg_compare_checkpoints`. Look at `external[].omg_newer_than_external` to decide whether the push will progress real work or just collide.

Display:
```
현재 OMG 체크포인트: {timestamp}
OMC 상태:
  - 마지막 OMC 체크포인트: {external[omc].timestamp or "없음"}
  - OMG가 더 최신: {omg_newer_than_external ? "예" : "아니요"}
```

If OMC is newer (`!omg_newer_than_external && external[omc].timestamp`), warn the user — without `force: true`, files newer on the OMC side will go to `conflicts[]`.

### Step 3 — Confirm
Use `vscode_askQuestions` to confirm export and gate `force` carefully:

```
header: "push-omc"
question: "OMG 세션을 OMC로 푸시하시겠습니까?"
options:
  - label: "표준 푸시 (충돌 시 건너뜀)"
    description: ".omc/ 파일이 더 최신이면 보존하고 conflicts[]에 보고"
    recommended: true
  - label: "강제 푸시 (--force, .previous.{ISO}.json 백업 생성)"
    description: "OMC 측 변경을 덮어쓰고 회전 백업 3개를 유지"
  - label: "취소"
allowFreeformInput: false
```

Strong-default the standard option. Force mode should be a deliberate user choice — once `.previous.{ISO}.json` rotation hits N=3, older snapshots are pruned.

### Step 4 — Export
Call `omg_export_external_session({target: "omc", force: <chosen>})`.

Pre-flight:
- The exporter applies a project-identity guard. If the source checkpoint's `workspace_root` ≠ current workspace, it returns `{ success: false, reason: "workspace_mismatch" }` BEFORE any file mutation. Surface the error and stop.

Composition (not a blind copy):
- `.omg/prd.json` → `.omc/prd.json`
- `.omg/project-memory.json` → `.omc/project-memory.json`
- `active_modes[]` from `.omg/state/session-checkpoint.json` → DECOMPOSED into `.omc/state/{mode}-state.json` files (inverse of v1.4.0 omc-importer composition)
- `.omc/state/session-checkpoint.json` is composed with `source_origin: "bridged-from-omg"`, `source_tool: "copilot"` (kept for back-compat), `source_session_id`, `workspace_root`, `imported_at`, `imported_summary`. chmod 0o600 best-effort.

Atomicity (AC-22b): the `.omg/state/last-export-token.json` write is the LAST side-effect. If any prior write fails, the token is NOT created — subsequent operations correctly treat the transaction as uncommitted.

### Step 5 — Summarize
Display the export result:

```
✅ OMC로 푸시 완료

📋 Export 결과:
- target: omc
- session_id: {session_id}
- exported_files: {exported_files count}개
- conflicts: {conflicts count}개
- source_origin: bridged-from-omg
- workspace_root: {workspace_root}

📝 요약:
{summary}
```

If `success === false`:
- `reason: "workspace_mismatch"` → "워크스페이스가 일치하지 않습니다. expected={expected}, actual={actual}". 사용자에게 올바른 워크스페이스를 열도록 안내.
- 그 외 → 원본 에러 메시지 그대로 출력.

### Step 6 — Continue
Ask the user what to do next:
```
header: "push-omc-next-action"
question: "OMC로 전환하시겠습니까, 아니면 OMG에서 작업을 계속하시겠습니까?"
options:
  - label: "OMC로 전환 (Claude Code에서 /resume-omc 실행 안내)"
    recommended: true
  - label: "OMG에서 계속 작업"
  - label: "충돌 파일 리뷰"
```

## Round-trip Safety
- The OMC importer (`/resume-claude` flow) reads the exported checkpoint's `source_origin` and the matching `.omg/state/last-export-token.json`. If both indicate "this checkpoint came from us", the importer returns `loop_blocked: true` and does NOT mutate `.omg/`. Set `force: true` on `omg_import_external_session` to bypass when verifying round-trip.
- Token has no time-based TTL. It invalidates only when the OMC checkpoint's `source_origin` flips to `"native"` (OMC wrote a fresh non-bridged checkpoint) OR `source_session_id` no longer matches the token (a newer bridged write replaced it).

## Backup Retention
- `.omc/X.previous.{ISO}.json` rotates with N=3. Older snapshots are pruned automatically.
- For unbounded history, `git log -- .omc/` or commit before pushing.

## Error Handling
- **workspace_mismatch**: surface `expected` vs `actual`, ask user to open the correct workspace.
- **conflicts[].length > 0**: list affected files; offer to retry with `force: true`.
- **success: false** with no recognized `reason`: log the raw error and abort — do not retry blindly.

## Notes
- OMG → OMC is a (mostly) lossless inversion: prd, project-memory, and state files round-trip; provenance fields are translated.
- OMG → Claude Code direction is deferred to v1.5.x (would require synthesizing valid `tool_use`/`tool_result` UUID chains compatible with Claude Code's resume-by-id contract).
- Do not run OMC and OMG concurrently against the same workspace — the round-trip guard handles ordered hand-off, not simultaneous writes.
