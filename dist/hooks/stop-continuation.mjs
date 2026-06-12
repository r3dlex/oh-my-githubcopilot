// src/hooks/stop-continuation.mts
import { readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { fileURLToPath } from "url";

// src/hooks/runner.mts
async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(String(chunk));
  }
  return chunks.join("");
}
async function runHookMain(processHook2, options = {}) {
  let outputJson;
  try {
    const input = JSON.parse(await readStdin());
    const serialized = JSON.stringify(processHook2(input));
    if (typeof serialized !== "string") {
      throw new Error("hook produced no serializable output");
    }
    outputJson = serialized;
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    const failOpen = {
      ...options.failOpenDecision ? { decision: "allow" } : {},
      status: "error",
      latencyMs: 0,
      mutations: [],
      log: [`fail-open: ${reason}`]
    };
    outputJson = JSON.stringify(failOpen);
  }
  console.log(outputJson);
  process.exitCode = 0;
}

// src/hooks/stop-continuation.mts
function getModeStatePath(mode, sessionId) {
  const base = join(homedir(), ".omp", "state");
  if (sessionId) {
    return join(base, "sessions", sessionId, `${mode}-state.json`);
  }
  return join(base, `${mode}-state.json`);
}
function readModeState(mode, sessionId) {
  try {
    const path = getModeStatePath(mode, sessionId);
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return null;
  }
}
var PERSISTENT_MODES = ["team", "ralph", "ultrawork"];
function processHook(input) {
  const start = Date.now();
  const log = [];
  try {
    if (input.hook_type !== "SessionEnd") {
      return {
        status: "skip",
        latencyMs: Date.now() - start,
        mutations: [],
        log: []
      };
    }
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
              reason: `${reason} Use /cancel to end it, or continue the session to keep going.`
            },
            { type: "log", level: "info", message: reason }
          ],
          log
        };
      }
    }
    return {
      status: "ok",
      latencyMs: Date.now() - start,
      mutations: [],
      log: ["No persistent modes active"]
    };
  } catch (err) {
    return {
      status: "error",
      latencyMs: Date.now() - start,
      mutations: [],
      log: [`Error: ${err}`]
    };
  }
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await runHookMain(processHook);
}
export {
  processHook
};
//# sourceMappingURL=stop-continuation.mjs.map
