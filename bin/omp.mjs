#!/usr/bin/env node
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/hud/renderer.mts
function formatAge(startedAt) {
  const elapsed = Date.now() - startedAt;
  const mins = Math.floor(elapsed / 6e4);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return `${hours}h${remainingMins}m`;
}
function formatTokens(tokens) {
  if (tokens >= 1e6) return `${(tokens / 1e6).toFixed(1)}M`;
  if (tokens >= 1e3) return `${(tokens / 1e3).toFixed(1)}k`;
  return `${tokens}`;
}
function ctxColor(pct) {
  if (pct < 60) return "\x1B[32m";
  if (pct < 85) return "\x1B[33m";
  return "\x1B[31m";
}
function reset() {
  return "\x1B[0m";
}
function renderAnsi(state) {
  const age = formatAge(state.startedAt);
  const tokens = formatTokens(state.tokensUsed);
  const ctx = state.contextPct;
  const mode = state.activeMode || "-";
  const model = state.activeModel || "sonnet";
  const icon = STATUS_ICONS[state.status] || "\u25CF";
  const ctxClr = ctxColor(ctx);
  const ctxStr = `${ctxClr}ctx:${ctx}%${reset()}`;
  const tokenStr = `tok:~${tokens}/${state.tokensTotal}`;
  const modeStr = mode === "-" ? "-" : `\x1B[36m${mode}${reset()}`;
  const reqWarning = state.warningActive ? " !!" : "";
  const reqStr = `req:${state.premiumRequests ?? 0}/${state.premiumRequestsTotal ?? 1500}${reqWarning}`;
  return `[OMP v${state.version}] ${modeStr} | ${model} | ${ctxStr} | ${tokenStr} | ${reqStr} | ${age} | tools:${state.toolsUsed?.size || 0}/${state.toolsTotal ?? 13} | skills:${state.skillsUsed?.size || 0}/${state.skillsTotal ?? 25} | agents:${state.cumulativeAgentsUsed}/${state.agentsTotal ?? 19} | ${icon} ${state.status}`;
}
function renderPlain(state) {
  const age = formatAge(state.startedAt);
  const tokens = formatTokens(state.tokensUsed);
  const ctx = state.contextPct;
  const mode = state.activeMode || "-";
  const model = state.activeModel || "sonnet";
  const reqWarningPlain = state.warningActive ? " !!" : "";
  const reqStrPlain = `req:${state.premiumRequests ?? 0}/${state.premiumRequestsTotal ?? 1500}${reqWarningPlain}`;
  return `[OMP v${state.version}] ${mode} | ${model} | ctx:${ctx}% | tok:~${tokens}/${state.tokensTotal} | ${reqStrPlain} | ${age} | tools:${state.toolsUsed?.size || 0}/${state.toolsTotal ?? 13} | skills:${state.skillsUsed?.size || 0}/${state.skillsTotal ?? 25} | agents:${state.cumulativeAgentsUsed}/${state.agentsTotal ?? 19} | ${state.status}`;
}
var STATUS_ICONS;
var init_renderer = __esm({
  "src/hud/renderer.mts"() {
    "use strict";
    STATUS_ICONS = {
      idle: "\u25CB",
      running: "\u25CF",
      waiting: "\u25F7",
      complete: "\u2713",
      error: "\u2717",
      eco: "\u26A1"
    };
  }
});

