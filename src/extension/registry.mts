/**
 * OMP skill registry — single source of truth for slash commands,
 * CLI verbs, and keyword triggers (SPEC-omp-2.0 §4, ADR-0002).
 *
 * Each entry mirrors a `skills/<id>/SKILL.md` listed in plugin.json.
 * `extension/extension.mjs` carries a self-contained copy of this list
 * (it must run standalone in the Copilot extension process without tsx);
 * keep both in sync when adding skills.
 */

import { buildCommands, type CommandDefinitionLike } from "./commands.mts";

export interface SkillEntry {
  /** Canonical skill id == skills/<id> directory basename. */
  id: string;
  /** One-line description shown next to the slash command. */
  description: string;
  /** Short alternative slash-command names (e.g. ulw → ultrawork). */
  aliases?: string[];
  /** Legacy prose keyword triggers kept for backward compat during 2.x. */
  keywords?: string[];
}

export const SKILL_REGISTRY: SkillEntry[] = [
  {
    id: "autopilot",
    description: "Autonomous end-to-end execution from idea to working code",
    keywords: ["autopilot:"],
  },
  {
    id: "ralph",
    description: "Persistence loop with architect verification gate",
    keywords: ["ralph:"],
  },
  {
    id: "ultrawork",
    description: "Parallel multi-agent high-throughput implementation",
    aliases: ["ulw"],
    keywords: ["ulw:", "ultrawork:"],
  },
  {
    id: "team",
    description: "Coordinated N-agent team with staged pipeline",
    keywords: ["team:"],
  },
  {
    id: "ecomode",
    description: "Cost-optimized execution with low-cost model tier",
    aliases: ["eco"],
    keywords: ["eco:", "ecomode:"],
  },
  {
    id: "swarm",
    description: "Parallel agent swarm for independent subtasks",
    keywords: ["swarm:"],
  },
  {
    id: "pipeline",
    description: "Sequential stage-based execution pipeline",
    keywords: ["pipeline:"],
  },
  {
    id: "deep-interview",
    description: "Socratic deep requirements interview with ambiguity gating",
    aliases: ["di"],
    keywords: ["deep interview:"],
  },
  {
    id: "omp-plan",
    description:
      "Strategic planning with interview, direct, consensus, and review modes",
    aliases: ["plan"],
    keywords: ["plan:"],
  },
  {
    id: "omp-setup",
    description: "OMP onboarding and configuration wizard",
    keywords: ["setup:"],
  },
  {
    id: "hud",
    description: "Display current HUD session state",
    keywords: ["hud:"],
  },
  {
    id: "wiki",
    description: "Project wiki operations and management",
    keywords: ["wiki:"],
  },
  {
    id: "learner",
    description: "Structured learning and knowledge sessions",
    keywords: ["learner:"],
  },
  {
    id: "note",
    description: "Session notes and context management",
    keywords: ["note:"],
  },
  {
    id: "trace",
    description: "Execution tracing and debugging",
    keywords: ["trace:"],
  },
  {
    id: "release",
    description: "Guided release workflow and automation",
    keywords: ["release:"],
  },
  {
    id: "configure-notifications",
    description: "Configure session notification settings",
    keywords: ["configure-notifications:"],
  },
  {
    id: "psm",
    description: "Plugin State Manager operations",
    keywords: ["psm:"],
  },
  {
    id: "swe-bench",
    description: "SWE-bench evaluation harness runner",
    keywords: ["swe-bench:"],
  },
  {
    id: "mcp-setup",
    description: "MCP server configuration wizard",
    keywords: ["mcp:", "mcp-setup:"],
  },
  {
    id: "setup",
    description: "OMP setup and onboarding wizard",
  },
  {
    id: "graphify",
    description: "Convert any input to a knowledge graph",
    keywords: ["graphify:"],
  },
  {
    id: "graphwiki",
    description: "GraphWiki CLI operations: query, lint, build",
    keywords: ["graphwiki:"],
  },
  {
    id: "graph-provider",
    description: "Manage and configure the active graph provider",
    keywords: ["graph:"],
  },
  {
    id: "spending",
    description: "Track and reset premium request usage",
    keywords: ["spending:"],
  },
  {
    id: "ralplan",
    description:
      "Consensus planning gate for vague ralph/autopilot/team requests",
  },
  {
    id: "research",
    description:
      "Research and investigation workflows (investigate, deep dive)",
    keywords: ["autoresearch:"],
  },
  {
    id: "omp-doctor",
    description: "Diagnose and fix oh-my-githubcopilot installation issues",
  },
  {
    id: "omp-reference",
    description:
      "OMP agent catalog, tools, routing, commit protocol, and skills registry",
  },
  {
    id: "ai-slop-cleaner",
    description:
      "Clean AI-generated code slop with a regression-safe, deletion-first workflow",
    keywords: ["deslop", "anti-slop"],
  },
  {
    id: "tdd",
    description: "Test-Driven Development with Red-Green-Refactor cycle",
    keywords: ["tdd:"],
  },
  {
    id: "improve-codebase-architecture",
    description:
      "Deep exploration and architectural improvement via friction detection",
  },
  {
    id: "skillify",
    description:
      "Turn a repeatable session workflow into a reusable OMP skill draft",
  },
  {
    id: "interview",
    description: "Socratic interview and ambiguity scoring",
    keywords: ["interview:"],
  },
  {
    id: "graph-context",
    description:
      "Load codebase context from the knowledge graph instead of raw files",
  },
  {
    id: "interactive-menu",
    description:
      "Numbered-choice selection pattern for OMP's conversational TUI",
  },
  {
    id: "notifications",
    description:
      "Send and manage runtime notifications (Telegram, Discord, Slack, Email)",
    keywords: ["notifications:"],
  },
  {
    id: "doctor",
    description: "Diagnose and fix common issues",
    keywords: ["doctor:"],
  },
  {
    id: "session",
    description: "Worktree and tmux session management",
    keywords: ["session:"],
  },
];

/**
 * Maps the registry to Copilot SDK CommandDefinition-shaped objects
 * (one per skill id plus one per alias).
 */
export function getCommandDefinitions(): CommandDefinitionLike[] {
  return buildCommands(SKILL_REGISTRY);
}
