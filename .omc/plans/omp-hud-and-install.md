# Plan: OMP Statusline Live Age + omp install subcommand

Status: **approved**
Source spec: `../../.omc/specs/deep-interview-omp-hud-agents.md` (deep-interview id: di-omp-hud-agents-2026-05-25)
Ralplan consensus: Planner → Architect ITERATE → Critic ACCEPT-WITH-RESERVATIONS (treated as APPROVE; reservations folded in below)

---

## RALPLAN-DR Summary

### Principles
1. Minimal blast radius — change only the read priority in one function and add one new subcommand; do not touch the hook write pipeline, esbuild config, or existing CLI cases.
2. Live computation over caching — derive volatile values (age) at observation time; serialized state is the source of truth, `display.txt` is a degraded fallback.
3. Idempotent merges — `omp install` converges on the same `settings.json` regardless of run count or prior state; never destroys unrelated keys.
4. Path correctness — absolute paths resolved from `import.meta.url` so installed Copilot config works from any cwd.
5. Test the seam, not the framework — verify the swap with a deterministic clock test; test the install with a tmp-HOME fixture.

### Decision Drivers
1. Live-age correctness — frozen age between tool calls is the triggering bug.
2. Idempotent + non-destructive settings merge — overwriting footer or other plugins is worse than the problem being solved.
3. Build pipeline stability — both entry points already exist in `esbuild.config.mts`; no new entries needed.

### Options: Component 1
| Option | Verdict | Rationale |
|--------|---------|-----------|
| **1A — Swap read order in `readStatusline()`** | ✅ CHOSEN | Single-file swap; uses existing live render path; preserves fallback chain |
| 1B — Parse rendered display.txt to recover startedAt | ❌ | Impossible: display.txt only has formatted `Xm` age, not `startedAt` timestamp |
| 1C — Third artifact + sidecar startedAt file | ❌ | Violates minimal blast radius; breaks tmux contract |

### Options: Component 2
| Option | Verdict | Rationale |
|--------|---------|-----------|
| **2A — New `src/cli/install.mts` + switch case** | ✅ CHOSEN | Matches `src/cli/update.mts` pattern; merge logic unit-testable; no new esbuild entries |
| 2B — Inline in `src/index.mts` | ❌ | Bloats main entry; untestable in isolation |
| 2C — Shell script with jq | ❌ | Doesn't satisfy CLI spec; adds jq dependency |

---

## Implementation Steps

### Step 1 — Fix `readStatusline()` read priority

**File:** `src/hud/statusline.mts` — lines 173–197

Swap the two `try` blocks so `status.json` is read first (live `formatAge(startedAt)`) and `display.txt` becomes the fallback:

```ts
export function readStatusline(paths = getStatuslinePaths()): string {
  // Try live render from status.json — formatAge runs at call time, not hook-fire time
  try {
    const parsed = JSON.parse(readFileSync(paths.statusJsonPath, "utf-8"));
    const state = deserializeHudState(parsed);
    if (state) return renderPlain(state);
  } catch {
    // Fall through to cached display string.
  }

  // Fallback: pre-rendered cached string (written by hud-emitter; used by tmux consumers)
  try {
    const line = readFileSync(paths.displayPath, "utf-8").trim();
    if (line) return line;
  } catch {
    // Fall through to legacy file.
  }

  try {
    const line = readFileSync(paths.legacyLinePath, "utf-8").trim();
    if (line) return line;
  } catch {}

  return DEFAULT_STATUSLINE;
}
```

**Notes:**
- display.txt is still written by `hud-emitter.mts` on PostToolUse (tmux consumers unaffected)
- `renderPlain` has no I/O — only Date.now() math + string ops. `readFileSync(statusJsonPath)` is the only I/O cost per statusline call. Acknowledged as acceptable.
- The shell wrapper `bin/omp-statusline.sh` execs `node omp-statusline.mjs` which calls `readStatusline()` — no change to the wrapper.

### Step 2 — Update existing fallback test

**File:** `tests/hud/statusline.test.mts` (around line 69)

The existing test named something like "should fall back from display.txt to status.json to legacy line" must be renamed and its assertions updated to reflect the new order:
- New name: "falls back from status.json to display.txt to legacy line"
- First assertion: expect status.json to be primary read (not display.txt)
- Subsequent assertions: delete status.json → expect display.txt; delete display.txt → expect legacy; delete all → expect DEFAULT_STATUSLINE

### Step 3 — Add new statusline tests

**File (new):** `tests/hud/statusline-live-age.test.mts` ← `.mts` extension to match repo convention

