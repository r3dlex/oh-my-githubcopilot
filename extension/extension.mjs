/**
 * OMP companion extension for GitHub Copilot CLI (>= 1.0.60).
 *
 * Registers every OMP skill as a native slash command and the "omp-hud"
 * canvas via the Copilot SDK extension API (SPEC-omp-2.0 §4 + §5,
 * ADR-0002). Runs standalone inside the Copilot extension process — no
 * tsx/build step — so it carries a self-contained copy of the skill
 * registry and HUD helpers. Keep in sync with src/extension/registry.mts,
 * src/extension/commands.mts, src/extension/hud-canvas.mts, and
 * src/extension/hud-push.mts.
 *
 * Fail-open by design: any failure is logged to stderr and the process
 * exits gracefully so a broken extension never breaks the CLI session.
 * Canvas registration and slash commands fail independently — a broken
 * canvas never takes the commands down, and vice versa.
 */

import { pathToFileURL } from "url";
import { mkdirSync, readFileSync, realpathSync, watch } from "fs";
import { homedir } from "os";
import { join } from "path";

/**
 * Self-contained mirror of buildCommands(SKILL_REGISTRY)
 * (skill ids + aliases expanded). Generated from src/extension/registry.mts;
 * parity is enforced by tests/extension/extension-parity.test.mts.
 * @type {Array<{ name: string, skillId: string, description: string }>}
 */
