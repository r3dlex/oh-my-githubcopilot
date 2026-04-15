/**
 * stop-continuation hook — mocked tests for active mode branches
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("fs", () => ({
  readFileSync: vi.fn(),
}));

vi.mock("os", () => ({
  homedir: () => "/home/testuser",
}));

import { readFileSync } from "fs";
import { processHook } from "../../src/hooks/stop-continuation.mts";

describe("stop-continuation hook (mocked fs)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("active persistent mode detection", () => {
    it("returns stop mutation when team mode is active", () => {
      vi.mocked(readFileSync).mockImplementation((path: unknown) => {
        if ((path as string).includes("team-state.json")) {
          return JSON.stringify({ active: true, mode: "team" });
        }
        throw new Error("ENOENT");
      });

      const result = processHook({ hook_type: "SessionEnd", session_id: "test-sess" });
      expect(result.status).toBe("ok");
      expect(result.mutations).toContainEqual(
        expect.objectContaining({ type: "stop" })
      );
      expect(result.mutations.some((m) => "reason" in m && m.reason.includes("team"))).toBe(true);
    });

    it("returns stop mutation when ralph mode is active (team not active)", () => {
      vi.mocked(readFileSync).mockImplementation((path: unknown) => {
        const p = path as string;
        if (p.includes("ralph-state.json")) {
          return JSON.stringify({ active: true, mode: "ralph" });
        }
        throw new Error("ENOENT");
      });

      const result = processHook({ hook_type: "SessionEnd", session_id: "test-sess" });
      expect(result.status).toBe("ok");
      expect(result.mutations.some((m) => "reason" in m && m.reason.includes("ralph"))).toBe(true);
    });

    it("returns stop mutation when ultrawork mode is active (team/ralph not active)", () => {
      vi.mocked(readFileSync).mockImplementation((path: unknown) => {
        const p = path as string;
        if (p.includes("ultrawork-state.json")) {
          return JSON.stringify({ active: true, mode: "ultrawork" });
        }
        throw new Error("ENOENT");
      });

      const result = processHook({ hook_type: "SessionEnd", session_id: "test-sess" });
      expect(result.status).toBe("ok");
      expect(result.mutations.some((m) => "reason" in m && m.reason.includes("ultrawork"))).toBe(true);
    });

    it("returns no stop mutation when all mode states are inactive", () => {
      vi.mocked(readFileSync).mockImplementation(() => {
        return JSON.stringify({ active: false });
      });

      const result = processHook({ hook_type: "SessionEnd", session_id: "test-sess" });
      expect(result.status).toBe("ok");
      expect(result.mutations.some((m) => m.type === "stop")).toBe(false);
    });

    it("returns no stop mutation when mode files are missing (throw)", () => {
      vi.mocked(readFileSync).mockImplementation(() => {
        throw new Error("ENOENT");
      });

      const result = processHook({ hook_type: "SessionEnd" });
      expect(result.status).toBe("ok");
      expect(result.mutations).toEqual([]);
    });

    it("checks session-specific state path when session_id is provided", () => {
      vi.mocked(readFileSync).mockImplementation((path: unknown) => {
        const p = path as string;
        if (p.includes("sessions/my-sess") && p.includes("team-state.json")) {
          return JSON.stringify({ active: true });
        }
        throw new Error("ENOENT");
      });

      const result = processHook({ hook_type: "SessionEnd", session_id: "my-sess" });
      expect(result.mutations.some((m) => m.type === "stop")).toBe(true);
    });

    it("includes log entry when a mode is active", () => {
      vi.mocked(readFileSync).mockImplementation((path: unknown) => {
        if ((path as string).includes("ralph-state.json")) {
          return JSON.stringify({ active: true });
        }
        throw new Error("ENOENT");
      });

      const result = processHook({ hook_type: "SessionEnd" });
      expect(result.log.length).toBeGreaterThan(0);
      expect(result.log[0]).toContain("ralph");
    });

    it("includes log entry when no modes active", () => {
      vi.mocked(readFileSync).mockImplementation(() => {
        throw new Error("ENOENT");
      });

      const result = processHook({ hook_type: "SessionEnd" });
      expect(result.log).toContain("No persistent modes active");
    });

    it("includes log mutation when mode is active", () => {
      vi.mocked(readFileSync).mockImplementation((path: unknown) => {
        if ((path as string).includes("team-state.json")) {
          return JSON.stringify({ active: true });
        }
        throw new Error("ENOENT");
      });

      const result = processHook({ hook_type: "SessionEnd" });
      expect(result.mutations.some((m) => m.type === "log")).toBe(true);
    });
  });
});
