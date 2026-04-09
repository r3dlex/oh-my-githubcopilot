# OMP Implementation Roadmap

## 1. Overview

OMP implementation is divided into 6 phases. Each phase has defined duration, scope, and exit criteria. Exit criteria must be verified before advancing to the next phase.

## 2. Implementation Phases

| Phase | Name | Duration | Exit Criteria |
|-------|------|----------|---------------|
| 1 | Core Plugin Shell | Weeks 1-2 | `plugin.json` loads, 3 stub agents register, CLI `omp --version` works |
| 2 | Agent Registry + Hooks | Weeks 3-4 | All 18 agents implement `run()`, all 6 hooks fire on correct triggers |
| 3 | Skills + Orchestration | Weeks 5-6 | 8 execution mode skills activate; orchestrator delegates correctly |
| 4 | HUD + PSM | Weeks 7-8 | HUD renders in tmux; PSM persists session to SQLite |
| 5 | MCP Server + Integration | Weeks 9-10 | All 10 MCP tools respond; fleet mode syncs |
| 6 | Polish + Docs + Release | Weeks 11-12 | All spec files complete, build verified, marketplace.json published |

## 3. Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Hook cycle overhead exceeds 200ms budget | Medium | High | Profile early with synthetic load; lazy-import heavy hooks |
| Copilot CLI plugin API instability | Low | High | Use feature detection; degrade gracefully on API changes |
| 18-agent delegation loops | Medium | Medium | Implement cycle detection (3-delegation cap with escalation) |
| SQLite schema migration on upgrade | Low | Medium | Use `CREATE TABLE IF NOT EXISTS`; version migrations in `migrations/` |
| MCP stdio protocol version mismatch | Low | Medium | Pin MCP server version to known-compatible client versions |
| tmux status-right refresh performance | Medium | Low | Debounce HUD writes to 3s; use `status-interval 1` in tmux config |
| Cross-platform path resolution (win32) | Medium | Medium | Use `path.join` and `os.homedir()` throughout; test on all 3 platforms |
| Skill keyword collision with user content | Low | Low | Require exact prefix match (`:`, `/`) before activation |
| Fleet SQLite write contention | Medium | Medium | Use WAL mode; implement optimistic locking with retry |
| OMA skill porting compatibility | Medium | Medium | Create compatibility shim layer; test each skill individually |

## 4. File-Level Implementation Notes

### 4.1 `src/core/orchestrator.ts`

The orchestrator is the entry point for all agent dispatch. Key implementation requirements:
- Must never directly use Read/Write/Edit/Bash tools — all implementation goes through `executor` agent
- Must call `model-router` hook before every delegation
- Must emit `hud-emitter` after every agent cycle
- Must verify output via `verifier` agent before marking task complete

```typescript
// src/core/orchestrator.ts
export class Orchestrator {
  private hooks: Hook[];
  private agents: Map<string, Agent>;
  private state: SessionState;

  async delegate(agentId: string, task: string): Promise<AgentResult> {
    const hookCtx = await this.runPreCycleHooks({ agentId, task });
    const model = hookCtx.model;
    const agent = this.agents.get(agentId);
    if (!agent) throw new Error(`Unknown agent: ${agentId}`);
    const result = await agent.run({ ...hookCtx, model });
    await this.verify(result);
    await this.hudEmitter.emit({ ...result, sessionId: this.state.sessionId });
    return result;
  }
}
```

### 4.2 `src/hooks/hud-emitter.ts`

The hud-emitter is performance-critical. Implementation notes:
- Reads `token-tracker` state to compute `contextPct`
- Debounces file writes to 3s for tmux strategy
- Emits only changed fields (delta updates)
- Must not throw — errors logged, cycle continues

```typescript
// src/hooks/hud-emitter.ts
export const hudEmitter: HookFunction = async (input: HookInput): Promise<HookOutput> => {
  const tokenState = await tokenTracker.getState(input.sessionId);
  const contextPct = Math.round((tokenState.used / tokenState.limit) * 100);
  const hud: HudEmit = {
    sessionId: input.sessionId,
    activeMode: input.activeMode,
    contextPct,
    tokensUsed: tokenState.used,
    tokensTotal: tokenState.limit,
    agentsActive: getActiveAgents(input.sessionId),
    lastAgent: input.agentId,
    lastOutput: truncate(input.context, 200),
    taskProgress: estimateProgress(input.sessionId),
  };
  await Promise.all([
    writeStatusJson(hud),
    debouncedWriteTmuxSegment(hud),  // debounced 3s
    writeDisplayTxt(hud),
  ]);
  return { hookId: 'hud-emitter', status: 'ok', latencyMs: measureMs(), mutations: [{ type: 'emit_hud', hudEmit: hud }], log: [] };
};
```

