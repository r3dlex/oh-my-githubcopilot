/**
 * omp CLI companion tool
 * Entry point: bin/omp.mjs
 *
 * Subcommands:
 *   omp hud        — print current HUD line
 *   omp version    — show OMP version
 *   omp psm        — shorthand for PSM commands
 *   omp bench      — run SWE-bench suite
 *   omp hook       — execute a packaged hook from stdin
 */

import { parseArgs } from "util";
import { createRequire } from "module";
import { maybeCheckAndPromptUpdate } from "./cli/update.mts";
const _require = createRequire(import.meta.url);
const { version: PKG_VERSION, name: PKG_NAME } = _require("../package.json") as { version: string; name: string };

const { positionals, values: flags } = parseArgs({
  args: process.argv.slice(2),
  options: {
    help: { type: "boolean", default: false },
    version: { type: "boolean", default: false },
    watch: { type: "boolean", default: false },
  },
  allowPositionals: true,
});

const subcommand = positionals[0] || "hud";
const resolvedSubcommand = flags.version && !positionals[0] ? "version" : subcommand;

async function main() {
  if (flags.help) {
    printUsage();
    return;
  }

  await maybeCheckAndPromptUpdate({
    cwd: process.cwd(),
    packageName: PKG_NAME,
    currentVersion: PKG_VERSION,
    subcommand: resolvedSubcommand,
    flags: {
      help: flags.help,
      version: flags.version,
    },
  });

  switch (resolvedSubcommand) {
    case "hud":
      if (flags.watch) {
        const { runHudWatch } = await import("./hud/watch.mts");
        runHudWatch();
      } else {
        await printHud();
      }
      break;
    case "version":
      console.log(`${PKG_NAME} v${PKG_VERSION}`);
      break;
    case "psm":
      await runPsm(positionals.slice(1));
      break;
    case "bench":
      await runBench(positionals.slice(1));
      break;
    case "hook":
      await runHook(positionals.slice(1));
      break;
    case "install": {
      const { runInstall } = await import("./cli/install.mts");
      await runInstall();
      break;
    }
    default:
      console.error(`Unknown subcommand: ${resolvedSubcommand}`);
      printUsage(true);
      process.exit(1);
  }
}

function printUsage(stderr = false) {
  const output = stderr ? console.error : console.log;
  output("Usage: omp [hud|install|version|psm|bench|hook] [--watch]");
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
    console.log(`OMP v${PKG_VERSION} | hud: no active session`);
  }
}

async function runPsm(_args: string[]) {
  // Delegate to PSM skill — just print guidance
  console.log("PSM commands:");
  console.log("  /omp:psm create <name>   Create isolated worktree session");
  console.log("  /omp:psm list           List active sessions");
  console.log("  /omp:psm switch <name>  Switch to session");
  console.log("  /omp:psm destroy <name> Destroy session");
}

async function runHook(args: string[]) {
  const hookId = args[0];
  if (hookId !== "keyword-detector") {
    console.error("Usage: omp hook keyword-detector");
    process.exit(1);
  }

  // Fail-open: any stdin/parse/processing failure still emits valid JSON and exits 0.
  const { processHook } = await import("./hooks/keyword-detector.mts");
  const { runHookMain } = await import("./hooks/runner.mts");
  await runHookMain(processHook, { failOpenDecision: true });
}

async function runBench(_args: string[]) {
  console.log("SWE-bench requires Node.js subprocess with Python evaluation harness.");
  console.log("Usage: /omp:swe-bench --suite lite --compare baseline");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
