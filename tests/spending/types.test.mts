/**
 * Spending Types Unit Tests
 * Validates the exported type shapes from spending/types.mts
 */

import { describe, it, expect } from "vitest";
import type {
  PlanTier,
  SpendingConfig,
  SpendingState,
} from "../../src/spending/types.mts";

describe("spending types", () => {
  it("SpendingConfig accepts valid plan tiers", () => {
    const tiers: PlanTier[] = ["free", "pro", "pro_plus", "business", "enterprise"];
    for (const plan of tiers) {
      const config: SpendingConfig = {
        plan,
        premiumRequestsIncluded: 1500,
        warningThresholdPct: 80,
        requestUnit: "delegation",
      };
      expect(config.plan).toBe(plan);
    }
  });

  it("SpendingConfig has correct shape", () => {
    const config: SpendingConfig = {
      plan: "pro_plus",
      premiumRequestsIncluded: 1500,
      warningThresholdPct: 80,
      requestUnit: "delegation",
    };
    expect(config.requestUnit).toBe("delegation");
    expect(config.premiumRequestsIncluded).toBe(1500);
    expect(config.warningThresholdPct).toBe(80);
  });

  it("SpendingState has correct shape", () => {
    const state: SpendingState = {
      version: 1,
      sessionId: "sess-abc",
      sessionPremiumRequests: 5,
      month: "2024-06",
      monthlyPremiumRequests: 42,
    };
    expect(state.version).toBe(1);
    expect(state.sessionId).toBe("sess-abc");
    expect(state.month).toMatch(/^\d{4}-\d{2}$/);
  });
});
