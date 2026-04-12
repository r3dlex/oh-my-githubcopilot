/**
 * Spending tracker tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";

// Mock fs operations
vi.mock("fs", () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

const mockReadFileSync = vi.mocked(readFileSync);
const mockWriteFileSync = vi.mocked(writeFileSync);
const mockMkdirSync = vi.mocked(mkdirSync);

const { loadSpending, saveSpending, incrementSpending } = await import("../../src/spending/tracker.mts");

const SPENDING_PATH = join(homedir(), ".omp", "state", "spending-monthly.json");

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

describe("spending tracker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWriteFileSync.mockImplementation(() => undefined);
    mockMkdirSync.mockImplementation(() => undefined);
  });

  describe("loadSpending", () => {
    it("returns fresh zero state when file does not exist", () => {
      mockReadFileSync.mockImplementation(() => { throw Object.assign(new Error("ENOENT"), { code: "ENOENT" }); });
      const state = loadSpending("session-1");
      expect(state.version).toBe(1);
      expect(state.sessionId).toBe("session-1");
      expect(state.sessionPremiumRequests).toBe(0);
      expect(state.monthlyPremiumRequests).toBe(0);
      expect(state.month).toBe(getCurrentMonth());
    });

    it("returns fresh zero state when file contains malformed JSON", () => {
      mockReadFileSync.mockReturnValue("not-json" as unknown as Buffer);
      const state = loadSpending("session-1");
      expect(state.sessionPremiumRequests).toBe(0);
      expect(state.monthlyPremiumRequests).toBe(0);
      expect(state.version).toBe(1);
    });

    it("returns saved state when session matches and month is current", () => {
      const saved = {
        version: 1,
        sessionId: "session-1",
        sessionPremiumRequests: 5,
        monthlyPremiumRequests: 42,
        month: getCurrentMonth(),
      };
      mockReadFileSync.mockReturnValue(JSON.stringify(saved) as unknown as Buffer);
      const state = loadSpending("session-1");
      expect(state.sessionPremiumRequests).toBe(5);
      expect(state.monthlyPremiumRequests).toBe(42);
    });

    it("resets session counter when sessionId changes, preserves monthly", () => {
      const saved = {
        version: 1,
        sessionId: "old-session",
        sessionPremiumRequests: 10,
        monthlyPremiumRequests: 50,
        month: getCurrentMonth(),
      };
      mockReadFileSync.mockReturnValue(JSON.stringify(saved) as unknown as Buffer);
      const state = loadSpending("new-session");
      expect(state.sessionId).toBe("new-session");
      expect(state.sessionPremiumRequests).toBe(0);
      expect(state.monthlyPremiumRequests).toBe(50);
    });

    it("resets both counters when month changes", () => {
      const saved = {
        version: 1,
        sessionId: "session-1",
        sessionPremiumRequests: 10,
        monthlyPremiumRequests: 1200,
        month: "2024-01",
      };
      mockReadFileSync.mockReturnValue(JSON.stringify(saved) as unknown as Buffer);
      const state = loadSpending("session-1");
      expect(state.sessionPremiumRequests).toBe(0);
      expect(state.monthlyPremiumRequests).toBe(0);
      expect(state.month).toBe(getCurrentMonth());
    });

    it("preserves monthly requests across session changes in same month", () => {
      const saved = {
        version: 1,
        sessionId: "session-a",
        sessionPremiumRequests: 7,
        monthlyPremiumRequests: 100,
        month: getCurrentMonth(),
      };
      mockReadFileSync.mockReturnValue(JSON.stringify(saved) as unknown as Buffer);
      const state = loadSpending("session-b");
      expect(state.monthlyPremiumRequests).toBe(100);
    });

    it("always sets version: 1 on returned state", () => {
      const saved = {
        version: 1,
        sessionId: "session-1",
        sessionPremiumRequests: 3,
        monthlyPremiumRequests: 10,
        month: getCurrentMonth(),
      };
      mockReadFileSync.mockReturnValue(JSON.stringify(saved) as unknown as Buffer);
      const state = loadSpending("session-1");
      expect(state.version).toBe(1);
    });
  });

  describe("saveSpending", () => {
    it("writes state to the correct path with version field", () => {
      const state = {
        version: 1 as const,
        sessionId: "session-1",
        sessionPremiumRequests: 3,
        monthlyPremiumRequests: 10,
        month: getCurrentMonth(),
      };
      saveSpending(state);
      expect(mockMkdirSync).toHaveBeenCalled();
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        SPENDING_PATH,
        JSON.stringify(state, null, 2),
        "utf-8"
      );
    });

    it("is non-blocking on write failure — warns instead of throwing", () => {
      mockWriteFileSync.mockImplementation(() => { throw new Error("disk full"); });
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      expect(() => saveSpending({
        version: 1,
        sessionId: "s",
        sessionPremiumRequests: 0,
        monthlyPremiumRequests: 0,
        month: getCurrentMonth(),
      })).not.toThrow();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe("incrementSpending", () => {
    it("increments both session and monthly premium request counters", () => {
      const saved = {
        version: 1,
        sessionId: "session-1",
        sessionPremiumRequests: 4,
        monthlyPremiumRequests: 20,
        month: getCurrentMonth(),
      };
      mockReadFileSync.mockReturnValue(JSON.stringify(saved) as unknown as Buffer);
      const result = incrementSpending("session-1");
      expect(result.sessionPremiumRequests).toBe(5);
      expect(result.monthlyPremiumRequests).toBe(21);
    });

    it("returns updated state starting from zero for new session", () => {
      mockReadFileSync.mockImplementation(() => { throw new Error("ENOENT"); });
      const result = incrementSpending("session-new");
      expect(result.sessionPremiumRequests).toBe(1);
      expect(result.monthlyPremiumRequests).toBe(1);
      expect(result.sessionId).toBe("session-new");
    });

    it("enforceTier=true regression: still writes state after incrementing so counters persist", () => {
      // Regression: even when enforceTier is true (routing enforced externally),
      // incrementSpending must still write state back so counters persist
      const saved = {
        version: 1,
        sessionId: "session-enforce",
        sessionPremiumRequests: 0,
        monthlyPremiumRequests: 1499,
        month: getCurrentMonth(),
      };
      mockReadFileSync.mockReturnValue(JSON.stringify(saved) as unknown as Buffer);
      const result = incrementSpending("session-enforce");
      expect(mockWriteFileSync).toHaveBeenCalled();
      expect(result.monthlyPremiumRequests).toBe(1500);
    });
  });
});