// src/hud/statusline.mts
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "fs";
import { homedir as homedir2 } from "os";
import { dirname as dirname2, join as join2 } from "path";
import { fileURLToPath } from "url";
function getStatuslinePaths(home = process.env["HOME"] || homedir2()) {
  const ompDir = join2(home, ".omp");
  const hudDir = join2(ompDir, "hud");
  return {
    legacyLinePath: join2(ompDir, "hud.line"),
    hudDir,
    statusJsonPath: join2(hudDir, "status.json"),
    displayPath: join2(hudDir, "display.txt"),
    tmuxSegmentPath: join2(hudDir, "tmux-segment.sh")
  };
}
function ensureParent(filePath) {
  mkdirSync(dirname2(filePath), { recursive: true });
}
function writeAtomic(filePath, content, mode) {
  ensureParent(filePath);
  const tempPath = `${filePath}.tmp`;
  writeFileSync(tempPath, content, mode === void 0 ? "utf-8" : { encoding: "utf-8", mode });
  renameSync(tempPath, filePath);
}
function normalizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => typeof item === "string");
}
function serializeHudState(state) {
  return {
    ...state,
    toolsUsed: Array.from(state.toolsUsed),
    skillsUsed: Array.from(state.skillsUsed)
  };
}
function deserializeHudState(raw) {
  if (!raw || typeof raw !== "object") return null;
  const value = raw;
  const toolsUsed = new Set(normalizeStringArray(value.toolsUsed));
  const skillsUsed = new Set(normalizeStringArray(value.skillsUsed));
  const agentsActive = normalizeStringArray(value.agentsActive);
  const status = typeof value.status === "string" ? value.status : "idle";
  return {
    sessionId: typeof value.sessionId === "string" ? value.sessionId : "default",
    activeMode: typeof value.activeMode === "string" ? value.activeMode : null,
    activeModel: typeof value.activeModel === "string" ? value.activeModel : "sonnet",
    contextPct: typeof value.contextPct === "number" ? value.contextPct : 0,
    tokensUsed: typeof value.tokensUsed === "number" ? value.tokensUsed : 0,
    tokensTotal: typeof value.tokensTotal === "number" ? value.tokensTotal : DEFAULT_TOKEN_BUDGET,
    agentsActive,
    lastAgent: typeof value.lastAgent === "string" ? value.lastAgent : agentsActive.at(-1) ?? "-",
    lastOutput: typeof value.lastOutput === "string" ? value.lastOutput : "",
    taskProgress: typeof value.taskProgress === "number" ? value.taskProgress : 0,
    startedAt: typeof value.startedAt === "number" ? value.startedAt : Date.now(),
    updatedAt: typeof value.updatedAt === "number" ? value.updatedAt : Date.now(),
    version: typeof value.version === "string" ? value.version : DEFAULT_VERSION,
    status,
    sessionDurationMs: typeof value.sessionDurationMs === "number" ? value.sessionDurationMs : 0,
    cumulativeAgentsUsed: typeof value.cumulativeAgentsUsed === "number" ? value.cumulativeAgentsUsed : agentsActive.length,
    toolsUsed,
    skillsUsed,
    toolsTotal: typeof value.toolsTotal === "number" ? value.toolsTotal : 13,
    skillsTotal: typeof value.skillsTotal === "number" ? value.skillsTotal : 25,
    agentsTotal: typeof value.agentsTotal === "number" ? value.agentsTotal : 19,
    premiumRequests: typeof value.premiumRequests === "number" ? value.premiumRequests : 0,
    premiumRequestsTotal: typeof value.premiumRequestsTotal === "number" ? value.premiumRequestsTotal : DEFAULT_PREMIUM_REQUESTS_TOTAL,
    warningActive: typeof value.warningActive === "boolean" ? value.warningActive : false
  };
}
function buildHudState(snapshot, now = Date.now()) {
  const startedAt = snapshot.started_at ?? now;
  const updatedAt = snapshot.updated_at ?? now;
  const toolsUsed = new Set(normalizeStringArray(snapshot.tools_used));
  const skillsUsed = new Set(normalizeStringArray(snapshot.skills_used));
  const agentsActive = normalizeStringArray(snapshot.agents_used);
  return {
    sessionId: snapshot.session_id ?? "default",
    activeMode: snapshot.active_mode ?? null,
    activeModel: snapshot.model ?? "sonnet",
    contextPct: snapshot.context_pct ?? 0,
    tokensUsed: snapshot.tokens_estimated ?? 0,
    tokensTotal: snapshot.token_budget ?? DEFAULT_TOKEN_BUDGET,
    agentsActive,
    lastAgent: agentsActive.at(-1) ?? "-",
    lastOutput: snapshot.last_output ?? "",
    taskProgress: snapshot.task_progress ?? 0,
    startedAt,
    updatedAt,
    version: snapshot.version ?? DEFAULT_VERSION,
    status: snapshot.status ?? "idle",
    sessionDurationMs: Math.max(0, updatedAt - startedAt),
    cumulativeAgentsUsed: agentsActive.length,
    toolsUsed,
    skillsUsed,
    toolsTotal: 13,
    skillsTotal: 25,
    agentsTotal: 19,
    premiumRequests: snapshot.premium_requests ?? 0,
    premiumRequestsTotal: snapshot.premium_requests_total ?? DEFAULT_PREMIUM_REQUESTS_TOTAL,
    warningActive: snapshot.warning_active ?? false
  };
}
function writeHudArtifacts(snapshot, paths = getStatuslinePaths()) {
  const state = buildHudState(snapshot);
  const line = renderPlain(state);
  const serializedState = `${JSON.stringify(serializeHudState(state), null, 2)}
`;
  writeAtomic(paths.statusJsonPath, serializedState);
  writeAtomic(paths.displayPath, `${line}
`);
  writeAtomic(paths.tmuxSegmentPath, `${line}
`, 493);
  writeAtomic(paths.legacyLinePath, `${line}
`);
  return { line, state, paths };
}
function readStatusline(paths = getStatuslinePaths()) {
  try {
    const parsed = JSON.parse(readFileSync(paths.statusJsonPath, "utf-8"));
    const state = deserializeHudState(parsed);
    if (state) return renderPlain(state);
  } catch {
  }
  try {
    const line = readFileSync(paths.displayPath, "utf-8").trim();
    if (line) return line;
  } catch {
  }
  try {
    const line = readFileSync(paths.legacyLinePath, "utf-8").trim();
    if (line) return line;
  } catch {
  }
  return DEFAULT_STATUSLINE;
}
var DEFAULT_VERSION, DEFAULT_STATUSLINE, DEFAULT_TOKEN_BUDGET, DEFAULT_PREMIUM_REQUESTS_TOTAL;
var init_statusline = __esm({
  "src/hud/statusline.mts"() {
    "use strict";
    init_renderer();
    DEFAULT_VERSION = "0.0.0";
    DEFAULT_STATUSLINE = "OMP | hud: no active session";
    DEFAULT_TOKEN_BUDGET = 2e5;
    DEFAULT_PREMIUM_REQUESTS_TOTAL = 1500;
    if (process.argv[1] === fileURLToPath(import.meta.url) && (process.argv[1].endsWith("omp-statusline.mjs") || process.argv[1].endsWith("statusline.mts"))) {
      console.log(readStatusline());
    }
  }
});

