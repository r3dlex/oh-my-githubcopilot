/**
 * Shared hook entry-point runner.
 *
 * Hooks must be FAIL-OPEN: any failure (empty stdin, malformed JSON,
 * unexpected processing error) must still emit a valid HookOutput-shaped
 * JSON object on stdout and exit 0. A non-zero exit or non-JSON stdout
 * causes the Copilot CLI to treat the hook as errored, which denies the
 * tool call for PreToolUse hooks.
 */

export interface FailOpenOutput {
  decision?: "allow";
  status: "error";
  latencyMs: number;
  mutations: never[];
  log: string[];
}

export async function readStdin(): Promise<string> {
  const chunks: string[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(String(chunk));
  }
  return chunks.join("");
}

/**
 * Reads HookInput JSON from stdin, runs the hook, and prints the
 * HookOutput JSON to stdout. Never throws, never exits non-zero,
 * never emits non-JSON to stdout.
 *
 * @param processHook the hook's pure processing function
 * @param options.failOpenDecision when true (hooks whose HookOutput
 *        supports a decision field), the fail-open output includes
 *        `"decision": "allow"` so the tool call is explicitly allowed.
 */
export async function runHookMain<TInput>(
  processHook: (input: TInput) => unknown,
  options: { failOpenDecision?: boolean } = {}
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