### 4.3 `src/mcp/server.ts`

The MCP server uses stdio JSON-RPC. Implementation notes:
- Read stdin line-by-line (MCP uses newline-delimited JSON messages)
- Parse JSON-RPC 2.0 requests
- Route to ToolRouter
- Write responses to stdout
- Log errors to stderr (not stdout)

```typescript
// src/mcp/server.ts
import { createInterface } from 'readline';
import { ToolRouter } from './tool-router';

const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });
const router = new ToolRouter();

rl.on('line', async (line: string) => {
  try {
    const request = JSON.parse(line) as JsonRpcRequest;
    const result = await router.handle(request);
    process.stdout.write(JSON.stringify(result) + '\n');
  } catch (err) {
    const error: JsonRpcError = { code: -32000, message: (err as Error).message };
    process.stderr.write(JSON.stringify({ id: null, error }) + '\n');
  }
});
```

### 4.4 `src/core/state.ts`

PSM state management. Implementation notes:
- Uses `better-sqlite3` (synchronous, fast)
- WAL mode for fleet multi-writer support
- Transactions for atomic multi-table updates
- Session state serialized as JSON in `sessions.state_json` column

```typescript
// src/core/state.ts
import Database from 'better-sqlite3';

export class StateManager {
  private db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.initSchema();
  }

  private initSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY, worktree_id TEXT,
        state_json TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS memory (
        key TEXT PRIMARY KEY, value TEXT NOT NULL, category TEXT,
        session_id TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS trace (
        id INTEGER PRIMARY KEY AUTOINCREMENT, session_id TEXT NOT NULL,
        hook_id TEXT, agent_id TEXT, event_type TEXT NOT NULL,
        payload TEXT, duration_ms INTEGER, timestamp INTEGER NOT NULL
      );
    `);
  }

  saveSession(state: SessionState): void {
    const stmt = this.db.prepare(`
      INSERT INTO sessions (id, worktree_id, state_json, created_at, updated_at)
      VALUES ($id, $worktreeId, $stateJson, $createdAt, $updatedAt)
      ON CONFLICT(id) DO UPDATE SET state_json = $stateJson, updated_at = $updatedAt
    `);
    stmt.run({ $id: state.sessionId, $worktreeId: state.worktreeId, $stateJson: JSON.stringify(state), $createdAt: state.createdAt, $updatedAt: Date.now() });
  }
}
```

### 4.5 `src/hooks/model-router.ts`

Model tier selection. Implementation notes:
- Check skill requirement first (e.g. `security` skill → `opus`)
- Check token budget threshold (below 15% remaining → downgrade)
- Check context pressure (above 80% → suggest `ecomode`)
- Log reason for each selection

### 4.6 `src/core/hud-state.ts`

Central HUD state management. Implementation notes:
- Single source of truth for `HudState`
- Emitters write to it; display strategies read from it
- Thread-safe via event-driven updates (no shared mutable state)
- Persisted to `~/.omp/hud/state.json` for consumer access

### 4.7 `src/agents/executor.ts`

The primary implementation agent. Implementation notes:
- Handles Read, Write, Edit, Bash for all code changes
- Always calls verifier after implementation
- Reports `tokensUsed` for token tracking
- Never handles documentation (delegate to `writer`) or planning (delegate to `planner`)

## 5. Phase Exit Verification Checklist

| Phase | Verification Steps |
|-------|-------------------|
| 1 | `node dist/cli/index.js --version` prints version; `plugin.json` passes schema validation |
| 2 | All 18 agents respond to test delegation; all 6 hooks fire on synthetic input |
| 3 | `autopilot:`, `ralph:`, `ulw:`, `team:` skills activate; orchestrator never writes directly |
| 4 | `~/.omp/hud/display.txt` updates on each cycle; `~/.omp/state/omp.db` has rows after `omp state save` |
| 5 | All 10 MCP tools return valid JSON-RPC responses; `omp fleet status` returns fleet data |
| 6 | `npm run build` succeeds; all spec files present; `marketplace.json` validates |

## 6. Testing Strategy

- **Unit tests**: Each agent, hook, skill, and core module has a corresponding `tests/<module>.test.ts`
- **Integration tests**: End-to-end flows for each execution mode
- **Performance tests**: Hook latency measured with synthetic 100-cycle load; must stay under 200ms
- **Fleet tests**: Two simultaneous sessions competing for fleet SQLite write; verify WAL mode prevents corruption