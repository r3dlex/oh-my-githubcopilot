// src/hooks/token-tracker.mts
import { readFileSync as readFileSync2, writeFileSync as writeFileSync2, mkdirSync as mkdirSync3 } from "fs";
import { homedir as homedir3 } from "os";
import { join as join3 } from "path";

// src/spending/tracker.mts
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { homedir } from "os";
import { join, dirname } from "path";
var SPENDING_PATH = join(homedir(), ".omp", "state", "spending-monthly.json");
function currentMonth() {
  const now = /* @__PURE__ */ new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}
function loadSpending(sessionId) {
  let raw;
  try {
    raw = JSON.parse(readFileSync(SPENDING_PATH, "utf-8"));
  } catch {
    return {
      version: 1,
      sessionId,
      sessionPremiumRequests: 0,
      month: currentMonth(),
      monthlyPremiumRequests: 0
    };
  }
  const month = currentMonth();
  if (raw.month !== month) {
    return {
      version: 1,
      sessionId,
      sessionPremiumRequests: 0,
      month,
      monthlyPremiumRequests: 0
    };
  }
  if (raw.sessionId !== sessionId) {
    return {
      version: 1,
      sessionId,
      sessionPremiumRequests: 0,
      month,
      monthlyPremiumRequests: raw.monthlyPremiumRequests
    };
  }
  return { ...raw, version: 1 };
}
function saveSpending(state) {
  try {
    mkdirSync(dirname(SPENDING_PATH), { recursive: true });
    writeFileSync(SPENDING_PATH, JSON.stringify(state, null, 2), "utf-8");
  } catch (e) {
    console.warn(`[OMP] spending: failed to save state: ${e}`);
  }
}
function incrementSpending(sessionId) {
  const state = loadSpending(sessionId);
  state.sessionPremiumRequests += 1;
  state.monthlyPremiumRequests += 1;
  saveSpending(state);
  return state;
}

// src/hooks/token-tracker.mts
import { fileURLToPath } from "url";

// src/hooks/runner.mts
import { appendFileSync, mkdirSync as mkdirSync2 } from "fs";
import { homedir as homedir2 } from "os";
import { join as join2 } from "path";
async function readStdin() {
  const readStdinActual = async () => {
    const chunks = [];
    for await (const chunk of process.stdin) {
      chunks.push(String(chunk));
    }
    return chunks.join("");
  };
  const stdinTimeout = new Promise(
    (resolve) => setTimeout(
      () => resolve(""),
      parseInt(process.env.OMP_HOOK_STDIN_TIMEOUT_MS ?? "500") || 500
    )
  );
  return Promise.race([readStdinActual(), stdinTimeout]);
}
function logHookFailure(hook, reason) {
  try {
    process.stderr.write(`[omp hook fail-open] ${hook}: ${reason}
`);
  } catch {
  }
  try {
    const logsDir = join2(homedir2(), ".omp", "logs");
    mkdirSync2(logsDir, { recursive: true });
    const record = JSON.stringify({ ts: (/* @__PURE__ */ new Date()).toISOString(), hook, reason });
    appendFileSync(join2(logsDir, "hook-failures.jsonl"), record + "\n", "utf-8");
  } catch {
  }
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
    logHookFailure(options.hookName ?? "unknown", reason);
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

// src/hooks/token-tracker.mts
var MODEL_CONTEXTS = {
  "claude-sonnet-4.5": 2e5,
  "claude-sonnet-4": 2e5,
  "claude-sonnet-4.6": 2e5,
  "claude-opus-4.6": 2e5,
  "gpt-5": 128e3,
  "gpt-5.4-mini": 128e3,
  "gemini-3-pro": 128e3,
  default: 2e5
};
var WARNING_THRESHOLDS = [60, 80, 90];
function estimateTokens(input) {
  if (!input) return 0;
  try {
    const str = typeof input === "string" ? input : JSON.stringify(input);
    return Math.ceil(str.length / 4);
  } catch {
    return 0;
  }
}
function getStatePath(sessionId) {
  const base = join3(homedir3(), ".omp", "state");
  if (sessionId) {
    return join3(base, "sessions", sessionId, "session.json");
  }
  return join3(base, "session.json");
}
function ensureDir(path) {
  mkdirSync3(path.substring(0, path.lastIndexOf("/")), { recursive: true });
}
function processHook(input) {
  const start = Date.now();
  const log = [];
  try {
    if (input.hook_type !== "PostToolUse") {
      return {
        status: "skip",
        latencyMs: Date.now() - start,
        mutations: [],
        log: []
      };
    }
    const statePath = getStatePath(input.session_id);
    let state;
    try {
      const raw = JSON.parse(readFileSync2(statePath, "utf-8"));
      state = {
        ...raw,
        warnings_issued: new Set(
          Array.isArray(raw.warnings_issued) ? raw.warnings_issued : []
        )
      };
    } catch {
      const fallbackModel = input.model ?? "default";
      state = {
        tokens_estimated: 0,
        token_budget: MODEL_CONTEXTS[fallbackModel] ?? MODEL_CONTEXTS["default"] ?? 2e5,
        context_pct: 0,
        warnings_issued: /* @__PURE__ */ new Set()
      };
    }
    const inputTokens = estimateTokens(input.tool_input);
    const outputTokens = estimateTokens(input.tool_output);
    const delta = inputTokens + outputTokens;
    state.tokens_estimated += delta;
    state.context_pct = Math.min(100, Math.round(state.tokens_estimated / state.token_budget * 100));
    const mutations = [
      { type: "set_token_budget", budget: state.token_budget }
    ];
    for (const threshold of WARNING_THRESHOLDS) {
      const key = `warn_${threshold}`;
      if (state.context_pct >= threshold && !state.warnings_issued.has(key)) {
        state.warnings_issued.add(key);
        const message = threshold >= 90 ? `CRITICAL: Context at ${state.context_pct}%. Tokens near budget limit.` : threshold >= 80 ? `WARNING: Context at ${state.context_pct}%. Consider enabling ecomode.` : `INFO: Context at ${state.context_pct}%.`;
        mutations.push({ type: "log", level: threshold >= 80 ? "warn" : "info", message });
        log.push(message);
      }
    }
    try {
      ensureDir(statePath);
      writeFileSync2(
        statePath,
        JSON.stringify({ ...state, warnings_issued: Array.from(state.warnings_issued) }),
        "utf-8"
      );
    } catch (e) {
      log.push(`Failed to write state: ${e}`);
    }
    const sessionId = input.session_id ?? `omp-${Date.now()}`;
    try {
      incrementSpending(sessionId);
    } catch {
    }
    return {
      status: "ok",
      latencyMs: Date.now() - start,
      mutations,
      log
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
  await runHookMain(processHook, { hookName: "token-tracker" });
}
export {
  MODEL_CONTEXTS,
  estimateTokens,
  processHook
};
//# sourceMappingURL=token-tracker.mjs.map