export const COMMANDS = [
  {
    name: "autopilot",
    skillId: "autopilot",
    description: "Autonomous end-to-end execution from idea to working code",
  },
  {
    name: "ralph",
    skillId: "ralph",
    description: "Persistence loop with architect verification gate",
  },
  {
    name: "ultrawork",
    skillId: "ultrawork",
    description: "Parallel multi-agent high-throughput implementation",
  },
  {
    name: "ulw",
    skillId: "ultrawork",
    description:
      "Alias for /ultrawork — Parallel multi-agent high-throughput implementation",
  },
  {
    name: "team",
    skillId: "team",
    description: "Coordinated N-agent team with staged pipeline",
  },
  {
    name: "ecomode",
    skillId: "ecomode",
    description: "Cost-optimized execution with low-cost model tier",
  },
  {
    name: "eco",
    skillId: "ecomode",
    description:
      "Alias for /ecomode — Cost-optimized execution with low-cost model tier",
  },
  {
    name: "swarm",
    skillId: "swarm",
    description: "Parallel agent swarm for independent subtasks",
  },
  {
    name: "pipeline",
    skillId: "pipeline",
    description: "Sequential stage-based execution pipeline",
  },
  {
    name: "deep-interview",
    skillId: "deep-interview",
    description: "Socratic deep requirements interview with ambiguity gating",
  },
  {
    name: "di",
    skillId: "deep-interview",
    description:
      "Alias for /deep-interview — Socratic deep requirements interview with ambiguity gating",
  },
  {
    name: "omp-plan",
    skillId: "omp-plan",
    description:
      "Strategic planning with interview, direct, consensus, and review modes",
  },
  {
    name: "plan",
    skillId: "omp-plan",
    description:
      "Alias for /omp-plan — Strategic planning with interview, direct, consensus, and review modes",
  },
  {
    name: "omp-setup",
    skillId: "omp-setup",
    description: "OMP onboarding and configuration wizard",
  },
  {
    name: "hud",
    skillId: "hud",
    description: "Display current HUD session state",
  },
  {
    name: "wiki",
    skillId: "wiki",
    description: "Project wiki operations and management",
  },
  {
    name: "learner",
    skillId: "learner",
    description: "Structured learning and knowledge sessions",
  },
  {
    name: "note",
    skillId: "note",
    description: "Session notes and context management",
  },
  {
    name: "trace",
    skillId: "trace",
    description: "Execution tracing and debugging",
  },
  {
    name: "release",
    skillId: "release",
    description: "Guided release workflow and automation",
  },
  {
    name: "configure-notifications",
    skillId: "configure-notifications",
    description: "Configure session notification settings",
  },
  {
    name: "psm",
    skillId: "psm",
    description: "Plugin State Manager operations",
  },
  {
    name: "swe-bench",
    skillId: "swe-bench",
    description: "SWE-bench evaluation harness runner",
  },
  {
    name: "mcp-setup",
    skillId: "mcp-setup",
    description: "MCP server configuration wizard",
  },
  {
    name: "setup",
    skillId: "setup",
    description: "OMP setup and onboarding wizard",
  },
  {
    name: "graphify",
    skillId: "graphify",
    description: "Convert any input to a knowledge graph",
  },
  {
    name: "graphwiki",
    skillId: "graphwiki",
    description: "GraphWiki CLI operations: query, lint, build",
  },
  {
    name: "graph-provider",
    skillId: "graph-provider",
    description: "Manage and configure the active graph provider",
  },
  {
    name: "spending",
    skillId: "spending",
    description: "Track and reset premium request usage",
  },
  {
    name: "ralplan",
    skillId: "ralplan",
    description:
      "Consensus planning gate for vague ralph/autopilot/team requests",
  },
  {
    name: "research",
    skillId: "research",
    description:
      "Research and investigation workflows (investigate, deep dive)",
  },
  {
    name: "omp-doctor",
    skillId: "omp-doctor",
    description: "Diagnose and fix oh-my-githubcopilot installation issues",
  },
  {
    name: "omp-reference",
    skillId: "omp-reference",
    description:
      "OMP agent catalog, tools, routing, commit protocol, and skills registry",
  },
  {
    name: "ai-slop-cleaner",
    skillId: "ai-slop-cleaner",
    description:
      "Clean AI-generated code slop with a regression-safe, deletion-first workflow",
  },
  {
    name: "tdd",
    skillId: "tdd",
    description: "Test-Driven Development with Red-Green-Refactor cycle",
  },
  {
    name: "improve-codebase-architecture",
    skillId: "improve-codebase-architecture",
    description:
      "Deep exploration and architectural improvement via friction detection",
  },
  {
    name: "skillify",
    skillId: "skillify",
    description:
      "Turn a repeatable session workflow into a reusable OMP skill draft",
  },
  {
    name: "interview",
    skillId: "interview",
    description: "Socratic interview and ambiguity scoring",
  },
  {
    name: "graph-context",
    skillId: "graph-context",
    description:
      "Load codebase context from the knowledge graph instead of raw files",
  },
  {
    name: "interactive-menu",
    skillId: "interactive-menu",
    description:
      "Numbered-choice selection pattern for OMP's conversational TUI",
  },
  {
    name: "notifications",
    skillId: "notifications",
    description:
      "Send and manage runtime notifications (Telegram, Discord, Slack, Email)",
  },
  {
    name: "doctor",
    skillId: "doctor",
    description: "Diagnose and fix common issues",
  },
  {
    name: "session",
    skillId: "session",
    description: "Worktree and tmux session management",
  },
  {
    name: "verify",
    skillId: "verify",
    description: "Evidence-based completion check via verifier agent",
  },
  {
    name: "cancel",
    skillId: "cancel",
    description: "Ends active execution modes and clears .omp/state/",
  },
  {
    name: "help",
    skillId: "help",
    description: "Command and skill discovery; prints the full skill catalog",
  },
  {
    name: "code-review",
    skillId: "code-review",
    description: "Trigger the code-reviewer agent lane for structured code review",
  },
  {
    name: "security-review",
    skillId: "security-review",
    description: "Trigger the security-reviewer agent lane for security analysis",
  },
  {
    name: "ultraqa",
    skillId: "ultraqa",
    description: "QA cycle loop with qa-tester agent; runs until all checks pass",
  },
  {
    name: "ultragoal",
    skillId: "ultragoal",
    description: "Durable goal ledger in .omp/ultragoal/ with fail-closed checkpoints",
  },
];

/**
 * Mirrors buildActivationInstruction() in src/extension/commands.mts.
 * Command handlers run in the extension process and cannot execute the
 * skill directly — they instruct the agent to activate it.
 * @param {string} skillId
 * @param {string} args
 * @returns {string}
 */
export function buildActivationInstruction(skillId, args) {
  const trimmed = typeof args === "string" ? args.trim() : "";
  return `Activate the OMP skill "${skillId}" with args: ${trimmed.length > 0 ? trimmed : "(none)"}`;
}

// ---------------------------------------------------------------------------
// HUD canvas (SPEC-omp-2.0 §5 renderer #1)
//
// Self-contained mirrors of src/extension/hud-canvas.mts,
// src/extension/hud-push.mts, and the HUD paths/default line from
// src/hud/statusline.mts. Parity is enforced by
// tests/extension/extension-parity.test.mts.
// ---------------------------------------------------------------------------

