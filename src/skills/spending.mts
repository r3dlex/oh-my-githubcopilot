/**
 * spending skill
 *
 * ID:       spending
 * Keywords: spending:, /spending
 * Tier:     developer tool
 *
 * Inspect and manage OMP premium request usage.
 *
 * Dual sourcing (explicit separation):
 *   - SpendingConfig (plan tier, thresholds) → loadConfig<SpendingConfig>("spending")
 *     Reads from shared .omp/config.json under the "spending" key.
 *   - SpendingState (request counts) → loadSpending() from src/spending/tracker.mts
 *     Reads from ~/.omp/state/spending-monthly.json (persisted across sessions).
 */

import { rmSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { loadConfig } from "../utils/config.mjs";
import { loadSpending } from "../spending/tracker.mjs";
import type { SpendingConfig } from "../spending/types.mjs";

export interface SkillInput {
  trigger: string;
  args: string[];
}

export interface SkillOutput {
  status: "ok" | "error";
  message: string;
}

const SPENDING_STATE_PATH = join(homedir(), ".omp", "state", "spending-monthly.json");

const DEFAULT_CONFIG: SpendingConfig = {
  plan: "pro",
  premiumRequestsIncluded: 300,
  warningThresholdPct: 80,
  requestUnit: "delegation",
};

function getConfig(): SpendingConfig {
  // SpendingConfig (thresholds/plan tier) from shared .omp/config.json under "spending" key
  const fromFile = loadConfig<{ spending: SpendingConfig }>("spending")?.spending;
  return { ...DEFAULT_CONFIG, ...fromFile };
}

function getSessionId(): string {
  // Copilot CLI sets COPILOT_SESSION_ID in the hook environment; fall back to timestamp
  return process.env["COPILOT_SESSION_ID"] ?? `omp-${Date.now()}`;
}

export async function activate(input: SkillInput): Promise<SkillOutput> {
  const [action] = input.args;

  try {
    switch (action) {
      case "status":
      case undefined: {
        // SpendingState (counts) from tracker — persisted to ~/.omp/state/spending-monthly.json
        const state = loadSpending(getSessionId());
        const config = getConfig();
        const warningAt = Math.floor(config.premiumRequestsIncluded * (config.warningThresholdPct / 100));
        const pct = config.premiumRequestsIncluded > 0
          ? Math.round((state.monthlyPremiumRequests / config.premiumRequestsIncluded) * 100)
          : 0;
        const warning = state.monthlyPremiumRequests >= warningAt ? " ⚠️" : "";

        return {
          status: "ok",
          message: [
            `Spending status (${state.month}):`,
            `  Session:  ${state.sessionPremiumRequests} requests`,
            `  Monthly:  ${state.monthlyPremiumRequests} / ${config.premiumRequestsIncluded} (${pct}%)${warning}`,
            `  Plan:     ${config.plan}`,
          ].join("\n"),
        };
      }

      case "reset": {
        // Remove the spending state file — tracker will reinitialize on next access
        rmSync(SPENDING_STATE_PATH, { force: true });
        return { status: "ok", message: "Monthly spending counter reset." };
      }

      default:
        return {
          status: "error",
          message: "Usage: spending: <status|reset>",
        };
    }
  } catch (err) {
    return {
      status: "error",
      message: err instanceof Error ? err.message : String(err),
    };
  }
}

export function deactivate(): void {
  // No persistent resources to clean up
}
