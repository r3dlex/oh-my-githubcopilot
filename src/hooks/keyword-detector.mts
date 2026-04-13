/**
 * keyword-detector hook
 * Trigger: pre-cycle (UserPromptSubmitted equivalent)
 * Priority: 100 (runs first)
 *
 * Scans incoming prompts for magic keywords and rewrites them
 * to skill invocation slash commands.
 */

export interface KeywordMatch {
  keyword: string;
  skillId: string;
  position: number;
}

const KEYWORD_MAP: Record<string, string> = {
  "autopilot:": "autopilot",
  "/autopilot": "autopilot",
  "/omp:autopilot": "autopilot",
  "ralph:": "ralph",
  "/ralph": "ralph",
  "/omp:ralph": "ralph",
  "ulw:": "ultrawork",
  "ultrawork:": "ultrawork",
  "/ulw": "ultrawork",
  "/ultrawork": "ultrawork",
  "/omp:ulw": "ultrawork",
  "/omp:ultrawork": "ultrawork",
  "team:": "team",
  "/team": "team",
  "/omp:team": "team",
  "eco:": "ecomode",
  "ecomode:": "ecomode",
  "/eco": "ecomode",
  "/ecomode": "ecomode",
  "/omp:eco": "ecomode",
  "/omp:ecomode": "ecomode",
  "swarm:": "swarm",
  "/swarm": "swarm",
  "/omp:swarm": "swarm",
  "pipeline:": "pipeline",
  "/pipeline": "pipeline",
  "/omp:pipeline": "pipeline",
  "deep interview:": "deep-interview",
  "/deep-interview": "deep-interview",
  "/omp:deep-interview": "deep-interview",
  "plan:": "omp-plan",
  "/plan": "omp-plan",
  "/omp-plan": "omp-plan",
  "/omp:plan": "omp-plan",
  "setup:": "omp-setup",
  "/setup": "omp-setup",
  "/omp-setup": "omp-setup",
  "/omp:setup": "omp-setup",
  "mcp:": "mcp-setup",
  "mcp-setup:": "mcp-setup",
  "/mcp": "mcp-setup",
  "/mcp-setup": "mcp-setup",
  "/omp:mcp-setup": "mcp-setup",
  "/hud": "hud",
  "hud:": "hud",
  "/omp:hud": "hud",
  "/wiki": "wiki",
  "wiki:": "wiki",
  "/omp:wiki": "wiki",
  "/learner": "learner",
  "learner:": "learner",
  "/omp:learner": "learner",
  "/note": "note",
  "note:": "note",
  "/omp:note": "note",
  "/trace": "trace",
  "trace:": "trace",
  "/omp:trace": "trace",
  "/release": "release",
  "release:": "release",
  "/omp:release": "release",
  "/configure-notifications": "configure-notifications",
  "configure-notifications:": "configure-notifications",
  "/omp:configure-notifications": "configure-notifications",
  "/psm": "psm",
  "psm:": "psm",
  "/omp:psm": "psm",
  "/swe-bench": "swe-bench",
  "swe-bench:": "swe-bench",
  "/omp:swe-bench": "swe-bench",
  "graphify:": "graphify",
  "graph build": "graphify",
  "build graph": "graphify",
  "graphwiki:": "graphwiki",
  "graph:": "graph-provider",
  "spending:": "spending",
  "/graphify": "graphify",
  "/omp:graphify": "graphify",
  "/graphwiki": "graphwiki",
  "/omp:graphwiki": "graphwiki",
  "/graph-provider": "graph-provider",
  "/omp:graph-provider": "graph-provider",
  "/spending": "spending",
  "/omp:spending": "spending",
};

const KEYWORD_ENTRIES = Object.entries(KEYWORD_MAP).sort(([a], [b]) => b.length - a.length);
const CANONICAL_COMMAND_MAP: Record<string, string> = {
  "omp-plan": "/omp:plan",
  "omp-setup": "/setup",
  "mcp-setup": "/mcp",
};

export interface HookInput {
  hook_type: "UserPromptSubmitted";
  prompt: string;
  session_id?: string;
}

export interface HookOutput {
  decision?: "allow";
  modifiedPrompt?: string;
  additionalContext?: string;
  status: "ok" | "skip" | "error";
  latencyMs: number;
  mutations: Array<{ type: "set_mode"; mode: string } | { type: "log"; level: "info"; message: string }>;
  log: string[];
}

function detectKeyword(prompt: string): KeywordMatch | null {
  const trimmed = prompt.trimStart();

  // Prefer the longest literal alias match first so /mcp-setup wins over /mcp.
  for (const [keyword, skillId] of KEYWORD_ENTRIES) {
    if (trimmed.startsWith(keyword)) {
      return {
        keyword,
        skillId,
        position: 0,
      };
    }
  }

  // Case-insensitive check for slash forms
  const slashPattern = /^\/((?:omp:)?[a-zA-Z][a-zA-Z0-9-]*)\b/;
  const slashMatch = trimmed.match(slashPattern);
  if (slashMatch) {
    const cmd = slashMatch[1].toLowerCase();
    const skillId = KEYWORD_MAP[`/${cmd}`] ?? KEYWORD_MAP[`${cmd}:`];
    if (skillId) {
      return {
        keyword: slashMatch[0],
        skillId,
        position: 0,
      };
    }
  }

  return null;
}

function getCanonicalCommand(skillId: string): string {
  return CANONICAL_COMMAND_MAP[skillId] ?? `/omp:${skillId}`;
}

export function processHook(input: HookInput): HookOutput {
  const start = Date.now();
  const log: string[] = [];

  try {
    if (input.hook_type !== "UserPromptSubmitted") {
      return {
        status: "skip",
        latencyMs: Date.now() - start,
        mutations: [],
        log: ["Not a UserPromptSubmitted hook"],
      };
    }

    const match = detectKeyword(input.prompt);
    if (!match) {
      return {
        status: "ok",
        latencyMs: Date.now() - start,
        mutations: [],
        log: [],
      };
    }

    // Rewrite prompt to invoke the skill
    const taskPart = input.prompt.slice(match.position + match.keyword.length).trim();
    const rewritten = `${getCanonicalCommand(match.skillId)}${taskPart ? ` ${taskPart}` : ""}`;

    log.push(`Keyword detected: "${match.keyword}" → skill: ${match.skillId}`);
    log.push(`Rewritten: "${rewritten}"`);

    return {
      status: "ok",
      latencyMs: Date.now() - start,
      modifiedPrompt: rewritten,
      mutations: [
        { type: "set_mode", mode: match.skillId },
        { type: "log", level: "info", message: `Skill activated: ${match.skillId}` },
      ],
      log,
    };
  } catch (err) {
    return {
      status: "error",
      latencyMs: Date.now() - start,
      mutations: [],
      log: [`Error: ${err}`],
    };
  }
}

// Main entry point — only runs when executed directly (not imported)
import { fileURLToPath } from "url";

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input: HookInput = JSON.parse(await readStdin());
  const output = processHook(input);
  console.log(JSON.stringify(output));
}

async function readStdin(): Promise<string> {
  const chunks: string[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return chunks.join("");
}
