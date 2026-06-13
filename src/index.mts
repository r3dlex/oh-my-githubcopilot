/**
 * omp CLI companion tool
 * Entry point: bin/omp.mjs
 *
 * Subcommands:
 *   omp hud             — print current HUD line
 *   omp doctor          — check installation and stale agent references
 *   omp version         — show OMP version
 *   omp psm             — shorthand for PSM commands
 *   omp bench           — run SWE-bench suite
 *   omp hook            — execute a packaged hook from stdin
 *   omp verify          — evidence-based completion check via verifier agent
 *   omp cancel          — end active execution modes and clear .omp/state/
 *   omp help            — print skill catalog and command discovery
 *   omp code-review     — trigger code-reviewer agent lane
 *   omp security-review — trigger security-reviewer agent lane
 *   omp ultraqa         — QA cycle loop with qa-tester agent
 *   omp ultragoal       — manage durable goal ledger in .omp/ultragoal/
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
    case "doctor": {
      const { runDoctor } = await import("./cli/doctor.mts");
      const warnings = runDoctor(process.cwd());
      process.exitCode = warnings > 0 ? 1 : 0;
      break;
    }
    case "verify":
      await runSkillSubcommand("verify", positionals.slice(1));
      break;
    case "cancel":
      await runCancel();
      break;
    case "help":
      await runHelp();
      break;
    case "code-review":
      await runSkillSubcommand("code-review", positionals.slice(1));
      break;
    case "security-review":
      await runSkillSubcommand("security-review", positionals.slice(1));
      break;
    case "ultraqa":
      await runSkillSubcommand("ultraqa", positionals.slice(1));
      break;
    case "ultragoal":
      await runUltragoal(positionals.slice(1));
      break;
    default:
      console.error(`Unknown subcommand: ${resolvedSubcommand}`);
      printUsage(true);
      process.exit(1);
  }
}

function printUsage(stderr = false) {
  const output = stderr ? console.error : console.log;
  output("Usage: omp [hud|install|doctor|version|psm|bench|hook|verify|cancel|help|code-review|security-review|ultraqa|ultragoal] [--watch]");
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
  await runHookMain(processHook, { failOpenDecision: true, hookName: "keyword-detector" });
}

async function runBench(_args: string[]) {
  console.log("SWE-bench requires Node.js subprocess with Python evaluation harness.");
  console.log("Usage: /omp:swe-bench --suite lite --compare baseline");
}

/**
 * Generic skill subcommand runner — dynamically imports the skill module and
 * calls activate(). Sets process.exitCode = 1 on error.
 */
async function runSkillSubcommand(id: string, args: string[]) {
  try {
    const mod = await import(`./skills/${id}.mts`);
    const result = await mod.activate({ trigger: id, args });
    if (result.status === "error") process.exitCode = 1;
  } catch (err) {
    console.error(`Failed to run skill ${id}:`, err);
    process.exitCode = 1;
  }
}

async function runCancel() {
  try {
    const { rmSync, existsSync } = await import("fs");
    const { join } = await import("path");
    const statePath = join(process.cwd(), ".omp", "state");
    if (existsSync(statePath)) {
      rmSync(statePath, { recursive: true, force: true });
      console.log("OMP: active session cancelled. .omp/state/ cleared.");
    } else {
      console.log("OMP: no active session state found. Nothing to cancel.");
    }
  } catch (err) {
    console.error("OMP cancel failed:", err);
    process.exitCode = 1;
  }
}

async function runHelp() {
  try {
    const { SKILL_REGISTRY } = await import("./extension/registry.mts");
    console.log("OMP Skills Catalog\n");
    console.log("  ID                           Description");
    console.log("  " + "-".repeat(70));
    for (const skill of SKILL_REGISTRY) {
      const id = skill.id.padEnd(30);
      console.log(`  ${id} ${skill.description}`);
    }
    console.log(`\nTotal: ${SKILL_REGISTRY.length} skills`);
    console.log("\nUsage: /omp:<skill-id> [args]");
  } catch (err) {
    console.error("OMP help failed:", err);
    process.exitCode = 1;
  }
}

async function runUltragoal(args: string[]) {
  try {
    const { mkdirSync, readFileSync, writeFileSync, existsSync } = await import("fs");
    const { join } = await import("path");
    const goalDir = join(process.cwd(), ".omp", "ultragoal");
    const goalsPath = join(goalDir, "goals.json");
    mkdirSync(goalDir, { recursive: true });
    let goals: Array<{ id: number; goal: string; status: string; createdAt: string }> = [];
    if (existsSync(goalsPath)) {
      goals = JSON.parse(readFileSync(goalsPath, "utf-8"));
    }
    if (args.length > 0) {
      const newGoal = { id: goals.length + 1, goal: args.join(" "), status: "active", createdAt: new Date().toISOString() };
      goals.push(newGoal);
      writeFileSync(goalsPath, JSON.stringify(goals, null, 2));
      console.log(`OMP UltraGoal: added goal #${newGoal.id}: "${newGoal.goal}"`);
    } else {
      if (goals.length === 0) {
        console.log("OMP UltraGoal: no goals set. Use: omp ultragoal <goal description>");
      } else {
        console.log("OMP UltraGoal — Current Goals:\n");
        for (const g of goals) {
          console.log(`  #${g.id} [${g.status}] ${g.goal}`);
        }
      }
    }
  } catch (err) {
    console.error("OMP ultragoal failed:", err);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
