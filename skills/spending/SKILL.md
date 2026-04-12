---
name: spending
description: Inspect and manage OMP premium request usage. Use when user says spending:, /spending, or wants to check or reset their API request counts.
---

# Spending Skill

Trigger: `/omp:spending` or magic keyword `spending:`

Track and manage premium API request usage across sessions.

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