Cases:
1. **Advancing age** — write `status.json` with `startedAt = fakeNow - 60_000`; call `readStatusline`; advance fake time 60s via `vi.useFakeTimers()`; call again; assert different age tokens (e.g. `1m` vs `2m`)
2. **status.json priority** — write both `status.json` and stale `display.txt`; assert output comes from `status.json` rendering, not `display.txt`
3. **display.txt fallback** — delete `status.json`, keep `display.txt`; assert `display.txt` content returned verbatim
4. **DEFAULT_STATUSLINE** — delete both; assert `DEFAULT_STATUSLINE` returned

### Step 4 — Create `src/cli/install.mts`

**File (new):** `src/cli/install.mts`

```ts
import { mkdir, readFile, rename, writeFile } from "fs/promises";
import { homedir } from "os";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

export async function runInstall(
  settingsPath = join(homedir(), ".copilot", "settings.json"),
): Promise<void> {
  // dirname(import.meta.url) = <pkg>/bin, ".." = <pkg>
  const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
  const statusLineCommand = join(pkgRoot, "bin", "omp-statusline.sh");
  const marketplacePath = pkgRoot;

  let existing: Record<string, unknown> = {};
  try {
    const raw = await readFile(settingsPath, "utf-8");
    const parsed: unknown = JSON.parse(raw);
    if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
      existing = parsed as Record<string, unknown>;
    }
  } catch { /* missing or invalid — start fresh */ }

  const existingPlugins =
    typeof existing.enabledPlugins === "object" &&
    existing.enabledPlugins !== null &&
    !Array.isArray(existing.enabledPlugins)
      ? (existing.enabledPlugins as Record<string, unknown>)
      : {};

  // extraKnownMarketplaces is a keyed object (confirmed from ~/.copilot/settings.json).
  // Spread-preserve-siblings so other marketplace entries survive.
  const existingMarketplaces =
    typeof existing.extraKnownMarketplaces === "object" &&
    existing.extraKnownMarketplaces !== null &&
    !Array.isArray(existing.extraKnownMarketplaces)
      ? (existing.extraKnownMarketplaces as Record<string, unknown>)
      : {};

  const merged = {
    ...existing,
    enabledPlugins: {
      ...existingPlugins,
      "oh-my-githubcopilot@oh-my-githubcopilot": true,
    },
    experimental: true,
    statusLine: { type: "command", command: statusLineCommand },
    extraKnownMarketplaces: {
      ...existingMarketplaces,
      "oh-my-githubcopilot": {
        source: { source: "directory", path: marketplacePath },
      },
    },
  };

  // Atomic write: tmp → rename (prevents partial write on crash/disk-full)
  const tmp = `${settingsPath}.tmp`;
  await mkdir(dirname(settingsPath), { recursive: true });
  await writeFile(tmp, JSON.stringify(merged, null, 2) + "\n", "utf-8");
  await rename(tmp, settingsPath);

  console.log(`omp install: wrote ${settingsPath}`);
  console.log(`  statusLine.command: ${statusLineCommand}`);
  console.log(`  marketplace path:   ${marketplacePath}`);
  console.log(`  plugin:             oh-my-githubcopilot@oh-my-githubcopilot`);
  console.log(`\nRestart Copilot CLI to activate OMP.`);
}
```

**DI note:** `settingsPath` is an optional arg (defaults to real path). Tests pass a tmpdir path directly — no env patching or module mocking required.

**Restart note added** to stdout output: Copilot reads `settings.json` at startup only, so users need to restart after `omp install`.

### Step 5 — Wire install into `src/index.mts`

Add to the subcommand switch:
```ts
case "install": {
  const { runInstall } = await import("./cli/install.mts");
  await runInstall();
  break;
}
```

Update `printUsage` string to include `install`:
```
Usage: omp [hud|install|version|psm|bench|hook] [--watch]
```

### Step 6 — Add install tests

**File (new):** `tests/cli/install.test.mts` ← `.mts` extension

Use a tmpdir for `settingsPath` — pass it directly via the DI arg. No HOME patching needed.

Cases:
1. **Missing file** → after `runInstall(tmpPath)`, file exists with all 4 keys; `statusLine.command` is absolute; `JSON.parse(readFileSync(tmpPath))` succeeds
2. **Idempotent** → call `runInstall(tmpPath)` twice; read file both times; assert byte-identical (second and subsequent runs)
3. **Preserve footer** → pre-seed with `{ "footer": { "showVersion": true }, "enabledPlugins": { "other@vendor": true } }`; after `runInstall`, `footer.showVersion === true` AND `enabledPlugins["other@vendor"] === true` AND OMP plugin present
4. **Absolute paths** → assert `path.isAbsolute(settings.statusLine.command)` and `settings.statusLine.command.endsWith("bin/omp-statusline.sh")` and `path.isAbsolute(settings.extraKnownMarketplaces["oh-my-githubcopilot"].source.path)`
5. **Malformed prior** → pre-seed with `"not json"`; `runInstall` recovers; `JSON.parse(readFileSync(tmpPath))` succeeds after
6. **Existing marketplace entry** → pre-seed with `{ "extraKnownMarketplaces": { "other-marketplace": { "source": { "source": "directory", "path": "/other" } } } }`; after `runInstall`, both `"other-marketplace"` and `"oh-my-githubcopilot"` present
7. **Relative→absolute upgrade** → pre-seed with existing production-like settings (path: "."); after `runInstall`, path is absolute and different from `"."`

