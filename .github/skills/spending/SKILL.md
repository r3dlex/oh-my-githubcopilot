# Skill: Spending

## Metadata

| Field | Value |
|-------|-------|
| **ID** | `spending` |
| **Keywords** | `spending:`, `/spending`, `/omp:spending` |
| **Tier** | user |
| **Source** | `src/skills/spending.mts` |

## Description

Inspect and manage OMP premium request usage across sessions and months. Track API request consumption against plan limits with monthly and session-level granularity and configurable warning thresholds.

## Interface

```typescript
interface SkillInput {
  action: 'status' | 'reset';
}

interface SkillOutput {
  status: "ok" | "error";
  message: string;
  data?: {
    session: number;
    monthly: number;
    monthlyLimit: number;
    monthlyPercentage: number;
    plan: string;
    month: string;
  };
}
```

## Implementation

Reads and updates spending state from `~/.omp/state/spending-monthly.json`. Tracks session and monthly premium request counts. Automatically resets monthly counter when the calendar month changes and session counter when the session ID changes. Resolves configuration from local > global > hardcoded defaults.

## Actions

### status (default)
Show current session and monthly premium request counts.

```
spending: status
```

Output:
```
Spending status (2025-04):
  Session:  12 requests
  Monthly:  234 / 300 (78%)
  Plan:     pro
```

### reset
Reset the monthly counter by removing the spending state file.
The counter will reinitialize on next request.

```
spending: reset
```

## Configuration

Add to `.omp/config.json` or `~/.omp/config.json`:

```json
{
  "spending": {
    "plan": "pro_plus",
    "premiumRequestsIncluded": 1500,
    "warningThresholdPct": 80
  }
}
```

Resolution: local > global > hardcoded defaults (`pro`, 300 requests, 80% warning).

## State

Spending state is persisted to `~/.omp/state/spending-monthly.json`.
Monthly counter resets automatically when the calendar month changes.
Session counter resets when the session ID changes.
