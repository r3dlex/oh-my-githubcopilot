/**
 * ai-slop-cleaner skill
 *
 * ID:       ai-slop-cleaner
 * Keywords: deslop, /omp:ai-slop-cleaner, anti-slop
 * Tier:     cleanup pass
 *
 * Regression-safe, deletion-first cleanup of AI-generated code slop.
 * Optional --review mode for writer/code-reviewer separation.
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
  const baseArgs = ["bin/omp.mjs", "ai-slop-cleaner", ...input.args];
  return new Promise((resolve) => {
    const child = spawn("node", baseArgs, { stdio: "inherit" });
    child.on("close", (code) => {
      resolve({ status: code === 0 ? "ok" : "error", message: `ai-slop-cleaner exited with code ${code}` });
    });
    child.on("error", (err) => resolve({ status: "error", message: `Failed to spawn: ${err.message}` }));
  });
}

export function deactivate(): void {
  // No persistent resources to clean up
}
