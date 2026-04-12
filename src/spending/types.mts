/**
 * Spending tracking types for OMP.
 * Tracks premium API requests per session and per month.
 */

export type PlanTier = "free" | "pro" | "pro_plus" | "business" | "enterprise";

export interface SpendingConfig {
  plan: PlanTier;
  premiumRequestsIncluded: number;  // e.g. 1500 for pro_plus
  warningThresholdPct: number;       // e.g. 80
  requestUnit: "delegation";         // always "delegation" — one per omp_delegate_task call
}

export interface SpendingState {
  version: 1;
  sessionId: string;
  sessionPremiumRequests: number;    // resets when sessionId changes
  month: string;                     // "YYYY-MM"
  monthlyPremiumRequests: number;    // accumulates across sessions, resets on month change
}