/** Mirrors HUD_CANVAS_* constants in src/extension/hud-canvas.mts. */
export const HUD_CANVAS = {
  id: "omp-hud",
  displayName: "OMP HUD",
  description:
    "Live OMP session HUD: mode, model, context, tokens, premium requests, and agent activity.",
};

/** Mirrors DEFAULT_STATUSLINE in src/hud/statusline.mts. */
export const DEFAULT_STATUSLINE = "OMP | hud: no active session";

/** Mirrors HUD_DEBOUNCE_MS in src/extension/hud-push.mts. */
export const HUD_DEBOUNCE_MS = 250;

/** Mirrors HUD_WATCH_FILES in src/extension/hud-push.mts. */
export const HUD_WATCH_FILES = ["status.json", "display.txt"];

/**
 * Mirrors the HUD artifact paths of getStatuslinePaths() in
 * src/hud/statusline.mts (the subset the canvas renderer reads).
 * @param {string} [home]
 */
export function getHudPaths(home = process.env.HOME || homedir()) {
  const ompDir = join(home, ".omp");
  const hudDir = join(ompDir, "hud");
  return {
    hudDir,
    displayPath: join(hudDir, "display.txt"),
    legacyLinePath: join(ompDir, "hud.line"),
  };
}

/**
 * Reads the pre-rendered HUD line written by the hud-emitter hook /
 * `omp hud --watch`. Follows the cached-file fallback chain of
 * readStatusline() in src/hud/statusline.mts (display.txt → hud.line →
 * default). The live status.json re-render is intentionally skipped here:
 * renderPlain() lives in src/ and the artifacts are rewritten on every
 * hook fire, which is exactly what the watcher reacts to.
 * @param {{ displayPath: string, legacyLinePath: string }} [paths]
 * @returns {string}
 */
export function readHudLine(paths = getHudPaths()) {
  for (const filePath of [paths.displayPath, paths.legacyLinePath]) {
    try {
      const line = readFileSync(filePath, "utf-8").trim();
      if (line) return line;
    } catch {
      // Try the next fallback.
    }
  }
  return DEFAULT_STATUSLINE;
}

/**
 * Mirrors buildHudCanvasResponse() in src/extension/hud-canvas.mts.
 * @param {string} line
 * @returns {{ title: string, status: string }}
 */
export function buildHudCanvasResponse(line) {
  const trimmed = typeof line === "string" ? line.trim() : "";
  return {
    title: HUD_CANVAS.displayName,
    status: trimmed.length > 0 ? trimmed : DEFAULT_STATUSLINE,
  };
}

/**
 * Mirrors debounce() in src/extension/hud-push.mts (trailing edge).
 * @param {() => void} fn
 * @param {number} delayMs
 * @returns {{ trigger: () => void, cancel: () => void }}
 */
export function debounce(fn, delayMs) {
  let timer = null;
  return {
    trigger() {
      if (timer !== null) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        fn();
      }, delayMs);
    },
    cancel() {
      if (timer !== null) clearTimeout(timer);
      timer = null;
    },
  };
}

/**
 * Mirrors isHudArtifact() in src/extension/hud-push.mts.
 * @param {string | null | undefined} filename
 * @param {readonly string[]} [files]
 * @returns {boolean}
 */
export function isHudArtifact(filename, files = HUD_WATCH_FILES) {
  if (filename === null || filename === undefined) return true;
  return files.includes(String(filename));
}

/**
 * Builds the omp-hud Canvas declaration. Returns null when the SDK does
 * not expose createCanvas (older CLI) — fail-open so slash commands still
 * register without the canvas.
 * @param {unknown} createCanvas
 * @param {ReturnType<typeof getHudPaths>} paths
 * @param {Set<string>} openInstances
 */
function buildHudCanvas(createCanvas, paths, openInstances) {
  if (typeof createCanvas !== "function") return null;
  return createCanvas({
    id: HUD_CANVAS.id,
    displayName: HUD_CANVAS.displayName,
    description: HUD_CANVAS.description,
    actions: [
      {
        name: "refresh",
        description: "Re-read OMP HUD state and return the refreshed HUD line",
        handler: () => buildHudCanvasResponse(readHudLine(paths)),
      },
    ],
    open: (ctx) => {
      openInstances.add(ctx.instanceId);
      return buildHudCanvasResponse(readHudLine(paths));
    },
    onClose: (ctx) => {
      openInstances.delete(ctx.instanceId);
    },
  });
}

