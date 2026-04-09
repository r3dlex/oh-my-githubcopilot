# OMP Plugin State Manager (PSM) Specification

## 1. Purpose

The Plugin State Manager (PSM) provides durable, session-aware state persistence for OMP. It tracks session lifecycle, manages state across worktree contexts, and integrates with the fleet integration layer for multi-session coordination.

## 2. Session Lifecycle Commands

| Command | Description | State Tier |
|---------|-------------|------------|
| `omp state init` | Initialize a new OMP session; creates `~/.omp/state/sessions/<id>/` | Ephemeral |
| `omp state save` | Persist current session state to SQLite | Durable |
| `omp state load <session-id>` | Restore a previous session state | Durable |
| `omp state list` | List all saved sessions | Read-only |
| `omp state prune --older-than <duration>` | Remove sessions older than duration (e.g. `7d`) | Maintenance |
| `omp state snapshot` | Write a point-in-time snapshot of the current state | Durable |
| `omp state restore <snapshot-id>` | Restore from a named snapshot | Durable |
| `omp worktree attach <issue-id>` | Attach PSM to a worktree for issue-specific state | Ephemeral |
| `omp worktree detach` | Detach PSM from current worktree | Ephemeral |
| `omp fleet status` | Show fleet-wide session count and resource usage | Read-only |
| `omp fleet sync` | Force-sync all fleet session states to central store | Coordination |

## 3. State Tiers

PSM uses three tiers of state:

| Tier | Storage | Lifetime | Example |
|------|---------|----------|---------|
| **Ephemeral** | In-memory | Session only | Current task list, active mode, agent state |
| **Durable** | SQLite at `~/.omp/state/omp.db` | Until pruned | Session history, task completion records, snapshots |
| **Shared** | Fleet SQLite at `~/.omp/fleet/fleet.db` | Fleet lifetime | Global task queue, team member states, cross-session state |

## 4. Session State Schema

```typescript
interface SessionState {
  sessionId: string;
  worktreeId: string | null;
  createdAt: number;
  updatedAt: number;
  tasks: TaskRecord[];
  modes: ModeRecord[];
  agents: AgentRecord[];
  hud: HudState;
  memory: SessionMemory;
  trace: TraceRecord[];
}

interface TaskRecord {
  id: string;
  subject: string;
  status: 'pending' | 'in_progress' | 'completed' | 'deleted';
  owner: string | null;
  blockedBy: string[];
  blocks: string[];
  createdAt: number;
  updatedAt: number;
}
```

## 5. Fleet Integration

OMP supports fleet mode where multiple sessions share state. Fleet state is stored in `~/.omp/fleet/fleet.db`.

| Feature | Description |
|---------|-------------|
| Shared task queue | Tasks can be assigned across sessions |
| Team member state | Each agent in a team can publish its state |
| Cross-session memory | Shared context for team-wide knowledge |
| Resource coordination | Prevents two sessions from acquiring the same resource lock |
| Leader election | One session acts as fleet coordinator; others sync to it |

Fleet is activated by the `team` execution mode or via `omp fleet init`. When fleet mode is active, `omp fleet sync` runs automatically every 60 seconds and on every `post-cycle` hook.

## 6. Worktree Attach/Detach

The PSM can be attached to a specific worktree for issue-specific state isolation:

```
omp worktree attach ISSUE-123
  → creates ~/.omp/state/worktrees/ISSUE-123/state.json
  → sets worktreeId in current session
  → loads issue-specific task list
  → attaches HUD to worktree context

omp worktree detach
  → flushes state to worktree store
  → clears worktreeId
  → restores session-level state
```

Multiple worktrees can be active simultaneously. Each worktree has its own state file.

## 7. State Persistence Format

Ephemeral state is kept in memory. On `omp state save` (manual or auto-triggered every 5 minutes), the full SessionState is serialized to SQLite:

```sql
INSERT INTO sessions (id, worktree_id, state_json, created_at, updated_at)
VALUES ($id, $worktreeId, $stateJson, $createdAt, $updatedAt)
ON CONFLICT(id) DO UPDATE SET state_json = $stateJson, updated_at = $updatedAt;
```

## 8. Pruning Policy

| Prune trigger | Behavior |
|--------------|----------|
| `omp state prune --older-than 7d` | Sessions inactive >7 days removed |
| Auto-prune at startup | Sessions older than 30 days removed |
| Worktree deletion | Associated state file removed |
| Fleet rebalance | Orphaned session states cleaned up |

Pruning is never automatic for sessions tagged as "pinned" (via `omp state pin <session-id>`).