### Step 7 — Build and verify

```bash
cd /Users/andreburgstahler/Ws/Personal/AiTool/oh-my-githubcopilot
npm run build
npx vitest run
```

Manual smoke-tests:
```bash
# Component 1: age advances
node bin/omp-statusline.mjs  # note age token
sleep 65
node bin/omp-statusline.mjs  # age token must be different

# Component 2: install to tmp
TMP=$(mktemp -d)
SETTINGS="$TMP/.copilot/settings.json"
node bin/omp.mjs install --settings "$SETTINGS" 2>/dev/null || node -e "
const { runInstall } = await import('./src/cli/install.mts');
await runInstall('$SETTINGS');
" 2>/dev/null
cat "$SETTINGS"
# Verify absolute paths, all 4 keys present
```

---

## Acceptance Criteria

### Component 1: Statusline Live Age
- [ ] Consecutive `node bin/omp-statusline.mjs` calls 60s+ apart show different age tokens with no PostToolUse between them
- [ ] display.txt still written by hud-emitter hook on PostToolUse (tmux consumers unaffected)
- [ ] When `status.json` absent or malformed, falls back to `display.txt` gracefully
- [ ] `npm run build` succeeds; `bin/omp-statusline.mjs` regenerated
- [ ] `npx vitest run` passes (all existing tests + new live-age tests)

### Component 2: omp install
- [ ] `omp install` exits 0 with confirmation output including restart reminder
- [ ] `~/.copilot/settings.json` (or test tmpdir path) contains all 4 required keys with absolute paths
- [ ] Second run is byte-identical (idempotent)
- [ ] Existing keys (`footer`, other plugins, other marketplaces) preserved
- [ ] Missing settings.json created; malformed settings.json recovered
- [ ] `npm run build` succeeds; `bin/omp.mjs` regenerated with `install` subcommand
- [ ] `npx vitest run` passes (all 7 new install tests)

---

## ADR

**Decision:** Swap read priority in `readStatusline()` (Component 1, Option 1A) and add `src/cli/install.mts` wired into `src/index.mts` switch (Component 2, Option 2A).

**Drivers:** live-age correctness, idempotent non-destructive settings merge, build pipeline stability.

**Alternatives:**
- 1B: impossible (display.txt lacks startedAt timestamp)
- 1C: new artifact, larger blast radius
- 2B: bloats src/index.mts, untestable in isolation
- 2C: shell+jq dependency, doesn't satisfy CLI spec

**Consequences:**
- Positive: age ticks on every Copilot prompt redraw; omp install is one command; both changes are independently reversible.
- Negative: `readStatusline()` now does `readFileSync(statusJsonPath)` + JSON.parse + renderPlain on every statusline call (previously just `readFileSync(displayPath)`). Benchmarked acceptable: `renderPlain` is pure CPU, no I/O. One extra readFileSync per call is negligible.
- Behavioral shift: `omp install` upgrades `extraKnownMarketplaces[...].source.path` from relative `"."` to absolute package root. This is intentional — Copilot's cwd is not guaranteed to be the OMP directory. If the OMP package is moved/reinstalled to a different path, re-run `omp install`.
- Concurrent `omp install` invocations can race at the `rename` step — last writer wins. Documented as acceptable; mitigation is the atomic tmp→rename pattern which prevents partial writes.

**Follow-ups:**
- `omp install --dry-run` to preview the merge diff
- `omp install --uninstall` to surgically remove the 4 OMP-owned keys
- Document the read-priority change in `spec/HUD.md`
- Enumerate all consumers of `display.txt` beyond tmux

---

## Files

| File | Action |
|------|--------|
| `src/hud/statusline.mts` | Edit — swap 2 try-blocks in `readStatusline()` |
| `tests/hud/statusline.test.mts` | Edit — rename + update fallback test at ~line 69 |
| `tests/hud/statusline-live-age.test.mts` | New — 4 cases for live age |
| `src/cli/install.mts` | New — `runInstall(settingsPath?)` |
| `src/index.mts` | Edit — `case "install":` + printUsage |
| `tests/cli/install.test.mts` | New — 7 cases |
| `bin/omp-statusline.mjs` | Rebuilt (from `src/hud/statusline.mts`) |
| `bin/omp.mjs` | Rebuilt (from `src/index.mts` + `src/cli/install.mts`) |
| `esbuild.config.mts` | No change — both entry points already present |
