/**
 * setup skill
 *
 * ID:       setup
 * Keywords: setup:, /setup, /omp:setup
 * Tier:     developer tool
 *
 * Orchestrates the OMP setup wizard through the one spawn seam:
 *   Phase 1: Base OMP setup (directory structure, first-run guidance)
 *   Phase 2: MCP server configuration
 */

import { join } from "path";
import {
  resolvePackageRoot,
  runSkill,
  type SkillInput,
  type SkillOutput,
} from "./spawn-skill.mts";

export type { SkillInput, SkillOutput } from "./spawn-skill.mts";

const REQUIRED_COPILOT_EXPERIMENTAL_FEATURES = [
  "STATUS_LINE",
  "SHOW_FILE",
  "EXTENSIONS",
  "BACKGROUND_SESSIONS",
  "CONFIGURE_COPILOT_AGENT",
  "MULTI_TURN_AGENTS",
  "SESSION_STORE",
] as const;

export async function activate(input: SkillInput): Promise<SkillOutput> {
  return runSkill("setup", input.args, {
    env: {
      OMP_COPILOT_REQUIRED_EXPERIMENTAL_FEATURES:
        process.env["OMP_COPILOT_REQUIRED_EXPERIMENTAL_FEATURES"] ??
        REQUIRED_COPILOT_EXPERIMENTAL_FEATURES.join(","),
      OMP_COPILOT_STATUS_LINE_COMMAND:
        process.env["OMP_COPILOT_STATUS_LINE_COMMAND"] ??
        join(resolvePackageRoot(), "bin", "omp-statusline.sh"),
    },
  });
}

export function deactivate(): void {
  // No persistent resources to clean up
}