/**
 * Fail-open behavior tests for hook entry points.
 *
 * Spawns each hook entry directly (via tsx against src, plus the built
 * dist bundles when present) with empty stdin and malformed JSON, and
 * asserts the hook exits 0 and prints a valid HookOutput JSON with
 * status "error" (and decision "allow" where the hook supports decisions).
 *
 * A hook that exits non-zero or prints non-JSON is treated as errored by
 * the Copilot CLI, which DENIES the tool call for PreToolUse hooks —
 * hence hooks must never do either.
 */

import { describe, it, expect, afterAll } from "vitest";
import { spawnSync } from "child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { join } from "path";

const ROOT = join(__dirname, "..", "..");
// Scratch area for fake $HOME dirs (inside the repo; cleaned up after the run).
const SCRATCH = join(ROOT, "node_modules", ".cache", "omp-fail-open-tests");

afterAll(() => {
  rmSync(SCRATCH, { recursive: true, force: true });
});

interface HookCase {
  name: string;
  /** argv after `node` */
  args: string[];
  /** whether the hook's HookOutput supports a decision field */
  supportsDecision: boolean;
}

const SRC_HOOKS: HookCase[] = [
  { name: "delegation-enforcer (src)", args: ["--import", "tsx", join(ROOT, "src/hooks/delegation-enforcer.mts")], supportsDecision: true },
  { name: "model-router (src)", args: ["--import", "tsx", join(ROOT, "src/hooks/model-router.mts")], supportsDecision: true },
  { name: "keyword-detector (src)", args: ["--import", "tsx", join(ROOT, "src/hooks/keyword-detector.mts")], supportsDecision: true },
  { name: "token-tracker (src)", args: ["--import", "tsx", join(ROOT, "src/hooks/token-tracker.mts")], supportsDecision: false },
  { name: "hud-emitter (src)", args: ["--import", "tsx", join(ROOT, "src/hooks/hud-emitter.mts")], supportsDecision: false },
  { name: "stop-continuation (src)", args: ["--import", "tsx", join(ROOT, "src/hooks/stop-continuation.mts")], supportsDecision: false },
];

const DIST_HOOKS: HookCase[] = [
  { name: "delegation-enforcer (dist)", args: [join(ROOT, "dist/hooks/delegation-enforcer.mjs")], supportsDecision: true },
  { name: "model-router (dist)", args: [join(ROOT, "dist/hooks/model-router.mjs")], supportsDecision: true },
  { name: "keyword-detector (dist)", args: [join(ROOT, "dist/hooks/keyword-detector.mjs")], supportsDecision: true },
  { name: "token-tracker (dist)", args: [join(ROOT, "dist/hooks/token-tracker.mjs")], supportsDecision: false },
  { name: "hud-emitter (dist)", args: [join(ROOT, "dist/hooks/hud-emitter.mjs")], supportsDecision: false },
  { name: "stop-continuation (dist)", args: [join(ROOT, "dist/hooks/stop-continuation.mjs")], supportsDecision: false },
].filter((c) => existsSync(c.args[0]));

const ALL_HOOKS = [...SRC_HOOKS, ...DIST_HOOKS];

function runHook(args: string[], stdin: string, env?: Record<string, string>) {
  const result = spawnSync(process.execPath, args, {
    input: stdin,
    encoding: "utf-8",
    cwd: ROOT,
    timeout: 15_000,
    env: env ? { ...process.env, ...env } : process.env,
  });
  return result;
}

function assertFailOpen(args: string[], stdin: string, supportsDecision: boolean) {
  const result = runHook(args, stdin);
  expect(result.status).toBe(0);
  const parsed = JSON.parse(result.stdout.trim());
  expect(parsed.status).toBe("error");
  expect(parsed.latencyMs).toBe(0);
  expect(parsed.mutations).toEqual([]);
  expect(parsed.log[0]).toMatch(/^fail-open: /);
  if (supportsDecision) {
    expect(parsed.decision).toBe("allow");
  }
}

