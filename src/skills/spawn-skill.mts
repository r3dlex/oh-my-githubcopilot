/**
 * spawn-skill — the one seam for skill activation that delegates to the omp CLI.
 *
 * Replaces the 53 boilerplate src/skills/<id>.mts modules deleted by goal
 * githubcopilot-skill-spawn-seam. Those modules were byte-identical
 * pass-through scaffolding whose activate() spawned `node bin/omp.mjs <id>`
 * with a cwd-relative path (broken whenever cwd != the package root) and with
 * no omp CLI case for 30 of the ids ("Unknown subcommand", exit 1).
 *
 * The real skill surface is skills/<id>/SKILL.md (plugin.json), loaded by
 * src/utils/skill-loader.mts — see .archgate/adrs/ARCH-002-plugin-architecture.md.
 * Skills that delegate to the CLI do it through runSkill() here, and every
 * src/skills module shares the SkillInput/SkillOutput contract from here.
 */

import { spawn } from "child_process";
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

/**
 * Package root of the running module. Source (src/skills/*.mts) and the
 * committed bundles (dist/skills/*.mjs) both sit two levels below the
 * package root, so one resolution serves both.
 */
export function resolvePackageRoot(): string {
  return join(dirname(fileURLToPath(import.meta.url)), "..", "..");
}

/**
 * Real bin/omp.mjs path, resolved relative to the running module's package
 * root — never process.cwd() (the bug the boilerplate modules shipped with).
 */
export function resolveBinPath(): string {
  return join(resolvePackageRoot(), "bin", "omp.mjs");
}

export interface RunSkillOptions {
  /** Extra environment variables, merged over process.env for the child. */
  env?: NodeJS.ProcessEnv;
}

/**
 * Spawn the real omp CLI for a skill: node <bin> <id> <args...>, with cwd
 * pinned to the package root. Exit code 0 maps to "ok", anything else to
 * "error"; the child's stdout/stderr becomes the SkillOutput message so the
 * outcome is the CLI's real one, never an invented one.
 */
export async function runSkill(
  id: string,
  args: string[] = [],
  options: RunSkillOptions = {}
): Promise<SkillOutput> {
  const binPath = resolveBinPath();
  try {
    const child = spawn(process.execPath, [binPath, id, ...args], {
      cwd: resolvePackageRoot(),
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, ...options.env },
    });

    const output = await new Promise<{ code: number; stdout: string; stderr: string }>((resolve) => {
      let stdout = "";
      let stderr = "";
      child.stdout?.on("data", (chunk: Buffer) => {
        stdout += chunk;
      });
      child.stderr?.on("data", (chunk: Buffer) => {
        stderr += chunk;
      });
      child.on("close", (code) => resolve({ code: code ?? 1, stdout, stderr }));
      child.on("error", (err) => resolve({ code: 1, stdout, stderr: `${stderr}${err.message}`.trim() }));
    });

    const text = [output.stdout, output.stderr].map((s) => s.trim()).filter(Boolean).join("\n");
    return {
      status: output.code === 0 ? "ok" : "error",
      message: text !== "" ? text : `omp ${id} exited with code ${output.code}`,
    };
  } catch (err) {
    return {
      status: "error",
      message: `Failed to spawn omp ${id}: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}