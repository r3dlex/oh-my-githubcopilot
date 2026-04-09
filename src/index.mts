/**
 * omp CLI companion tool
 * Entry point: bin/omp.mjs
 *
 * Subcommands:
 *   omp hud        — print current HUD line
 *   omp version    — show OMP version
 *   omp psm        — shorthand for PSM commands
 *   omp bench      — run SWE-bench suite
 */

import { parseArgs } from "util";

const { positionals } = parseArgs({
  args: process.argv.slice(2),
  options: {
    help: { type: "boolean", default: false },
    version: { type: "boolean", default: false },
  },
  allowPositionals: true,
});

const subcommand = positionals[0] || "hud";

async function main() {
  switch (subcommand) {
    case "hud":
      await printHud();
      break;
    case "version":
      console.log("oh-my-copilot v1.0.0");
      break;
    case "psm":
      await runPsm(positionals.slice(1));
      break;
    case "bench":
      await runBench(positionals.slice(1));
      break;
    default:
      console.error(`Unknown subcommand: ${subcommand}`);
      console.error("Usage: omp [hud|version|psm|bench]");
      process.exit(1);
  }
}

async function printHud() {
  try {
    const { readFileSync } = await import("fs");
    const { join } = await import("path");
    const { homedir } = await import("os");
    const hudPath = join(homedir(), ".omp", "hud.line");
    const line = readFileSync(hudPath, "utf-8").trim();
    console.log(line);
  } catch {
    console.log("OMP v1.0.0 | hud: no active session");
  }
}

async function runPsm(_args: string[]) {
  // Delegate to PSM skill — just print guidance
  console.log("PSM commands:");
  console.log("  /oh-my-copilot:psm create <name>   Create isolated worktree session");
  console.log("  /oh-my-copilot:psm list           List active sessions");
  console.log("  /oh-my-copilot:psm switch <name>  Switch to session");
  console.log("  /oh-my-copilot:psm destroy <name> Destroy session");
}

async function runBench(_args: string[]) {
  console.log("SWE-bench requires Node.js subprocess with Python evaluation harness.");
  console.log("Usage: /oh-my-copilot:swe-bench --suite lite --compare baseline");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
