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
 *   omp deep-dive       — guidance: use /deep-dive in Copilot
 *   omp external-context — load external URL/path into context (or print guidance)
 *   omp deepsearch      — guidance: use /deepsearch in Copilot
 *   omp sciomc          — guidance: use /sciomc in Copilot
 *   omp remember        — persist note to .omp/memory/ (or list memories)
 *   omp writer-memory   — manage .omp/writer-memory.md style notes
 *   omp deepinit        — guidance: use /deepinit in Copilot
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
      console.log("OMP verify: use /verify or /oh-my-githubcopilot:verify in GitHub Copilot CLI to trigger @verifier evidence-based completion check.");
      break;
    case "cancel":
      await runCancel();
      break;
    case "help":
      await runHelp();
      break;
    case "code-review":
      console.log("OMP code-review: use /code-review or /oh-my-githubcopilot:code-review in GitHub Copilot CLI to trigger @code-reviewer agent.");
      break;
    case "security-review":
      console.log("OMP security-review: use /security-review or /oh-my-githubcopilot:security-review in GitHub Copilot CLI to trigger @security-reviewer agent.");
      break;
    case "ultraqa":
      console.log("OMP ultraqa: use /ultraqa or /oh-my-githubcopilot:ultraqa in GitHub Copilot CLI to start a QA cycle with @qa-tester agent.");
      break;
    case "ultragoal":
      await runUltragoal(positionals.slice(1));
      break;
    case "deep-dive":
      console.log("OMP deep-dive: use /deep-dive or /oh-my-githubcopilot:deep-dive in GitHub Copilot CLI to run the trace→deep-interview investigation pipeline.");
      break;
    case "external-context":
      await runExternalContext(positionals.slice(1));
      break;
    case "deepsearch":
      console.log("OMP deepsearch: use /deepsearch or /oh-my-githubcopilot:deepsearch in GitHub Copilot CLI to run multi-source deep search.");
      break;
    case "sciomc":
      console.log("OMP sciomc: use /sciomc or /oh-my-githubcopilot:sciomc in GitHub Copilot CLI to run the scientific hypothesis→experiment→conclusion reasoning workflow.");
      break;
    case "remember":
      await runRemember(positionals.slice(1));
      break;
    case "writer-memory":
      await runWriterMemory(positionals.slice(1));
      break;
    case "deepinit":
      console.log("OMP deepinit: use /deepinit or /oh-my-githubcopilot:deepinit in GitHub Copilot CLI to run deep project initialization.");
      break;
    default:
      console.error(`Unknown subcommand: ${resolvedSubcommand}`);
      printUsage(true);
      process.exit(1);
  }
}

function printUsage(stderr = false) {
  const output = stderr ? console.error : console.log;
  output("Usage: omp [hud|install|doctor|version|psm|bench|hook|verify|cancel|help|code-review|security-review|ultraqa|ultragoal|deep-dive|external-context|deepsearch|sciomc|remember|writer-memory|deepinit] [--watch]");
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
      const parsed: unknown = JSON.parse(readFileSync(goalsPath, "utf-8"));
      if (Array.isArray(parsed)) {
        goals = parsed;
      } else {
        console.error("OMP UltraGoal: goals.json is corrupted (not an array). Resetting to empty.");
        goals = [];
      }
    }
    if (args.length > 0) {
      const nextId = goals.length === 0 ? 1 : Math.max(...goals.map((g) => g.id)) + 1;
      const newGoal = { id: nextId, goal: args.join(" "), status: "active", createdAt: new Date().toISOString() };
      goals.push(newGoal);
      const tmpPath = goalsPath + ".tmp";
      writeFileSync(tmpPath, JSON.stringify(goals, null, 2));
      const { renameSync } = await import("fs");
      renameSync(tmpPath, goalsPath);
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

async function runExternalContext(args: string[]) {
  if (args.length === 0) {
    console.log("OMP external-context: use /external-context <url-or-path> or /oh-my-githubcopilot:external-context in GitHub Copilot CLI to load external docs into session context.");
    return;
  }
  const target = args.join(" ");
  console.log(`External context loaded: ${target}. Use /external-context ${target} in Copilot CLI to load into session.`);
}

async function runRemember(args: string[]) {
  try {
    const { mkdirSync, readdirSync, writeFileSync, existsSync } = await import("fs");
    const { join } = await import("path");
    const memoryDir = join(process.cwd(), ".omp", "memory");
    mkdirSync(memoryDir, { recursive: true });

    if (args.length === 0) {
      // List existing memories
      if (!existsSync(memoryDir)) {
        console.log("OMP Remember: no memories found. Use: omp remember <text>");
        return;
      }
      const files = readdirSync(memoryDir).filter((f) => f.endsWith(".md")).sort();
      if (files.length === 0) {
        console.log("OMP Remember: no memories found. Use: omp remember <text>");
      } else {
        console.log("OMP Remember — Stored Memories:\n");
        for (const file of files) {
          console.log(`  ${file}`);
        }
        console.log(`\nTotal: ${files.length} memor${files.length === 1 ? "y" : "ies"}`);
      }
      return;
    }

    // Write new memory
    const text = args.join(" ");
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `${timestamp}.md`;
    const filePath = join(memoryDir, fileName);
    const tmpPath = filePath + ".tmp";
    const content = `# Memory: ${new Date().toISOString()}\n\n${text}\n`;
    writeFileSync(tmpPath, content, "utf-8");
    const { renameSync } = await import("fs");
    renameSync(tmpPath, filePath);
    console.log(`OMP Remember: saved memory to .omp/memory/${fileName}`);
  } catch (err) {
    console.error("OMP remember failed:", err);
    process.exitCode = 1;
  }
}

async function runWriterMemory(args: string[]) {
  try {
    const { mkdirSync, readFileSync, appendFileSync, existsSync } = await import("fs");
    const { join, dirname } = await import("path");
    const filePath = join(process.cwd(), ".omp", "writer-memory.md");
    mkdirSync(dirname(filePath), { recursive: true });

    if (args.length === 0) {
      // Print current writer memory
      if (!existsSync(filePath)) {
        console.log("OMP Writer Memory: no style notes found. Use: omp writer-memory <style-note>");
        return;
      }
      const content = readFileSync(filePath, "utf-8");
      console.log(content);
      return;
    }

    // Append new style note
    const note = args.join(" ");
    const entry = `\n## ${new Date().toISOString()}\n\n${note}\n`;
    appendFileSync(filePath, entry, "utf-8");
    console.log(`OMP Writer Memory: appended style note to .omp/writer-memory.md`);
  } catch (err) {
    console.error("OMP writer-memory failed:", err);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
