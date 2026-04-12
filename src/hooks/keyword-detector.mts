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
  "ralph:": "ralph",
  "ulw:": "ultrawork",
  "team:": "team",
  "eco:": "ecomode",
  "swarm:": "swarm",
  "pipeline:": "pipeline",
  "plan:": "omp-plan",
  // Aliases (shortcut commands)
  "setup:": "setup",
  "ralplan:": "ralplan",
  "ultraqa:": "ultraqa",
  "mcp:": "mcp-setup",
  "ultrawork:": "ultrawork",
  "ecomode:": "ecomode",
  // Phase 1.1 skill stubs (19 total from plugin.json)
  "/autopilot": "autopilot",
  "/ralph": "ralph",
  "/ulw": "ultrawork",
  "/team": "team",
  "/eco": "ecomode",
  "/swarm": "swarm",
  "/pipeline": "pipeline",
  "/deep-interview": "deep-interview",
  "/omp-plan": "omp-plan",
  "/omp-setup": "omp-setup",
  "/hud": "hud",
  "/wiki": "wiki",
  "/learner": "learner",
  "/note": "note",
  "/trace": "trace",
  "/release": "release",
  "/configure-notifications": "configure-notifications",
  "/psm": "psm",
  "/swe-bench": "swe-bench",
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

  // Case-sensitive check for : suffixed forms
  for (const [keyword, skillId] of Object.entries(KEYWORD_MAP)) {
    if (trimmed.startsWith(keyword)) {
      return {
        keyword,
        skillId,
        position: 0,
      };
    }
  }

  // Case-insensitive check for slash forms
  const slashPattern = /^\/([a-zA-Z]+)\b/;
  const slashMatch = trimmed.match(slashPattern);
  if (slashMatch) {
    const cmd = slashMatch[1].toLowerCase();
    // Map /autopilot -> autopilot, /ralph -> ralph, etc.
    const skillId = KEYWORD_MAP[`${cmd}:`] || cmd;
    if (skillId !== cmd || Object.values(KEYWORD_MAP).includes(cmd)) {
      return {
        keyword: slashMatch[0],
        skillId,
        position: 0,
      };
    }
  }

  return null;
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
    const rewritten = `/oh-my-copilot:${match.skillId}${taskPart ? ` ${taskPart}` : ""}`;

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
