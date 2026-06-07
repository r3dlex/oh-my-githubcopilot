import { mkdir, readFile, rename, writeFile } from "fs/promises";
import { homedir } from "os";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

export async function runInstall(
  settingsPath = join(homedir(), ".copilot", "settings.json"),
): Promise<void> {
  // dirname(import.meta.url) = <pkg>/bin, ".." = <pkg>
  const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
  const statusLineCommand = join(pkgRoot, "bin", "omp-statusline.sh");
  const marketplacePath = pkgRoot;

  let existing: Record<string, unknown> = {};
  try {
    const raw = await readFile(settingsPath, "utf-8");
    const parsed: unknown = JSON.parse(raw);
    if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
      existing = parsed as Record<string, unknown>;
    }
  } catch { /* missing or invalid — start fresh */ }

  const existingPlugins =
    typeof existing.enabledPlugins === "object" &&
    existing.enabledPlugins !== null &&
    !Array.isArray(existing.enabledPlugins)
      ? (existing.enabledPlugins as Record<string, unknown>)
      : {};

  const existingMarketplaces =
    typeof existing.extraKnownMarketplaces === "object" &&
    existing.extraKnownMarketplaces !== null &&
    !Array.isArray(existing.extraKnownMarketplaces)
      ? (existing.extraKnownMarketplaces as Record<string, unknown>)
      : {};

  const merged = {
    ...existing,
    enabledPlugins: {
      ...existingPlugins,
      "oh-my-githubcopilot@oh-my-githubcopilot": true,
    },
    experimental: true,
    statusLine: { type: "command", command: statusLineCommand },
    extraKnownMarketplaces: {
      ...existingMarketplaces,
      "oh-my-githubcopilot": {
        source: { source: "directory", path: marketplacePath },
      },
    },
  };

  // Atomic write: tmp → rename (prevents partial write on crash/disk-full)
  const tmp = `${settingsPath}.tmp`;
  await mkdir(dirname(settingsPath), { recursive: true });
  await writeFile(tmp, JSON.stringify(merged, null, 2) + "\n", "utf-8");
  await rename(tmp, settingsPath);

  console.log(`omp install: wrote ${settingsPath}`);
  console.log(`  statusLine.command: ${statusLineCommand}`);
  console.log(`  marketplace path:   ${marketplacePath}`);
  console.log(`  plugin:             oh-my-githubcopilot@oh-my-githubcopilot`);
  console.log(`\nRestart Copilot CLI to activate OMP.`);
}
