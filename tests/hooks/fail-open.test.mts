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

import { describe, it, expect } from "vitest";
import { spawnSync } from "child_process";
import { existsSync } from "fs";
import { join } from "path";

const ROOT = join(__dirname, "..", "..");

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

function runHook(args: string[], stdin: string) {
  const result = spawnSync(process.execPath, args, {
    input: stdin,
    encoding: "utf-8",
    cwd: ROOT,
    timeout: 15_000,
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
});
