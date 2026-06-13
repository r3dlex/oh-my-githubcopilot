# ADR-0004: Token Tracker Set→Array Serialization

## Status
Accepted

## Context
The token-tracker hook persists state between invocations by writing JSON to disk. The `warnings_issued` field was typed as `Set<string>` and serialized via `JSON.stringify`. `JSON.stringify(new Set(["a"]))` produces `{}` — the Set is silently lost. On the next invocation, `state.warnings_issued.has(key)` throws `TypeError: state.warnings_issued.has is not a function` because `{}` is not a Set.

## Decision
Persist `warnings_issued` as `Array.from(set)` and rehydrate with `new Set(Array.isArray(raw) ? raw : [])`. This is explicit, survives JSON round-trips, and handles legacy state files (empty object → empty Set).

## Consequences
- **Positive:** No more TypeError crashes in the token-tracker hook.
- **Positive:** Backward-compatible with state files written before this fix (treated as empty Set).
- **Note:** Any future use of Set, Map, or other non-JSON-serializable types in hook state must follow the same Array/Object intermediary pattern.
