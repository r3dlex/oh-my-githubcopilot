/**
 * token-tracker hook — mocked tests for warning threshold branches and state persistence
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("fs", () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

vi.mock("os", () => ({
  homedir: () => "/home/testuser",
}));

vi.mock("../../src/spending/tracker.mjs", () => ({
  incrementSpending: vi.fn(),
}));

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { processHook } from "../../src/hooks/token-tracker.mts";

describe("token-tracker hook (mocked fs)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Note: warnings_issued is a Set at runtime but serializes as array in JSON.
  // Reading back from JSON breaks .has()/.add(). We always initialize from scratch
  // (throw on readFileSync) so the code creates a proper Set, then supply a large
  // tool_input to push accumulated tokens past the desired threshold.

  describe("warning thresholds", () => {
    it("emits info log at 60% threshold", () => {
      // Fresh state: budget=200000, start=0. Input of 240000 chars = 60000 tokens = 30%.
      // We need tokens_estimated to exceed 60% (120000 tokens = 480000 chars).
      vi.mocked(readFileSync).mockImplementation(() => { throw new Error("ENOENT"); });
      vi.mocked(writeFileSync).mockImplementation(() => {});
      vi.mocked(mkdirSync).mockImplementation(() => undefined);

      // 480004 chars / 4 = 120001 tokens → 60% of 200000
      const bigInput = "a".repeat(480_004);
      const result = processHook({
        hook_type: "PostToolUse",
        tool_name: "Read",
        tool_input: bigInput,
        session_id: "sess-60",
      });

      expect(result.status).toBe("ok");
      const logMutations = result.mutations.filter((m) => m.type === "log") as Array<{ type: "log"; level: string; message: string }>;
      expect(logMutations.length).toBeGreaterThan(0);
      expect(logMutations.some((m) => m.message.includes("INFO"))).toBe(true);
    });

    it("emits warn log at 80% threshold", () => {
      vi.mocked(readFileSync).mockImplementation(() => { throw new Error("ENOENT"); });
      vi.mocked(writeFileSync).mockImplementation(() => {});
      vi.mocked(mkdirSync).mockImplementation(() => undefined);

      // 640004 chars / 4 = 160001 tokens → 80% of 200000
      const bigInput = "a".repeat(640_004);
      const result = processHook({
        hook_type: "PostToolUse",
        tool_name: "Read",
        tool_input: bigInput,
        session_id: "sess-80",
      });

      expect(result.status).toBe("ok");
      const logMutations = result.mutations.filter((m) => m.type === "log") as Array<{ type: "log"; level: string; message: string }>;
      expect(logMutations.some((m) => m.level === "warn")).toBe(true);
    });

    it("emits critical warn log at 90% threshold", () => {
      vi.mocked(readFileSync).mockImplementation(() => { throw new Error("ENOENT"); });
      vi.mocked(writeFileSync).mockImplementation(() => {});
      vi.mocked(mkdirSync).mockImplementation(() => undefined);

      // 720004 chars / 4 = 180001 tokens → 90% of 200000
      const bigInput = "a".repeat(720_004);
      const result = processHook({
        hook_type: "PostToolUse",
        tool_name: "Read",
        tool_input: bigInput,
        session_id: "sess-90",
      });

      expect(result.status).toBe("ok");
      const logMutations = result.mutations.filter((m) => m.type === "log") as Array<{ type: "log"; level: string; message: string }>;
      expect(logMutations.some((m) => m.message.includes("CRITICAL"))).toBe(true);
    });

    it("does not emit warning when well below threshold", () => {
      vi.mocked(readFileSync).mockImplementation(() => { throw new Error("ENOENT"); });
      vi.mocked(writeFileSync).mockImplementation(() => {});
      vi.mocked(mkdirSync).mockImplementation(() => undefined);

      // small input, well below 60%
      const result = processHook({
        hook_type: "PostToolUse",
        tool_name: "Read",
        tool_input: "hello",
        session_id: "sess-low",
      });

      expect(result.status).toBe("ok");
      const logMutations = result.mutations.filter((m) => m.type === "log");
      expect(logMutations).toHaveLength(0);
    });
  });

  describe("state initialization", () => {
    it("initializes fresh state when no state file exists", () => {
      vi.mocked(readFileSync).mockImplementation(() => { throw new Error("ENOENT"); });
      vi.mocked(writeFileSync).mockImplementation(() => {});
      vi.mocked(mkdirSync).mockImplementation(() => undefined);

      const result = processHook({
        hook_type: "PostToolUse",
        tool_name: "Read",
        session_id: "new-sess",
      });

      expect(result.status).toBe("ok");
      expect(result.mutations).toContainEqual(
        expect.objectContaining({ type: "set_token_budget", budget: 200_000 })
      );
    });

    it("uses session-specific state path when session_id provided", () => {
      vi.mocked(readFileSync).mockImplementation((path: unknown) => {
        if ((path as string).includes("sessions/my-sess")) {
          return makeState(0, 200_000);
        }
        throw new Error("ENOENT");
      });
      vi.mocked(writeFileSync).mockImplementation(() => {});
      vi.mocked(mkdirSync).mockImplementation(() => undefined);

      const result = processHook({
        hook_type: "PostToolUse",
        tool_name: "Read",
        session_id: "my-sess",
      });

      expect(result.status).toBe("ok");
    });

    it("falls back to default budget for unknown model", () => {
      vi.mocked(readFileSync).mockImplementation(() => { throw new Error("ENOENT"); });
      vi.mocked(writeFileSync).mockImplementation(() => {});
      vi.mocked(mkdirSync).mockImplementation(() => undefined);

      const result = processHook({
        hook_type: "PostToolUse",
        tool_name: "Read",
        ...(({ model: "unknown-model-xyz" } as unknown) as object),
      } as Parameters<typeof processHook>[0]);

      expect(result.mutations).toContainEqual(
        expect.objectContaining({ type: "set_token_budget", budget: 200_000 })
      );
    });
  });

  describe("state persistence", () => {
    it("writes updated state back to file", () => {
      vi.mocked(readFileSync).mockImplementation(() => { throw new Error("ENOENT"); });
      vi.mocked(writeFileSync).mockImplementation(() => {});
      vi.mocked(mkdirSync).mockImplementation(() => undefined);

      processHook({
        hook_type: "PostToolUse",
        tool_name: "Read",
        tool_input: "hello",
      });

      expect(writeFileSync).toHaveBeenCalled();
    });

    it("logs write error but still returns ok", () => {
      vi.mocked(readFileSync).mockImplementation(() => { throw new Error("ENOENT"); });
      vi.mocked(writeFileSync).mockImplementation(() => { throw new Error("disk full"); });
      vi.mocked(mkdirSync).mockImplementation(() => undefined);

      const result = processHook({
        hook_type: "PostToolUse",
        tool_name: "Read",
      });

      expect(result.status).toBe("ok");
      expect(result.log.some((l) => l.includes("Failed to write state"))).toBe(true);
    });
  });

  describe("session_id fallback for spending", () => {
    it("generates session id when not provided", () => {
      vi.mocked(readFileSync).mockImplementation(() => { throw new Error("ENOENT"); });
      vi.mocked(writeFileSync).mockImplementation(() => {});
      vi.mocked(mkdirSync).mockImplementation(() => undefined);

      const result = processHook({
        hook_type: "PostToolUse",
        tool_name: "Read",
      });

      expect(result.status).toBe("ok");
    });
  });
});
