/**
 * swe-bench skill
 *
 * ID:       swe-bench
 * Keywords: swe-bench:, /swe-bench
 * Tier:     developer tool
 *
 * SWE-bench integration for OMP — run and evaluate SWE-bench test cases.
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
  const baseArgs = ["bin/omp.mjs", "swe-bench", ...input.args];
  return new Promise((resolve) => {
    const child = spawn("node", baseArgs, { stdio: "inherit" });
    child.on("close", (code) => {
      resolve({ status: code === 0 ? "ok" : "error", message: `SWE-bench exited with code ${code}` });
    });
    child.on("error", (err) => resolve({ status: "error", message: `Failed to spawn: ${err.message}` }));
  });
}

export function deactivate(): void {
  // No persistent resources to clean up
}
