/**
 * OMP companion extension for GitHub Copilot CLI (>= 1.0.60).
 *
 * Registers every OMP skill as a native slash command via the Copilot
 * SDK extension API (SPEC-omp-2.0 §4, ADR-0002). Runs standalone inside
 * the Copilot extension process — no tsx/build step — so it carries a
 * self-contained copy of the skill registry. Keep in sync with
 * src/extension/registry.mts and src/extension/commands.mts.
 *
 * Fail-open by design: any failure is logged to stderr and the process
 * exits gracefully so a broken extension never breaks the CLI session.
 */

import { pathToFileURL } from "url";

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

async function main() {
  let joinSession;
  try {
    // Resolved by the Copilot CLI inside extension processes only —
    // intentionally not a package.json dependency of this repo.
    ({ joinSession } = await import("@github/copilot-sdk/extension"));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      `[omp-extension] Copilot SDK unavailable, slash commands disabled: ${message}`,
    );
    return;
  }

  try {
    await joinSession({
      commands: COMMANDS.map(({ name, skillId, description }) => ({
        name,
        description,
        handler: (args) => buildActivationInstruction(skillId, args),
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      `[omp-extension] joinSession failed, slash commands disabled: ${message}`,
    );
  }
}

// Only join the session when executed directly by the Copilot CLI —
// importing this module (e.g. from the parity tests) must not connect.
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((err) => {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[omp-extension] unexpected failure: ${message}`);
  });
}
