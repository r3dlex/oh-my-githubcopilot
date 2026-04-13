// src/skills/omp-setup.mts
async function activate(input) {
  const { spawn } = await import("child_process");
  const baseArgs = ["bin/omp.mjs", "setup", ...input.args];
  return new Promise((resolve) => {
    const child = spawn("node", baseArgs, { stdio: "inherit" });
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
