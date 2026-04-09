/**
 * setup skill
 *
 * Orchestrates both phases of the OMP setup wizard:
 *   Phase 1: Base OMP setup (SQLite DB, directory structure, first-run guidance)
 *   Phase 2: MCP server configuration
 *
 * Invoked via `/setup` or `setup:` keyword.
 * For MCP-only setup, use the `mcp-setup` skill instead.
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

  const isNonInteractive = input.args.includes("--non-interactive");
  const isMcpOnly = input.args.includes("--mcp-only");
  const isSkipMcp = input.args.includes("--skip-mcp");

  const baseArgs = ["bin/omp.mjs", "setup"];
  if (isMcpOnly) baseArgs.push("--mcp-only");
  if (isSkipMcp) baseArgs.push("--skip-mcp");
  if (isNonInteractive) baseArgs.push("--non-interactive");

  return new Promise((resolve) => {
    const child = spawn("node", baseArgs, { stdio: "inherit" });

    child.on("close", (code) => {
      if (code === 0) {
        resolve({ status: "ok", message: "OMP setup complete." });
      } else {
        resolve({ status: "error", message: `Setup exited with code ${code}` });
      }
    });

    child.on("error", (err) => {
      resolve({ status: "error", message: `Failed to spawn omp setup: ${err.message}` });
    });
  });
}

// Standalone entry point
const input: SkillInput = JSON.parse(await readStdin());
const output = await activate(input);
console.log(JSON.stringify(output));

async function readStdin(): Promise<string> {
  const chunks: string[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return chunks.join("");
}
