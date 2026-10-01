/**
 * MCP Setup Skill
 *
 * ID:       mcp-setup
 * Keywords: mcp-setup:, /mcp
 * Phase:    MCP configuration only (Phase 2)
 *
 * This skill is lazy-loaded — it is not loaded until triggered.
 */

import { runSkill } from "./spawn-skill.mts";

export type { SkillInput, SkillOutput } from "./spawn-skill.mts";

export interface McpSetupSkillInput {
  args?: string[];
}

export interface McpSetupSkillOutput {
  status: "ok" | "error";
  message: string;
  hud?: string;
}

/**
 * Activate the MCP configuration phase.
 * Uses --mcp-only --non-interactive for programmatic invocation,
 * or interactive mode if no args provided.
 */
export async function activateMcpSetupSkill(
  input?: McpSetupSkillInput
): Promise<McpSetupSkillOutput> {
  const args = input?.args ?? [];

  // Detect interactive vs programmatic mode
  const isInteractive = args.includes("--interactive") || args.length === 0;

  const spawnArgs = ["setup", "--mcp-only"];
  if (!isInteractive) {
    spawnArgs.push("--non-interactive");
  }
  // Pass through any other args
  for (const arg of args) {
    if (arg !== "--interactive" && !spawnArgs.includes(arg)) {
      spawnArgs.push(arg);
    }
  }

  return runSkill("setup", spawnArgs);
}
