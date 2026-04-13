/**
 * omp-setup skill
 *
 * ID:       omp-setup
 * Keywords: setup:, /setup, /omp:setup
 * Tier:     developer tool
 *
 * Orchestrates the OMP setup wizard:
 *   Phase 1: Base OMP setup (directory structure, first-run guidance)
 *   Phase 2: MCP server configuration
 */

import { fileURLToPath } from "url";
import { dirname, join } from "path";

export interface SkillInput {
  trigger: string;
  args: string[];
}

export interface SkillOutput {
  status: "ok" | "error";
  message: string;
}

const REQUIRED_COPILOT_EXPERIMENTAL_FEATURES = [
  "STATUS_LINE",
  "SHOW_FILE",
  "EXTENSIONS",
  "BACKGROUND_SESSIONS",
  "CONFIGURE_COPILOT_AGENT",
  "MULTI_TURN_AGENTS",
  "SESSION_STORE",
] as const;

function getPackageRoot(): string {
  return join(dirname(fileURLToPath(import.meta.url)), "..", "..");
}

export async function activate(input: SkillInput): Promise<SkillOutput> {
  const { spawn } = await import("child_process");
  const packageRoot = getPackageRoot();
  const baseArgs = ["bin/omp.mjs", "setup", ...input.args];
  return new Promise((resolve) => {
    const child = spawn("node", baseArgs, {
      cwd: packageRoot,
      stdio: "inherit",
      env: {
        ...process.env,
        OMP_COPILOT_REQUIRED_EXPERIMENTAL_FEATURES:
          process.env["OMP_COPILOT_REQUIRED_EXPERIMENTAL_FEATURES"] ??
          REQUIRED_COPILOT_EXPERIMENTAL_FEATURES.join(","),
        OMP_COPILOT_STATUS_LINE_COMMAND:
          process.env["OMP_COPILOT_STATUS_LINE_COMMAND"] ??
          join(packageRoot, "bin", "omp-statusline.sh"),
      },
    });
    child.on("close", (code) => {
      resolve({ status: code === 0 ? "ok" : "error", message: `Setup exited with code ${code}` });
    });
    child.on("error", (err) => resolve({ status: "error", message: `Failed to spawn: ${err.message}` }));
  });
}

export function deactivate(): void {
  // No persistent resources to clean up
}
