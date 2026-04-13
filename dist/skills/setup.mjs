// src/skills/omp-setup.mts
import { fileURLToPath } from "url";
import { dirname, join } from "path";
var REQUIRED_COPILOT_EXPERIMENTAL_FEATURES = [
  "STATUS_LINE",
  "SHOW_FILE",
  "EXTENSIONS",
  "BACKGROUND_SESSIONS",
  "CONFIGURE_COPILOT_AGENT",
  "MULTI_TURN_AGENTS",
  "SESSION_STORE"
];
function getPackageRoot() {
  return join(dirname(fileURLToPath(import.meta.url)), "..", "..");
}
async function activate(input) {
  const { spawn } = await import("child_process");
  const packageRoot = getPackageRoot();
  const baseArgs = ["bin/omp.mjs", "setup", ...input.args];
  return new Promise((resolve) => {
    const child = spawn("node", baseArgs, {
      cwd: packageRoot,
      stdio: "inherit",
      env: {
        ...process.env,
        OMP_COPILOT_REQUIRED_EXPERIMENTAL_FEATURES: process.env["OMP_COPILOT_REQUIRED_EXPERIMENTAL_FEATURES"] ?? REQUIRED_COPILOT_EXPERIMENTAL_FEATURES.join(","),
        OMP_COPILOT_STATUS_LINE_COMMAND: process.env["OMP_COPILOT_STATUS_LINE_COMMAND"] ?? join(packageRoot, "bin", "omp-statusline.sh")
      }
    });
    child.on("close", (code) => {
      resolve({ status: code === 0 ? "ok" : "error", message: `Setup exited with code ${code}` });
    });
    child.on("error", (err) => resolve({ status: "error", message: `Failed to spawn: ${err.message}` }));
  });
}
function deactivate() {
}

// src/skills/setup.mts
async function activate2(input) {
  return activate(input);
}
function deactivate2() {
  deactivate();
}
export {
  activate2 as activate,
  deactivate2 as deactivate
};
//# sourceMappingURL=setup.mjs.map
