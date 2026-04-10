/**
 * configure-notifications skill
 *
 * ID:       configure-notifications
 * Keywords: configure-notifications:, /configure-notifications
 * Tier:     developer tool
 *
 * Configure notification integrations: Telegram, Discord, Slack.
 */

export interface SkillInput {
  trigger: string;
  args: string[];
}

export interface SkillOutput {
  status: "ok" | "error";
  message: string;
}

export async function activate(input: SkillInput): Promise<SkillOutput> {
  const { spawn } = await import("child_process");
  const baseArgs = ["bin/omp.mjs", "configure-notifications", ...input.args];
  return new Promise((resolve) => {
    const child = spawn("node", baseArgs, { stdio: "inherit" });
    child.on("close", (code) => {
      resolve({ status: code === 0 ? "ok" : "error", message: `Configure notifications exited with code ${code}` });
    });
    child.on("error", (err) => resolve({ status: "error", message: `Failed to spawn: ${err.message}` }));
  });
}

export function deactivate(): void {
  // No persistent resources to clean up
}