/**
 * Event push (SPEC-omp-2.0 §5): watches the HUD artifact dir (written by
 * the hud-emitter hook) and re-opens every open canvas instance so the
 * host re-renders — re-opening with an existing instanceId is the SDK's
 * documented refresh mechanism (canvas.d.ts). Debounced to coalesce the
 * multiple atomic writes per hook fire. Fail-open: any setup error only
 * disables push; fallback renderers (tmux statusline, `omp hud --watch`)
 * keep polling.
 * @param {{ rpc: { canvas: { open: (params: object) => Promise<unknown> } } }} session
 * @param {ReturnType<typeof getHudPaths>} paths
 * @param {Set<string>} openInstances
 */
function startHudPush(session, paths, openInstances) {
  const refresh = debounce(() => {
    for (const instanceId of openInstances) {
      try {
        Promise.resolve(
          session.rpc.canvas.open({ canvasId: HUD_CANVAS.id, instanceId }),
        ).catch(() => {
          // Instance gone or host busy — next change retries.
        });
      } catch {
        // rpc surface unavailable — fallback renderers keep polling.
      }
    }
  }, HUD_DEBOUNCE_MS);
  try {
    mkdirSync(paths.hudDir, { recursive: true });
    const watcher = watch(paths.hudDir, (_event, filename) => {
      if (isHudArtifact(filename)) refresh.trigger();
    });
    watcher.on("error", () => {
      refresh.cancel();
      try {
        watcher.close();
      } catch {
        // Already closed — nothing to clean up.
      }
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      `[omp-extension] HUD push disabled (watch failed): ${message}`,
    );
  }
}

async function main() {
  let joinSession;
  let createCanvas;
  try {
    // Resolved by the Copilot CLI inside extension processes only —
    // intentionally not a package.json dependency of this repo.
    ({ joinSession, createCanvas } = await import(
      "@github/copilot-sdk/extension"
    ));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      `[omp-extension] Copilot SDK unavailable, slash commands disabled: ${message}`,
    );
    return;
  }

  const commands = COMMANDS.map(({ name, skillId, description }) => ({
    name,
    description,
    handler: (args) => buildActivationInstruction(skillId, args),
  }));

  // HUD canvas — fail-open: never let canvas setup break slash commands.
  const hudPaths = getHudPaths();
  /** @type {Set<string>} */
  const openInstances = new Set();
  let canvases;
  try {
    const hudCanvas = buildHudCanvas(createCanvas, hudPaths, openInstances);
    canvases = hudCanvas ? [hudCanvas] : undefined;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[omp-extension] HUD canvas unavailable: ${message}`);
    canvases = undefined;
  }

  let session;
  try {
    session = await joinSession(
      canvases ? { commands, canvases } : { commands },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (!canvases) {
      console.error(
        `[omp-extension] joinSession failed, slash commands disabled: ${message}`,
      );
      return;
    }
    // Canvas registration may be the culprit — retry commands-only so a
    // canvas failure never takes slash commands down with it.
    console.error(
      `[omp-extension] joinSession with HUD canvas failed, retrying commands-only: ${message}`,
    );
    canvases = undefined;
    try {
      session = await joinSession({ commands });
    } catch (retryErr) {
      const retryMessage =
        retryErr instanceof Error ? retryErr.message : String(retryErr);
      console.error(
        `[omp-extension] joinSession failed, slash commands disabled: ${retryMessage}`,
      );
      return;
    }
  }

  // Event push only makes sense when the canvas registered.
  if (session && canvases) {
    try {
      startHudPush(session, hudPaths, openInstances);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[omp-extension] HUD push disabled: ${message}`);
    }
  }
}

// Only join the session when executed directly by the Copilot CLI —
// importing this module (e.g. from the parity tests) must not connect.
// argv[1] is realpath-normalized because Node resolves the ESM main entry
// to its realpath, so symlinked install paths would otherwise never match.
function isDirectExecution() {
  if (!process.argv[1]) return false;
  try {
    return import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href;
  } catch {
    return import.meta.url === pathToFileURL(process.argv[1]).href;
  }
}

if (isDirectExecution()) {
  main().catch((err) => {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[omp-extension] unexpected failure: ${message}`);
  });
}
