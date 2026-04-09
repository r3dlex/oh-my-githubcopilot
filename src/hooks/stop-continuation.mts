/**
 * stop-continuation hook
 * Trigger: post-message (SessionEnd equivalent)
 * Priority: 50
 *
 * Detects active persistent modes (ralph, ultrawork, team) and
 * returns continue instructions so the user can decide whether
 * to keep going.
 */

import { readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

export interface HookInput {
  hook_type: "SessionEnd";
  session_id?: string;
  message?: string;
}

export interface HookOutput {
  modifiedResult?: unknown;
  status: "ok" | "skip" | "error";
  latencyMs: number;
  mutations: Array<{ type: "stop"; reason: string } | { type: "log"; level: "info"; message: string }>;
  log: string[];
}

interface ModeState {
  active?: boolean;
  mode?: string;
  linked_ultrawork?: boolean;
  linked_team?: boolean;
}

function getModeStatePath(mode: string, sessionId?: string): string {
  const base = join(homedir(), ".omp", "state");
  if (sessionId) {
    return join(base, "sessions", sessionId, `${mode}-state.json`);
  }
  return join(base, `${mode}-state.json`);
}

function readModeState(mode: string, sessionId?: string): ModeState | null {
  try {
    const path = getModeStatePath(mode, sessionId);
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return null;
  }
}

// Priority order for checking: team > ralph > ultrawork
const PERSISTENT_MODES = ["team", "ralph", "ultrawork"];

export function processHook(input: HookInput): HookOutput {
  const start = Date.now();
  const log: string[] = [];

  try {
    if (input.hook_type !== "SessionEnd") {
      return {
        status: "skip",
        latencyMs: Date.now() - start,
        mutations: [],
        log: [],
      };
    }

    // Check for active persistent modes
    for (const mode of PERSISTENT_MODES) {
      const state = readModeState(mode, input.session_id);
      if (state?.active) {
        const reason = `${mode} mode is still active.`;
        log.push(`Stop continuation: ${reason}`);

        return {
          status: "ok",
          latencyMs: Date.now() - start,
          mutations: [
            {
              type: "stop",
              reason: `${reason} Use /oh-my-copilot:cancel to end it, or continue the session to keep going.`,
            },
            { type: "log", level: "info", message: reason },
          ],
          log,
        };
      }
    }

    return {
      status: "ok",
      latencyMs: Date.now() - start,
      mutations: [],
      log: ["No persistent modes active"],
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

// Main entry point
const input: HookInput = JSON.parse(await readStdin());
const output = processHook(input);
console.log(JSON.stringify(output));

async function readStdin(): Promise<string> {
  const chunks: string[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return chunks.join("");
}