// src/hud/watch.mts
var watch_exports = {};
__export(watch_exports, {
  runHudWatch: () => runHudWatch
});
import { readFileSync as readFileSync2 } from "fs";
import { homedir as homedir3 } from "os";
import { join as join3 } from "path";
function readSnapshot() {
  try {
    const raw = readFileSync2(STATE_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    return parsed;
  } catch {
    return null;
  }
}
function tick(paths = getStatuslinePaths()) {
  const snapshot = readSnapshot();
  if (!snapshot) return;
  const now = Date.now();
  const state = buildHudState(snapshot, now);
  writeHudArtifacts(snapshot, paths);
  process.stdout.write("\x1B[2J\x1B[H" + renderAnsi(state) + "\x1B[K\n\x1B[J");
}
function runHudWatch() {
  const intervalMs = Math.max(
    500,
    parseInt(process.env["OMP_HUD_POLL_MS"] ?? "", 10) || parseInt(process.env["OMP_HUD_INTERVAL"] ?? "", 10) || DEFAULT_INTERVAL_MS
  );
  const paths = getStatuslinePaths();
  process.stdout.write("\x1B[?25l");
  try {
    tick(paths);
  } catch {
  }
  const timer = setInterval(() => {
    try {
      tick(paths);
    } catch {
    }
  }, intervalMs);
  const stop = () => {
    clearInterval(timer);
    process.stdout.write("\x1B[?25h\x1B[2J\x1B[H");
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}
var DEFAULT_INTERVAL_MS, STATE_PATH;
var init_watch = __esm({
  "src/hud/watch.mts"() {
    "use strict";
    init_statusline();
    init_renderer();
    DEFAULT_INTERVAL_MS = 1e3;
    STATE_PATH = join3(homedir3(), ".omp", "state", "session.json");
  }
});

// src/cli/install.mts
var install_exports = {};
__export(install_exports, {
  runInstall: () => runInstall
});
import { mkdir as mkdir2, readFile as readFile2, rename, writeFile as writeFile2 } from "fs/promises";
import { homedir as homedir4 } from "os";
import { dirname as dirname3, join as join4 } from "path";
import { fileURLToPath as fileURLToPath2 } from "url";
async function runInstall(settingsPath = join4(homedir4(), ".copilot", "settings.json")) {
  const pkgRoot = join4(dirname3(fileURLToPath2(import.meta.url)), "..");
  const statusLineCommand = join4(pkgRoot, "bin", "omp-statusline.sh");
  const marketplacePath = pkgRoot;
  let existing = {};
  try {
    const raw = await readFile2(settingsPath, "utf-8");
    const parsed = JSON.parse(raw);
    if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
      existing = parsed;
    }
  } catch {
  }
  const existingPlugins = typeof existing.enabledPlugins === "object" && existing.enabledPlugins !== null && !Array.isArray(existing.enabledPlugins) ? existing.enabledPlugins : {};
  const existingMarketplaces = typeof existing.extraKnownMarketplaces === "object" && existing.extraKnownMarketplaces !== null && !Array.isArray(existing.extraKnownMarketplaces) ? existing.extraKnownMarketplaces : {};
  const merged = {
    ...existing,
    enabledPlugins: {
      ...existingPlugins,
      "oh-my-githubcopilot@oh-my-githubcopilot": true
    },
    experimental: true,
    statusLine: { type: "command", command: statusLineCommand },
    extraKnownMarketplaces: {
      ...existingMarketplaces,
      "oh-my-githubcopilot": {
        source: { source: "directory", path: marketplacePath }
      }
    }
  };
  const tmp = `${settingsPath}.tmp`;
  await mkdir2(dirname3(settingsPath), { recursive: true });
  await writeFile2(tmp, JSON.stringify(merged, null, 2) + "\n", "utf-8");
  await rename(tmp, settingsPath);
  console.log(`omp install: wrote ${settingsPath}`);
  console.log(`  statusLine.command: ${statusLineCommand}`);
  console.log(`  marketplace path:   ${marketplacePath}`);
  console.log(`  plugin:             oh-my-githubcopilot@oh-my-githubcopilot`);
  console.log(`
Restart Copilot CLI to activate OMP.`);
}
var init_install = __esm({
  "src/cli/install.mts"() {
    "use strict";
  }
});

// src/cli/doctor.mts
var doctor_exports = {};
__export(doctor_exports, {
  AGENT_MIGRATIONS: () => AGENT_MIGRATIONS,
  runDoctor: () => runDoctor,
  scanProjectForStaleAgents: () => scanProjectForStaleAgents,
  scanTextForStaleAgents: () => scanTextForStaleAgents
});
import { existsSync, readFileSync as readFileSync3, readdirSync, statSync } from "fs";
import { join as join5, relative } from "path";
function scanTextForStaleAgents(text, file) {
  const warnings = [];
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const match of line.matchAll(STALE_AGENT_PATTERN)) {
      const staleId = match[1];
      warnings.push({
        file,
        line: i + 1,
        staleId: `@${staleId}`,
        replacement: AGENT_MIGRATIONS[staleId],
        text: line.trim()
      });
    }
  }
  return warnings;
}
function collectDirFiles(dir, depth) {
  if (depth > MAX_SCAN_DEPTH) return [];
  const files = [];
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return [];
  }
  for (const entry of entries) {
    const fullPath = join5(dir, entry);
    try {
      const stats = statSync(fullPath);
      if (stats.isDirectory()) {
        files.push(...collectDirFiles(fullPath, depth + 1));
      } else if (SCANNABLE_EXTENSIONS.some((ext) => entry.endsWith(ext))) {
        files.push(fullPath);
      }
    } catch {
    }
  }
  return files;
}
function scanProjectForStaleAgents(cwd) {
  const targets = [];
  for (const file of SCAN_FILES) {
    const fullPath = join5(cwd, file);
    if (existsSync(fullPath)) targets.push(fullPath);
  }
  for (const dir of SCAN_DIRS) {
    const fullPath = join5(cwd, dir);
    if (existsSync(fullPath)) targets.push(...collectDirFiles(fullPath, 0));
  }
  const warnings = [];
  for (const target of targets) {
    try {
      const text = readFileSync3(target, "utf-8");
      warnings.push(...scanTextForStaleAgents(text, relative(cwd, target)));
    } catch {
    }
  }
  return warnings;
}
function runDoctor(cwd = process.cwd()) {
  console.log("OMP Doctor \u2014 agent migration check (2.0)");
  console.log("");
  const warnings = scanProjectForStaleAgents(cwd);
  if (warnings.length === 0) {
    console.log("OK: no stale agent references found.");
    return 0;
  }
  console.log(`WARN: found ${warnings.length} stale agent reference(s):`);
  console.log("");
  for (const warning of warnings) {
    console.log(`  ${warning.file}:${warning.line} \u2014 ${warning.staleId} \u2192 ${warning.replacement}`);
    console.log(`    ${warning.text}`);
  }
  console.log("");
  console.log("Suggested replacements (OMP 2.0 agent parity):");
  for (const [staleId, replacement] of Object.entries(AGENT_MIGRATIONS)) {
    console.log(`  @${staleId} \u2192 ${replacement}`);
  }
  return warnings.length;
}
var AGENT_MIGRATIONS, STALE_AGENT_PATTERN, SCAN_FILES, SCAN_DIRS, SCANNABLE_EXTENSIONS, MAX_SCAN_DEPTH;
var init_doctor = __esm({
  "src/cli/doctor.mts"() {
    "use strict";
    AGENT_MIGRATIONS = {
      explorer: "explore",
      simplifier: "code-simplifier",
      researcher: "document-specialist",
      reviewer: "code-reviewer",
      tester: "test-engineer",
      orchestrator: "top-level orchestration role (no longer a delegatable agent)"
    };
    STALE_AGENT_PATTERN = /(?<![\w-])@(explorer|simplifier|researcher|reviewer|tester|orchestrator)(?![\w-])/g;
    SCAN_FILES = [
      ".github/copilot-instructions.md",
      ".copilot/copilot-instructions.md",
      "AGENTS.md"
    ];
    SCAN_DIRS = [".omg"];
    SCANNABLE_EXTENSIONS = [".md", ".json", ".yml", ".yaml", ".txt"];
    MAX_SCAN_DEPTH = 3;
  }
});