describe("hook fail-open behavior", () => {
  describe.each(ALL_HOOKS)("$name", ({ args, supportsDecision }) => {
    it("exits 0 with fail-open JSON on empty stdin", () => {
      assertFailOpen(args, "", supportsDecision);
    });

    it("exits 0 with fail-open JSON on malformed JSON stdin", () => {
      assertFailOpen(args, "not json {", supportsDecision);
    });
  });

  it("delegation-enforcer still processes valid input normally", () => {
    const result = runHook(SRC_HOOKS[0].args, JSON.stringify({
      hook_type: "PreToolUse",
      tool_name: "Write",
      agent_id: "orchestrator",
      tool_input: { file_path: "/test.txt", content: "x" },
    }));
    expect(result.status).toBe(0);
    const parsed = JSON.parse(result.stdout.trim());
    expect(parsed.status).toBe("ok");
    expect(parsed.decision).toBe("deny");
  });

  it("model-router still processes valid input normally", () => {
    const result = runHook(SRC_HOOKS[1].args, JSON.stringify({
      hook_type: "PreToolUse",
      tool_name: "Read",
      agent_id: "explorer",
    }));
    expect(result.status).toBe(0);
    const parsed = JSON.parse(result.stdout.trim());
    expect(parsed.status).toBe("ok");
    expect(parsed.mutations).toContainEqual({ type: "set_model", model: "haiku" });
  });

  describe("fail-open event persistence", () => {
    const LOG_REL = join(".omp", "logs", "hook-failures.jsonl");

    it.each([
      { hookName: "delegation-enforcer", hookCase: SRC_HOOKS[0] },
      { hookName: "token-tracker", hookCase: SRC_HOOKS[3] },
    ])("$hookName appends a parseable JSONL record with the hook name", ({ hookName, hookCase }) => {
      const fakeHome = join(SCRATCH, `home-${hookName}`);
      rmSync(fakeHome, { recursive: true, force: true });
      mkdirSync(fakeHome, { recursive: true });

      const result = runHook(hookCase.args, "not json {", { HOME: fakeHome });

      // fail-open contract intact
      expect(result.status).toBe(0);
      const parsed = JSON.parse(result.stdout.trim());
      expect(parsed.status).toBe("error");
      // stderr mirror present (never stdout)
      expect(result.stderr).toContain(`[omp hook fail-open] ${hookName}:`);

      // JSONL record persisted with ts/hook/reason
      const logPath = join(fakeHome, LOG_REL);
      expect(existsSync(logPath)).toBe(true);
      const lines = readFileSync(logPath, "utf-8").trim().split("\n");
      expect(lines.length).toBe(1);
      const record = JSON.parse(lines[0]);
      expect(record.hook).toBe(hookName);
      expect(typeof record.reason).toBe("string");
      expect(record.reason.length).toBeGreaterThan(0);
      expect(new Date(record.ts).toString()).not.toBe("Invalid Date");
    });

    it("appends across invocations (JSONL grows by one line per failure)", () => {
      const fakeHome = join(SCRATCH, "home-append");
      rmSync(fakeHome, { recursive: true, force: true });
      mkdirSync(fakeHome, { recursive: true });

      runHook(SRC_HOOKS[0].args, "", { HOME: fakeHome });
      runHook(SRC_HOOKS[0].args, "not json {", { HOME: fakeHome });

      const lines = readFileSync(join(fakeHome, LOG_REL), "utf-8").trim().split("\n");
      expect(lines.length).toBe(2);
      for (const line of lines) {
        expect(JSON.parse(line).hook).toBe("delegation-enforcer");
      }
    });

    it("unwritable log path still fail-opens cleanly (exit 0, valid JSON stdout)", () => {
      // HOME pointing at a regular FILE makes mkdir of $HOME/.omp/logs fail.
      mkdirSync(SCRATCH, { recursive: true });
      const fakeHomeFile = join(SCRATCH, "home-is-a-file");
      writeFileSync(fakeHomeFile, "not a directory", "utf-8");

      const result = runHook(SRC_HOOKS[0].args, "not json {", { HOME: fakeHomeFile });

      expect(result.status).toBe(0);
      const parsed = JSON.parse(result.stdout.trim());
      expect(parsed.status).toBe("error");
      expect(parsed.decision).toBe("allow");
      expect(parsed.log[0]).toMatch(/^fail-open: /);
      // stderr mirror still emitted even when the JSONL write fails
      expect(result.stderr).toContain("[omp hook fail-open] delegation-enforcer:");
    });
  });
});
