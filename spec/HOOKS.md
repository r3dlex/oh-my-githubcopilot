# OMP Hooks Specification

## 1. Overview

Hooks are lightweight middleware functions that intercept and augment each agent cycle. OMP ships with six hooks that run at specific trigger points. All hooks must complete within a 200ms performance budget.

## 2. hooks.json Schema

```json
{
  "schemaVersion": "1.0",
  "hooks": [
    {
      "id": "<hook-id>",
      "entry": "./src/hooks/<hook-id>.ts",
      "trigger": "<trigger-point>",
      "timeoutMs": 200,
      "priority": <number>
    }
  ]
}
```

`trigger` must be one of: `UserPromptSubmitted`, `PreToolUse`, `PostToolUse`.
`priority` is an integer (higher runs first; ties broken by registration order).

## 3. Hook Registration

Hooks are registered at **build time** in `esbuild.config.mts` via the `hookEntries` array. Running `npm run build` compiles each hook source to `dist/hooks/<name>.mjs` and regenerates `hooks/hooks.json` as the runtime manifest. The Copilot CLI reads `hooks/hooks.json` at runtime via the `"hooks": "./hooks/hooks.json"` string in plugin.json.

At runtime, the Copilot CLI invokes hooks in priority order at each trigger point. If a hook throws, execution continues to the next hook but the failure is logged.

## 4. The Six Hooks

### 4.1 keyword-detector

**Trigger**: `UserPromptSubmitted`
**Priority**: 100 (runs first)

Scans the incoming message for magic keywords. On match, activates the corresponding skill and sets `activeMode` in the session state.

```typescript
interface KeywordMatch {
  keyword: string;        // e.g. "autopilot:", "ralph:", "ulw:"
  skillId: string;        // e.g. "autopilot", "ralph", "ultrawork"
  position: number;       // character offset in message
}
```

Detection is case-sensitive for `:`-suffixed forms (e.g. `autopilot:`), case-insensitive for slash forms (e.g. `/AUTOPILOT`).

### 4.2 delegation-enforcer

**Trigger**: `PreToolUse`
**Priority**: 90

Intercepts orchestrator tool calls. Ensures the orchestrator never uses Read, Write, Edit, or Bash for direct implementation. If a violation is detected, reroutes the call to the appropriate agent and logs the enforcement event.

```typescript
interface EnforcementEvent {
  agentId: string;
  toolAttempted: string;  // e.g. "Write"
  reroutedTo: string;     // e.g. "executor"
  reason: string;
}
```

### 4.3 model-router

**Trigger**: `PreToolUse`
**Priority**: 80

Selects the model tier for the current cycle based on:
- Explicit mode (autopilot/ralph/ultrawork/etc.)
- Token budget remaining
- Task complexity estimate
- Skill requirements

```typescript
interface ModelSelection {
  model: 'opus' | 'sonnet' | 'haiku';
  reason: string;
  overrides: string[];   // e.g. ["skill:security requires opus"]
}
```

### 4.4 token-tracker

**Trigger**: `PostToolUse`
**Priority**: 70

Tracks cumulative token usage per session. Emits warnings at configurable thresholds:
- 60% used: informational message
- 80% used: warning + suggestion to enable ecomode
- 90% used: critical + auto-enable ecomode unless overridden

```typescript
interface TokenUpdate {
  sessionId: string;
  used: number;
  limit: number;
  percentage: number;
  warningLevel: 'none' | 'info' | 'warn' | 'critical';
}
```

### 4.5 hud-emitter

**Trigger**: `PostToolUse`
**Priority**: 60

Pushes the current session state to the HUD on every agent cycle completion. Emits only changed fields to minimize overhead.

```typescript
interface HudEmit {
  sessionId: string;
  activeMode: ExecutionMode | null;
  contextPct: number;    // estimated context utilization %
  tokensUsed: number;
  tokensTotal: number;
  agentsActive: string[]; // IDs of currently running agents
  lastAgent: string;
  lastOutput: string;     // truncated to 200 chars
  taskProgress: number;    // 0-100
}
```

### 4.6 stop-continuation

**Trigger**: `PostToolUse`
**Priority**: 50

Evaluates whether the current message constitutes a completion signal. Signals include:
- Explicit "done", "complete", "finished" from user
- `modeComplete: true` from a skill
- All tasks in TaskList marked `completed`
- No pending agent delegations

```typescript
interface StopSignal {
  shouldStop: boolean;
  reason: string;
  confidence: number;   // 0.0-1.0
}
```

## 5. HookInput / HookOutput Interfaces

```typescript
interface HookInput {
  sessionId: string;
  cycleIndex: number;
  message: string;
  context: string;
  activeMode: ExecutionMode | null;
  tokenBudget: number;
  hudState: HudState;
  toolCalls: ToolCall[];
  agentId: string;
  timestamp: number;
}

interface HookOutput {
  hookId: string;
  status: 'ok' | 'skip' | 'error';
  latencyMs: number;
  mutations: HookMutation[];
  log: string[];
}

type HookMutation =
  | { type: 'set_mode'; mode: ExecutionMode | null }
  | { type: 'set_model'; model: 'opus' | 'sonnet' | 'haiku' }
  | { type: 'reroute_tool'; toolCall: ToolCall; toAgent: string }
  | { type: 'set_token_budget'; budget: number }
  | { type: 'emit_hud'; hudEmit: HudEmit }
  | { type: 'stop'; reason: string }
  | { type: 'log'; level: 'info' | 'warn' | 'error'; message: string };

interface ToolCall {
  id: string;
  tool: string;
  params: Record<string, unknown>;
  agentId: string;
}
```

## 6. Performance Budget

All hooks must complete within **200ms** (hard limit). Hooks that may exceed this budget (e.g. network calls in `researcher`) must be implemented as async with explicit timeout:

```typescript
async function keywordDetector(input: HookInput): Promise<HookOutput> {
  const timeout = 180; // leave 20ms buffer for framework overhead
  const result = await Promise.race([
    performDetection(input),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Hook timeout')), timeout)
    )
  ]);
  // ...
}
```

If a hook times out, the cycle continues without the hook's effects and an error is logged. Persistent timeouts (3 consecutive) trigger a warning to the user.

## 6.1 Copilot CLI Event Mapping

The following table maps OMP hook triggers to Copilot CLI native events:

| OMP Hook | Copilot CLI Event | Description |
|----------|-----------------|-------------|
| `keyword-detector` | `UserPromptSubmitted` | Fires when user submits a prompt; scans for magic keywords |
| `delegation-enforcer` | `PreToolUse` | Fires before each tool invocation; enforces delegation rules |
| `model-router` | `PreToolUse` | Fires before each tool invocation; routes model based on task |
| `token-tracker` | `PostToolUse` | Fires after each tool completion; tracks cumulative token usage |
| `hud-emitter` | `PostToolUse` | Fires after each tool completion; updates HUD state |
| `stop-continuation` | `PostToolUse` | Fires after each tool completion; evaluates stop signals |

## 7. Writing Custom Hooks

To add a custom hook:

1. Create `src/hooks/<hook-id>.ts` implementing `HookFunction`
2. Add the hook entry to `hookEntries` in `esbuild.config.mts`
3. Rebuild with `npm run build` (regenerates `hooks/hooks.json` and `dist/hooks/<hook-id>.mjs`)

Custom hooks must export:
```typescript
export const hook: HookFunction = async (input: HookInput): Promise<HookOutput> => {
  // implementation
};
```