// src/hooks/runner.mts
var runner_exports = {};
__export(runner_exports, {
  readStdin: () => readStdin,
  runHookMain: () => runHookMain
});
import { appendFileSync, mkdirSync as mkdirSync2 } from "fs";
import { homedir as homedir5 } from "os";
import { join as join6 } from "path";
async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(String(chunk));
  }
  return chunks.join("");
}
function logHookFailure(hook, reason) {
  try {
    process.stderr.write(`[omp hook fail-open] ${hook}: ${reason}
`);
  } catch {
  }
  try {
    const logsDir = join6(homedir5(), ".omp", "logs");
    mkdirSync2(logsDir, { recursive: true });
    const record = JSON.stringify({ ts: (/* @__PURE__ */ new Date()).toISOString(), hook, reason });
    appendFileSync(join6(logsDir, "hook-failures.jsonl"), record + "\n", "utf-8");
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
var init_runner = __esm({
  "src/hooks/runner.mts"() {
    "use strict";
  }
});

// src/hooks/keyword-detector.mts
var keyword_detector_exports = {};
__export(keyword_detector_exports, {
  processHook: () => processHook
});
function detectKeyword(prompt) {
  const trimmed = prompt.trimStart();
  for (const [keyword, skillId] of KEYWORD_ENTRIES) {
    if (trimmed.startsWith(keyword)) {
      return {
        keyword,
        skillId,
        position: 0
      };
    }
  }
  const slashPattern = /^\/((?:omp:)?[a-zA-Z][a-zA-Z0-9-]*)\b/;
  const slashMatch = trimmed.match(slashPattern);
  if (slashMatch) {
    const cmd = slashMatch[1].toLowerCase();
    const skillId = KEYWORD_MAP[`/${cmd}`] ?? KEYWORD_MAP[`${cmd}:`];
    if (skillId) {
      return {
        keyword: slashMatch[0],
        skillId,
        position: 0
      };
    }
  }
  const longNamespacePattern = /^\/?oh-my-githubcopilot:([a-zA-Z][a-zA-Z0-9-]*)\b/i;
  const longNamespaceMatch = trimmed.match(longNamespacePattern);
  if (longNamespaceMatch) {
    const cmd = longNamespaceMatch[1].toLowerCase();
    const skillId = KEYWORD_MAP[`/omp:${cmd}`] ?? KEYWORD_MAP[`/${cmd}`] ?? KEYWORD_MAP[`${cmd}:`];
    if (skillId) {
      return {
        keyword: longNamespaceMatch[0],
        skillId,
        position: 0
      };
    }
  }
  return null;
}
function getCanonicalCommand(skillId) {
  return CANONICAL_COMMAND_MAP[skillId] ?? `/omp:${skillId}`;
}
function processHook(input) {
  const start = Date.now();
  const log = [];
  try {
    if (input.hook_type !== "UserPromptSubmitted") {
      return {
        status: "skip",
        latencyMs: Date.now() - start,
        mutations: [],
        log: ["Not a UserPromptSubmitted hook"]
      };
    }
    const match = detectKeyword(input.prompt);
    if (!match) {
      return {
        status: "ok",
        latencyMs: Date.now() - start,
        mutations: [],
        log: []
      };
    }
    const taskPart = input.prompt.slice(match.position + match.keyword.length).trim();
    const rewritten = `${getCanonicalCommand(match.skillId)}${taskPart ? ` ${taskPart}` : ""}`;
    log.push(`Keyword detected: "${match.keyword}" \u2192 skill: ${match.skillId}`);
    log.push(`Rewritten: "${rewritten}"`);
    return {
      status: "ok",
      latencyMs: Date.now() - start,
      modifiedPrompt: rewritten,
      mutations: [
        { type: "set_mode", mode: match.skillId },
        { type: "log", level: "info", message: `Skill activated: ${match.skillId}` }
      ],
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
var KEYWORD_MAP, KEYWORD_ENTRIES, CANONICAL_COMMAND_MAP;
var init_keyword_detector = __esm({
  async "src/hooks/keyword-detector.mts"() {
    "use strict";
    init_runner();
    KEYWORD_MAP = {
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
      "--consensus": "omp-plan",
      "/omp:omp-doctor": "omp-doctor",
      "/omp:ralplan": "ralplan",
      "/omp:research": "research",
      "doctor:": "doctor",
      "/doctor": "doctor",
      "/omp:doctor": "doctor",
      "interview:": "interview",
      "/interview": "interview",
      "/omp:interview": "interview",
      "notifications:": "notifications",
      "/notifications": "notifications",
      "/omp:notifications": "notifications",
      "session:": "session",
      "/session": "session",
      "/omp:session": "session"
    };
    KEYWORD_ENTRIES = Object.entries(KEYWORD_MAP).sort(([a], [b]) => b.length - a.length);
    CANONICAL_COMMAND_MAP = {
      "omp-plan": "/omp:plan",
      "omp-setup": "/setup",
      "mcp-setup": "/mcp"
    };
    if (process.argv[1]?.endsWith("keyword-detector.mjs") || process.argv[1]?.endsWith("keyword-detector.mts")) {
      await runHookMain(processHook, { failOpenDecision: true, hookName: "keyword-detector" });
    }
  }
});

// src/index.mts
import { parseArgs } from "util";
import { createRequire } from "module";

// src/cli/update.mts
import { spawnSync } from "child_process";
import { mkdir, readFile, writeFile } from "fs/promises";
import { homedir } from "os";
import { dirname, join } from "path";
import { createInterface } from "node:readline/promises";
var CHECK_INTERVAL_MS = 12 * 60 * 60 * 1e3;
var PROMPTABLE_SUBCOMMANDS = /* @__PURE__ */ new Set(["hud", "psm", "bench"]);
var DISABLED_AUTO_UPDATE_VALUES = /* @__PURE__ */ new Set(["0", "false", "no", "off"]);
var ENABLED_DISABLE_FLAG_VALUES = /* @__PURE__ */ new Set(["1", "true", "yes", "on"]);
function parseSemver(version) {
  const match = version.trim().match(/^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/);
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] ?? null
  };
}
function isNewerVersion(current, latest) {
  const currentVersion = parseSemver(current);
  const latestVersion = parseSemver(latest);
  if (!currentVersion || !latestVersion) return false;
  if (latestVersion.major !== currentVersion.major) return latestVersion.major > currentVersion.major;
  if (latestVersion.minor !== currentVersion.minor) return latestVersion.minor > currentVersion.minor;
  if (latestVersion.patch !== currentVersion.patch) return latestVersion.patch > currentVersion.patch;
  if (currentVersion.prerelease && !latestVersion.prerelease) return true;
  return false;
}
function shouldCheckForUpdates(nowMs, state, intervalMs = CHECK_INTERVAL_MS) {
  if (!state?.last_checked_at) return true;
  const lastCheckedAt = Date.parse(state.last_checked_at);
  if (!Number.isFinite(lastCheckedAt)) return true;
  return nowMs - lastCheckedAt >= intervalMs;
}
function isAutoUpdateDisabled(env = process.env) {
  const autoUpdate = env["OMP_AUTO_UPDATE"]?.trim().toLowerCase();
  if (autoUpdate && DISABLED_AUTO_UPDATE_VALUES.has(autoUpdate)) return true;
  const disableCheck = env["OMP_DISABLE_UPDATE_CHECK"]?.trim().toLowerCase();
  if (disableCheck && ENABLED_DISABLE_FLAG_VALUES.has(disableCheck)) return true;
  return false;
}
function shouldSkipUpdatePrompt(subcommand2, flags2 = {}) {
  if (flags2.help || flags2.version) return true;
  return !PROMPTABLE_SUBCOMMANDS.has(subcommand2);
}
function updateStatePath(homeDir) {
  return join(homeDir, ".omp", "state", "update-check.json");
}
async function readCachedUpdateState(statePath) {
  try {
    const raw = await readFile(statePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
async function writeCachedUpdateState(statePath, state) {
  await mkdir(dirname(statePath), { recursive: true });
  await writeFile(statePath, JSON.stringify(state, null, 2), "utf-8");
}
async function fetchLatestVersionFromNpm(packageName, timeoutMs = 3500) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const url = `https://registry.npmjs.org/${encodeURIComponent(packageName)}/latest`;
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) return null;
    const payload = await response.json();
    return typeof payload.version === "string" ? payload.version : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
function runNpmGlobalUpdate(packageName, cwd) {
  const result = spawnSync("npm", ["install", "-g", `${packageName}@latest`], {
    encoding: "utf-8",
    stdio: ["ignore", "ignore", "pipe"],
    timeout: 12e4,
    windowsHide: true,
    cwd
  });
  if (result.error) return { ok: false, stderr: result.error.message };
  if (result.status !== 0) {
    return { ok: false, stderr: (result.stderr || "").trim() || `npm exited ${result.status}` };
  }
  return { ok: true, stderr: "" };
}
async function askYesNo(question) {
  if (!process.stdin.isTTY || !process.stdout.isTTY) return false;
  const readline = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = (await readline.question(question)).trim().toLowerCase();
    return answer === "" || answer === "y" || answer === "yes";
  } finally {
    readline.close();
  }
}
var defaultDependencies = {
  nowMs: () => Date.now(),
  readUpdateState: readCachedUpdateState,
  writeUpdateState: writeCachedUpdateState,
  fetchLatestVersion: fetchLatestVersionFromNpm,
  askYesNo,
  runGlobalUpdate: runNpmGlobalUpdate
};
async function maybeCheckAndPromptUpdate(context, dependencies = {}) {
  const updateDependencies = {
    ...defaultDependencies,
    ...dependencies
  };
  try {
    if (isAutoUpdateDisabled()) return;
    if (!process.stdin.isTTY || !process.stdout.isTTY) return;
    if (shouldSkipUpdatePrompt(context.subcommand, context.flags)) return;
    const statePath = updateStatePath(process.env["HOME"] || homedir());
    const now = updateDependencies.nowMs();
    const state = await updateDependencies.readUpdateState(statePath);
    if (!shouldCheckForUpdates(now, state)) return;
    const latestVersion = await updateDependencies.fetchLatestVersion(context.packageName);
    await updateDependencies.writeUpdateState(statePath, {
      last_checked_at: new Date(now).toISOString(),
      last_seen_latest: latestVersion || state?.last_seen_latest
    });
    if (!latestVersion || !isNewerVersion(context.currentVersion, latestVersion)) return;
    const approved = await updateDependencies.askYesNo(
      `[omp] Update available: v${context.currentVersion} \u2192 v${latestVersion}. Update now? [Y/n] `
    );
    if (!approved) return;
    console.log(`[omp] Running: npm install -g ${context.packageName}@latest`);
    const result = updateDependencies.runGlobalUpdate(context.packageName, context.cwd);
    if (result.ok) {
      console.log(`[omp] Updated to v${latestVersion}. Restart this shell to load the new CLI.`);
    } else {
      console.log(`[omp] Update failed. Run manually: npm install -g ${context.packageName}@latest`);
    }
  } catch {
  }
}

// src/index.mts
var _require = createRequire(import.meta.url);
var { version: PKG_VERSION, name: PKG_NAME } = _require("../package.json");
var { positionals, values: flags } = parseArgs({
  args: process.argv.slice(2),
  options: {
    help: { type: "boolean", default: false },
    version: { type: "boolean", default: false },
    watch: { type: "boolean", default: false }
  },
  allowPositionals: true
});
var subcommand = positionals[0] || "hud";
var resolvedSubcommand = flags.version && !positionals[0] ? "version" : subcommand;
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
      version: flags.version
    }
  });
  switch (resolvedSubcommand) {
    case "hud":
      if (flags.watch) {
        const { runHudWatch: runHudWatch2 } = await Promise.resolve().then(() => (init_watch(), watch_exports));
        runHudWatch2();
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
      const { runInstall: runInstall2 } = await Promise.resolve().then(() => (init_install(), install_exports));
      await runInstall2();
      break;
    }
    case "doctor": {
      const { runDoctor: runDoctor2 } = await Promise.resolve().then(() => (init_doctor(), doctor_exports));
      runDoctor2(process.cwd());
      break;
    }
    default:
      console.error(`Unknown subcommand: ${resolvedSubcommand}`);
      printUsage(true);
      process.exit(1);
  }
}
function printUsage(stderr = false) {
  const output = stderr ? console.error : console.log;
  output("Usage: omp [hud|install|doctor|version|psm|bench|hook] [--watch]");
}
async function printHud() {
  try {
    const { readFileSync: readFileSync4 } = await import("fs");
    const { join: join7 } = await import("path");
    const { homedir: homedir6 } = await import("os");
    const hudPath = join7(homedir6(), ".omp", "hud.line");
    const line = readFileSync4(hudPath, "utf-8").trim();
    console.log(line);
  } catch {
    console.log(`OMP v${PKG_VERSION} | hud: no active session`);
  }
}
async function runPsm(_args) {
  console.log("PSM commands:");
  console.log("  /omp:psm create <name>   Create isolated worktree session");
  console.log("  /omp:psm list           List active sessions");
  console.log("  /omp:psm switch <name>  Switch to session");
  console.log("  /omp:psm destroy <name> Destroy session");
}
async function runHook(args) {
  const hookId = args[0];
  if (hookId !== "keyword-detector") {
    console.error("Usage: omp hook keyword-detector");
    process.exit(1);
  }
  const { processHook: processHook2 } = await init_keyword_detector().then(() => keyword_detector_exports);
  const { runHookMain: runHookMain2 } = await Promise.resolve().then(() => (init_runner(), runner_exports));
  await runHookMain2(processHook2, { failOpenDecision: true, hookName: "keyword-detector" });
}
async function runBench(_args) {
  console.log("SWE-bench requires Node.js subprocess with Python evaluation harness.");
  console.log("Usage: /omp:swe-bench --suite lite --compare baseline");
}
main().catch((err) => {
  console.error(err);
  process.exit(1);
});
//# sourceMappingURL=omp.mjs.map
