/**
 * spending skill unit tests.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("fs", () => ({
  rmSync: vi.fn(),
}));

vi.mock("../../src/spending/tracker.mjs", () => ({
  loadSpending: vi.fn(),
}));

vi.mock("../../src/utils/config.mjs", () => ({
  loadConfig: vi.fn(),
  writeConfig: vi.fn(),
}));

import { rmSync } from "fs";
import { loadSpending } from "../../src/spending/tracker.mjs";
import { loadConfig } from "../../src/utils/config.mjs";

const mockRmSync = vi.mocked(rmSync);
const mockLoadSpending = vi.mocked(loadSpending);
const mockLoadConfig = vi.mocked(loadConfig);

const defaultState = {
  version: 1 as const,
  sessionId: "omp-test",
  sessionPremiumRequests: 12,
  month: "2025-04",
  monthlyPremiumRequests: 234,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockLoadSpending.mockReturnValue(defaultState);
  mockLoadConfig.mockReturnValue({});
});

describe("spending skill", () => {
  describe("status (default)", () => {
    it("shows session and monthly request counts", async () => {
      const { activate } = await import("../../src/skills/spending.mjs");
      const result = await activate({ trigger: "spending:", args: ["status"] });
      expect(result.status).toBe("ok");
      expect(result.message).toContain("12");   // session
      expect(result.message).toContain("234");  // monthly
    });

    it("works with no args (defaults to status)", async () => {
      const { activate } = await import("../../src/skills/spending.mjs");
      const result = await activate({ trigger: "spending:", args: [] });
      expect(result.status).toBe("ok");
      expect(result.message).toContain("Session");
      expect(result.message).toContain("Monthly");
    });

    it("uses SpendingConfig from loadConfig for thresholds", async () => {
      // Config (thresholds) comes from loadConfig under "spending" key
      mockLoadConfig.mockReturnValue({ spending: { premiumRequestsIncluded: 1500 } });
      const { activate } = await import("../../src/skills/spending.mjs");
      const result = await activate({ trigger: "spending:", args: ["status"] });
      expect(result.status).toBe("ok");
      expect(result.message).toContain("1500");
    });

    it("includes warning indicator when near threshold", async () => {
      mockLoadConfig.mockReturnValue({ spending: { premiumRequestsIncluded: 300, warningThresholdPct: 80 } });
      // 234/300 = 78% which is under 80%, no warning
      mockLoadSpending.mockReturnValue({ ...defaultState, monthlyPremiumRequests: 250 });
      const { activate } = await import("../../src/skills/spending.mjs");
      const result = await activate({ trigger: "spending:", args: ["status"] });
      // 250/300 = 83% — over 80% threshold → should show warning
      expect(result.message).toContain("⚠️");
    });

    it("shows plan tier from config", async () => {
      mockLoadConfig.mockReturnValue({ spending: { plan: "pro_plus" } });
      const { activate } = await import("../../src/skills/spending.mjs");
      const result = await activate({ trigger: "spending:", args: ["status"] });
      expect(result.message).toContain("pro_plus");
    });

    it("uses SpendingState (counts) from loadSpending — not from config", async () => {
      // State (counts) comes from tracker, not config
      mockLoadSpending.mockReturnValue({ ...defaultState, sessionPremiumRequests: 99, monthlyPremiumRequests: 999 });
      const { activate } = await import("../../src/skills/spending.mjs");
      const result = await activate({ trigger: "spending:", args: ["status"] });
      expect(result.message).toContain("99");
      expect(result.message).toContain("999");
      expect(mockLoadSpending).toHaveBeenCalled();
    });
  });

  describe("reset", () => {
    it("removes the spending state file", async () => {
      const { activate } = await import("../../src/skills/spending.mjs");
      const result = await activate({ trigger: "spending:", args: ["reset"] });
      expect(result.status).toBe("ok");
      expect(mockRmSync).toHaveBeenCalledWith(
        expect.stringContaining("spending-monthly.json"),
        { force: true }
      );
    });

    it("returns success message", async () => {
      const { activate } = await import("../../src/skills/spending.mjs");
      const result = await activate({ trigger: "spending:", args: ["reset"] });
      expect(result.message).toContain("reset");
    });
  });

  describe("unknown action", () => {
    it("returns usage error", async () => {
      const { activate } = await import("../../src/skills/spending.mjs");
      const result = await activate({ trigger: "spending:", args: ["unknown"] });
      expect(result.status).toBe("error");
      expect(result.message).toContain("Usage");
    });
  });

  describe("error handling", () => {
    it("returns error when loadSpending throws", async () => {
      mockLoadSpending.mockImplementation(() => { throw new Error("disk error"); });
      const { activate } = await import("../../src/skills/spending.mjs");
      const result = await activate({ trigger: "spending:", args: ["status"] });
      expect(result.status).toBe("error");
      expect(result.message).toContain("disk error");
    });
  });

  describe("deactivate", () => {
    it("does not throw", async () => {
      const { deactivate } = await import("../../src/skills/spending.mjs");
      expect(() => deactivate()).not.toThrow();
    });
  });
});
