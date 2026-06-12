/**
 * Shared hook entry-point runner.
 *
 * Hooks must be FAIL-OPEN: any failure (empty stdin, malformed JSON,
 * unexpected processing error) must still emit a valid HookOutput-shaped
 * JSON object on stdout and exit 0. A non-zero exit or non-JSON stdout
 * causes the Copilot CLI to treat the hook as errored, which denies the
 * tool call for PreToolUse hooks.
 *
 * Fail-open events are persisted (best-effort) as JSONL records to
 * ~/.omp/logs/hook-failures.jsonl and mirrored on stderr so failures
 * remain observable without ever touching the stdout JSON contract.
 */

import { appendFileSync, mkdirSync } from "fs";
import { homedir } from "os";
import { join } from "path";

export interface FailOpenOutput {
  decision?: "allow";
  status: "error";
  latencyMs: number;
  mutations: never[];
  log: string[];
}

export interface RunHookOptions {
  /**
   * When true (hooks whose HookOutput supports a decision field), the
   * fail-open output includes `"decision": "allow"` so the tool call is
   * explicitly allowed.
   */
  failOpenDecision?: boolean;
  /** Hook id recorded in fail-open log entries (stderr + JSONL). */
  hookName?: string;
}

export async function readStdin(): Promise<string> {
  const chunks: string[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(String(chunk));
  }
  return chunks.join("");
}

/**
 * Best-effort persistence of a fail-open event. Wrapped in its own
 * try/catch: logging must NEVER break fail-open or the one-JSON-object
 * stdout contract. Writes to stderr and the JSONL log only — never stdout.
 */
function logHookFailure(hook: string, reason: string): void {
  try {
    process.stderr.write(`[omp hook fail-open] ${hook}: ${reason}\n`);
  } catch {
    // stderr unavailable — ignore
  }
  try {
    const logsDir = join(homedir(), ".omp", "logs");
    mkdirSync(logsDir, { recursive: true });
    const record = JSON.stringify({ ts: new Date().toISOString(), hook, reason });
    appendFileSync(join(logsDir, "hook-failures.jsonl"), record + "\n", "utf-8");
  } catch {
    // best-effort only — never let logging break fail-open
  }
}

/**
 * Reads HookInput JSON from stdin, runs the hook, and prints the
 * HookOutput JSON to stdout. Never throws, never exits non-zero,
 * never emits non-JSON to stdout.
 */
export async function runHookMain<TInput>(
  processHook: (input: TInput) => unknown,
  options: RunHookOptions = {}
): Promise<void> {
  let outputJson: string;
  try {
    const input = JSON.parse(await readStdin()) as TInput;
    const serialized = JSON.stringify(processHook(input));
    if (typeof serialized !== "string") {
      throw new Error("hook produced no serializable output");
    }
    outputJson = serialized;
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    logHookFailure(options.hookName ?? "unknown", reason);
    const failOpen: FailOpenOutput = {
      ...(options.failOpenDecision ? { decision: "allow" as const } : {}),
      status: "error",
      latencyMs: 0,
      mutations: [],
      log: [`fail-open: ${reason}`],
    };
    outputJson = JSON.stringify(failOpen);
  }
  console.log(outputJson);
  process.exitCode = 0;
}
